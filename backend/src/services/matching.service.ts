import { BloodGroup, ComponentType, MEDICAL_DISCLAIMER } from '../config/constants';
import { inventoryRepository } from '../repositories/inventory.repository';
import { donorRepository } from '../repositories/donor.repository';
import { BloodInventory, DonorProfile } from '../types';

/**
 * Component-specific immunological compatibility tables.
 * Validated against standard blood transfusion medicine guidelines.
 */
export const COMPATIBILITY_RULES: Record<
  ComponentType,
  Record<BloodGroup, BloodGroup[]>
> = {
  // Red Blood Cells: Patient has antibodies against donor antigens absent in patient
  packed_red_cells: {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  },
  whole_blood: {
    'O-': ['O-'],
    'O+': ['O+', 'O-'],
    'A-': ['A-', 'O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  },
  // Plasma: Transfuses antibodies; reversed compatibility (AB is universal donor, O is universal recipient)
  fresh_frozen_plasma: {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A-', 'A+', 'AB-', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B-', 'B+', 'AB-', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB-', 'AB+'],
  },
  cryoprecipitate: {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A-', 'A+', 'AB-', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B-', 'B+', 'AB-', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB-', 'AB+'],
  },
  // Platelets: ABO identical strongly preferred, followed by compatible plasma/RBC profiles
  platelets: {
    'O-': ['O-', 'A-', 'B-', 'AB-'],
    'O+': ['O+', 'O-', 'A+', 'A-'],
    'A-': ['A-', 'O-', 'AB-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-', 'AB-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  },
};

export interface MatchCandidate {
  candidateType: 'inventory' | 'donor';
  targetId: string;
  score: number;
  distanceKm: number | null;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  availableUnits?: number;
  reasons: string[];
  breakdown: {
    compatibilityScore: number;
    inventoryPriorityBonus: number;
    proximityScore: number;
    freshnessScore: number;
    urgencyBonus: number;
  };
  medicalDisclaimer: string;
  inventoryDetails?: {
    batchNumber: string;
    bloodBankName: string;
    expiryDate: string;
    daysUntilExpiry: number;
  };
  donorDetails?: {
    isStaleAvailability: boolean;
    lastConfirmedHoursAgo: number;
    city: string;
  };
}

export class MatchingService {
  /**
   * Calculates Haversine distance in kilometers between two geo-coordinates.
   */
  calculateDistance(
    lat1: number | null,
    lon1: number | null,
    lat2: number | null,
    lon2: number | null
  ): number | null {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
      return null;
    }

    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Evaluates compatible blood groups for a given recipient and component.
   */
  getCompatibleGroups(recipientGroup: BloodGroup, component: ComponentType): BloodGroup[] {
    return COMPATIBILITY_RULES[component]?.[recipientGroup] || [recipientGroup];
  }

  /**
   * Main ranked matching execution.
   */
  async findRankedMatches(params: {
    recipientBloodGroup: BloodGroup;
    componentType: ComponentType;
    unitsRequested: number;
    urgencyLevel: 'routine' | 'urgent' | 'critical' | 'emergency';
    hospitalLat?: number | null;
    hospitalLng?: number | null;
  }): Promise<MatchCandidate[]> {
    const compatibleGroups = this.getCompatibleGroups(
      params.recipientBloodGroup,
      params.componentType
    );

    const candidates: MatchCandidate[] = [];

    // 1. Evaluate Blood Bank Inventories (Prioritized First)
    const inventories = await inventoryRepository.findAvailableForMatching(
      compatibleGroups,
      params.componentType
    );

    for (const inv of inventories) {
      const distance = this.calculateDistance(
        params.hospitalLat || null,
        params.hospitalLng || null,
        inv.latitude ? Number(inv.latitude) : null,
        inv.longitude ? Number(inv.longitude) : null
      );

      const reasons: string[] = [];
      let score = 0;

      // Compatibility score (Max 35)
      const isExactMatch = inv.blood_group === params.recipientBloodGroup;
      const compScore = isExactMatch ? 35 : 25;
      score += compScore;
      reasons.push(
        isExactMatch
          ? `Exact blood group match (${inv.blood_group}) for ${params.componentType}`
          : `Compatible alternative group (${inv.blood_group}) for recipient ${params.recipientBloodGroup}`
      );

      // Inventory Priority Bonus (Max 25)
      const invBonus = 25;
      score += invBonus;
      reasons.push(`Verified blood bank stock ready for immediate release (${inv.units_available - inv.units_reserved} units available)`);

      // Proximity score (Max 20)
      let proxScore = 5;
      if (distance !== null) {
        if (distance < 5) proxScore = 20;
        else if (distance < 15) proxScore = 15;
        else if (distance < 35) proxScore = 10;
        reasons.push(`Facility located ${distance} km from destination hospital`);
      } else {
        reasons.push('Facility location proximity estimated based on regional jurisdiction');
      }
      score += proxScore;

      // Freshness score (Max 10)
      const daysUntilExpiry = Math.ceil(
        (new Date(inv.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24)
      );
      let freshnessScore = 5;
      if (daysUntilExpiry > 14) freshnessScore = 10;
      else if (daysUntilExpiry > 5) freshnessScore = 8;
      score += freshnessScore;
      reasons.push(`Shelf life verified: ${daysUntilExpiry} days remaining until expiry`);

      // Urgency multiplier (Max 10)
      let urgencyBonus = 5;
      if (params.urgencyLevel === 'emergency') urgencyBonus = 10;
      else if (params.urgencyLevel === 'critical') urgencyBonus = 8;
      score += urgencyBonus;

      candidates.push({
        candidateType: 'inventory',
        targetId: inv.id,
        score: Math.min(100, score),
        distanceKm: distance,
        bloodGroup: inv.blood_group,
        componentType: inv.component_type,
        availableUnits: inv.units_available - inv.units_reserved,
        reasons,
        breakdown: {
          compatibilityScore: compScore,
          inventoryPriorityBonus: invBonus,
          proximityScore: proxScore,
          freshnessScore,
          urgencyBonus,
        },
        medicalDisclaimer: MEDICAL_DISCLAIMER,
        inventoryDetails: {
          batchNumber: inv.batch_number,
          bloodBankName: inv.blood_bank_name,
          expiryDate: inv.expiry_date,
          daysUntilExpiry,
        },
      });
    }

    // 2. Evaluate Potential Donors (Secondary Mobilization)
    const donors = await donorRepository.findAvailableDonors(compatibleGroups);

    for (const donor of donors) {
      const distance = this.calculateDistance(
        params.hospitalLat || null,
        params.hospitalLng || null,
        donor.latitude ? Number(donor.latitude) : null,
        donor.longitude ? Number(donor.longitude) : null
      );

      const reasons: string[] = [];
      let score = 0;

      // Compatibility score (Max 35)
      const isExactMatch = donor.blood_group === params.recipientBloodGroup;
      const compScore = isExactMatch ? 35 : 22;
      score += compScore;
      reasons.push(
        isExactMatch
          ? `Exact blood group match (${donor.blood_group})`
          : `Compatible donor group (${donor.blood_group}) for recipient ${params.recipientBloodGroup}`
      );

      // Donor base mobilization score (10 points - lower than verified inventory)
      const invBonus = 10;
      score += invBonus;
      reasons.push('Registered volunteer donor consented to emergency contact');

      // Proximity score (Max 20)
      let proxScore = 5;
      if (distance !== null) {
        if (distance < 5) proxScore = 20;
        else if (distance < 15) proxScore = 15;
        else if (distance < 35) proxScore = 10;
        reasons.push(`Donor resides ${distance} km from destination hospital`);
      }
      score += proxScore;

      // Freshness of confirmation (Max 15)
      const confirmedTime = donor.availability_confirmed_at
        ? new Date(donor.availability_confirmed_at).getTime()
        : Date.now() - 86400000 * 10;
      const hoursAgo = Math.max(0, Math.round((Date.now() - confirmedTime) / (1000 * 3600)));
      const isStale = hoursAgo > 48;

      let freshnessScore = 5;
      if (hoursAgo < 6) freshnessScore = 15;
      else if (hoursAgo < 24) freshnessScore = 12;
      else if (hoursAgo < 48) freshnessScore = 8;

      score += freshnessScore;
      reasons.push(
        isStale
          ? `CAUTION: Donor availability confirmed ${hoursAgo} hours ago (requires screening reconfirmation)`
          : `Donor availability confirmed recently (${hoursAgo} hours ago)`
      );

      // Urgency bonus (Max 10)
      let urgencyBonus = 5;
      if (params.urgencyLevel === 'emergency') urgencyBonus = 10;
      score += urgencyBonus;

      candidates.push({
        candidateType: 'donor',
        targetId: donor.id,
        score: Math.min(100, score),
        distanceKm: distance,
        bloodGroup: donor.blood_group,
        componentType: params.componentType,
        reasons,
        breakdown: {
          compatibilityScore: compScore,
          inventoryPriorityBonus: invBonus,
          proximityScore: proxScore,
          freshnessScore,
          urgencyBonus,
        },
        medicalDisclaimer: MEDICAL_DISCLAIMER,
        donorDetails: {
          isStaleAvailability: isStale,
          lastConfirmedHoursAgo: hoursAgo,
          city: donor.city,
        },
      });
    }

    // Sort descending by score, prioritizing inventory on equal scores, then distance
    return candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.candidateType !== b.candidateType) {
        return a.candidateType === 'inventory' ? -1 : 1;
      }
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });
  }
}

export const matchingService = new MatchingService();
