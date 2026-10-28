import { ethers } from 'ethers';
import { requestRepository } from '../repositories/request.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { matchingService } from './matching.service';
import { blockchainService } from './blockchain.service';
import { auditRepository } from '../repositories/audit.repository';
import { BloodGroup, ComponentType, UrgencyLevel, URGENCY_LEVEL_NUMERIC } from '../config/constants';
import { BloodRequest, RequestMatch } from '../types';

export class RequestService {
  /**
   * Dedicated Create Emergency Request Workflow.
   */
  async createEmergencyRequest(params: {
    hospitalId: string;
    bloodGroup: BloodGroup;
    componentType: ComponentType;
    unitsRequested: number;
    urgencyLevel: UrgencyLevel;
    destinationCity: string;
    destinationLat?: number | null;
    destinationLng?: number | null;
    notes?: string | null;
    actorId: string;
    ipAddress?: string;
  }): Promise<{ request: BloodRequest; matches: RequestMatch[]; onChainTxHash: string }> {
    // 1. Generate privacy-preserving pseudonymous hashes
    const salt = ethers.hexlify(ethers.randomBytes(16));
    const patientRefHash = ethers.keccak256(
      ethers.toUtf8Bytes(`PATIENT_REF_${Date.now()}_${salt}`)
    );
    const requestHash = ethers.keccak256(
      ethers.toUtf8Bytes(`REQ_${params.hospitalId}_${Date.now()}_${salt}`)
    );
    const componentHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${params.bloodGroup}_${params.componentType}`)
    );

    // 2. Persist emergency request in database
    const request = await requestRepository.create({
      hospital_id: params.hospitalId,
      patient_ref_hash: patientRefHash,
      blood_group: params.bloodGroup,
      component_type: params.componentType,
      units_requested: params.unitsRequested,
      urgency_level: params.urgencyLevel,
      destination_city: params.destinationCity,
      destination_lat: params.destinationLat,
      destination_lng: params.destinationLng,
      on_chain_request_hash: requestHash,
      notes: params.notes,
    });

    // 3. Submit request to smart contract (BloodBridgeRequestManager.sol)
    const urgencyNum = URGENCY_LEVEL_NUMERIC[params.urgencyLevel] || 4;
    const { txHash } = await blockchainService.recordRequestOnChain(
      requestHash,
      urgencyNum,
      params.unitsRequested,
      componentHash
    );

    // 4. Automatically trigger Explainable Ranked Matching Engine
    const candidateMatches = await matchingService.findRankedMatches({
      recipientBloodGroup: params.bloodGroup,
      componentType: params.componentType,
      unitsRequested: params.unitsRequested,
      urgencyLevel: params.urgencyLevel,
      hospitalLat: params.destinationLat,
      hospitalLng: params.destinationLng,
    });

    // 5. Save ranked matches to database
    await requestRepository.saveMatches(
      request.id,
      candidateMatches.map((m) => ({
        match_type: m.candidateType,
        target_id: m.targetId,
        match_score: m.score,
        distance_km: m.distanceKm,
        explanation_json: {
          reasons: m.reasons,
          breakdown: m.breakdown,
          medicalDisclaimer: m.medicalDisclaimer,
          details: m.inventoryDetails || m.donorDetails,
        },
      }))
    );

    const savedMatches = await requestRepository.getMatches(request.id);

    // 6. Record audit log
    await auditRepository.log({
      actor_id: params.actorId,
      actor_role: 'hospital',
      event_type: 'EMERGENCY_REQUEST_CREATED',
      resource_type: 'blood_request',
      resource_id: request.id,
      details: {
        bloodGroup: params.bloodGroup,
        componentType: params.componentType,
        unitsRequested: params.unitsRequested,
        urgencyLevel: params.urgencyLevel,
        matchesFound: savedMatches.length,
      },
      ip_address: params.ipAddress,
      severity: params.urgencyLevel === 'emergency' ? 'critical' : 'warning',
    });

    return {
      request,
      matches: savedMatches,
      onChainTxHash: txHash,
    };
  }

  /**
   * Allocates verified inventory to a request.
   */
  async allocateInventoryToRequest(params: {
    requestId: string;
    inventoryId: string;
    unitsToAllocate: number;
    bloodBankId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<{ request: BloodRequest; reservationId: string }> {
    const request = await requestRepository.findById(params.requestId);
    if (!request) throw new Error('Blood request not found');

    if (request.status !== 'open' && request.status !== 'matching') {
      throw new Error(`Cannot allocate request in status '${request.status}'`);
    }

    // 1. Reserve inventory with row-locking
    const { reservationId } = await inventoryRepository.reserveStock(
      params.inventoryId,
      params.unitsToAllocate,
      params.requestId,
      params.actorId
    );

    // 2. Update request status to allocated
    const updated = await requestRepository.updateStatus(
      params.requestId,
      'allocated',
      params.actorId,
      'blood_bank',
      `Allocated ${params.unitsToAllocate} units from batch ${params.inventoryId}`
    );

    await auditRepository.log({
      actor_id: params.actorId,
      actor_role: 'blood_bank',
      event_type: 'REQUEST_INVENTORY_ALLOCATED',
      resource_type: 'blood_request',
      resource_id: params.requestId,
      details: { inventoryId: params.inventoryId, units: params.unitsToAllocate },
      ip_address: params.ipAddress,
      severity: 'info',
    });

    return { request: updated, reservationId };
  }

  /**
   * Dispatches allocated inventory.
   */
  async dispatchRequest(params: {
    requestId: string;
    inventoryId: string;
    unitsDispatched: number;
    actorId: string;
    ipAddress?: string;
  }): Promise<BloodRequest> {
    const request = await requestRepository.findById(params.requestId);
    if (!request) throw new Error('Blood request not found');
    if (request.status !== 'allocated') {
      throw new Error(`Cannot dispatch request in status '${request.status}'`);
    }

    // 1. Update inventory quantities
    await inventoryRepository.dispatchReservedStock(
      params.inventoryId,
      params.unitsDispatched
    );

    // 2. Update request status
    const updated = await requestRepository.updateStatus(
      params.requestId,
      'dispatched',
      params.actorId,
      'blood_bank',
      'Blood units dispatched in cold-chain transport'
    );

    await auditRepository.log({
      actor_id: params.actorId,
      actor_role: 'blood_bank',
      event_type: 'REQUEST_DISPATCHED',
      resource_type: 'blood_request',
      resource_id: params.requestId,
      details: { inventoryId: params.inventoryId, units: params.unitsDispatched },
      ip_address: params.ipAddress,
      severity: 'info',
    });

    return updated;
  }

  /**
   * Hospital fulfills and confirms receipt.
   */
  async fulfillRequest(params: {
    requestId: string;
    hospitalId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<BloodRequest> {
    const request = await requestRepository.findById(params.requestId);
    if (!request) throw new Error('Blood request not found');

    if (request.hospital_id !== params.hospitalId) {
      throw new Error('Only the requesting hospital can confirm receipt and fulfill.');
    }

    if (request.status !== 'dispatched') {
      throw new Error(`Cannot fulfill request in status '${request.status}'`);
    }

    const updated = await requestRepository.updateStatus(
      params.requestId,
      'fulfilled',
      params.actorId,
      'hospital',
      'Blood units received, cross-matched, and accepted for clinical administration'
    );

    await auditRepository.log({
      actor_id: params.actorId,
      actor_role: 'hospital',
      event_type: 'REQUEST_FULFILLED',
      resource_type: 'blood_request',
      resource_id: params.requestId,
      ip_address: params.ipAddress,
      severity: 'info',
    });

    return updated;
  }

  /**
   * Hospital cancels an open or allocated request prior to dispatch.
   */
  async cancelRequest(params: {
    requestId: string;
    hospitalId: string;
    reason: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<BloodRequest> {
    const request = await requestRepository.findById(params.requestId);
    if (!request) throw new Error('Blood request not found');

    if (request.hospital_id !== params.hospitalId) {
      throw new Error('Only the requesting hospital can cancel this request.');
    }

    if (request.status === 'dispatched' || request.status === 'fulfilled') {
      throw new Error(`Cannot cancel a request that has already been ${request.status}.`);
    }

    const updated = await requestRepository.updateStatus(
      params.requestId,
      'cancelled',
      params.actorId,
      'hospital',
      params.reason
    );

    await auditRepository.log({
      actor_id: params.actorId,
      actor_role: 'hospital',
      event_type: 'REQUEST_CANCELLED',
      resource_type: 'blood_request',
      resource_id: params.requestId,
      details: { reason: params.reason },
      ip_address: params.ipAddress,
      severity: 'warning',
    });

    return updated;
  }
}

export const requestService = new RequestService();
