import { ethers } from 'ethers';
import { auditRepository } from '../repositories/audit.repository';
import { blockchainService } from './blockchain.service';
import { AuditLog } from '../types';

export class AuditService {
  /**
   * Recursively canonicalizes an object with deterministic sorted keys.
   */
  private canonicalizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.canonicalizeObject(item));
    }
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = this.canonicalizeObject(obj[key]);
    }
    return sorted;
  }

  /**
   * Deterministic canonical serialization of an audit log.
   */
  canonicalizeLog(log: AuditLog): string {
    const rawDetails =
      typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});

    const canonicalObj = {
      actor_id: log.actor_id || null,
      actor_role: log.actor_role || null,
      created_at: new Date(log.created_at).toISOString(),
      details: this.canonicalizeObject(rawDetails),
      event_type: log.event_type,
      id: log.id,
      ip_address: log.ip_address || null,
      resource_id: log.resource_id || null,
      resource_type: log.resource_type,
      severity: log.severity,
    };

    return JSON.stringify(this.canonicalizeObject(canonicalObj));
  }

  /**
   * Computes the cryptographic root hash across a list of audit logs.
   */
  computeBatchRootHash(logs: AuditLog[]): string {
    if (logs.length === 0) {
      return ethers.ZeroHash;
    }

    // Hash each individual log canonically
    const logHashes = logs.map((log) => {
      const canonicalStr = this.canonicalizeLog(log);
      return ethers.keccak256(ethers.toUtf8Bytes(canonicalStr));
    });

    // Combine hashes into a single root digest
    const combined = logHashes.join('');
    return ethers.keccak256(ethers.toUtf8Bytes(combined));
  }

  /**
   * Anchors all unanchored audit logs into an on-chain batch.
   */
  async anchorPendingLogs(): Promise<{
    batchId: string;
    rootHash: string;
    logCount: number;
    txHash: string;
    status: string;
  }> {
    const unanchored = await auditRepository.getUnanchoredLogs(100);

    if (unanchored.length === 0) {
      throw new Error('No pending audit logs to anchor.');
    }

    // 1. Generate unique batchId as bytes32
    const batchId = ethers.keccak256(
      ethers.toUtf8Bytes(`BATCH_${Date.now()}_${Math.random()}`)
    );

    // 2. Compute canonical root hash
    const rootHash = this.computeBatchRootHash(unanchored);
    const logCount = unanchored.length;

    // 3. Anchor on blockchain
    const { txHash, status } = await blockchainService.anchorBatchOnChain(
      batchId,
      rootHash,
      logCount
    );

    // 4. Save batch to database and link logs
    await auditRepository.createBatch({
      batch_id: batchId,
      root_hash: rootHash,
      log_count: logCount,
    });

    const logIds = unanchored.map((l) => l.id);
    await auditRepository.linkLogsToBatch(logIds, batchId);

    return {
      batchId,
      rootHash,
      logCount,
      txHash,
      status,
    };
  }

  /**
   * Re-hashes stored logs and verifies against the on-chain cryptographic anchor.
   */
  async verifyBatchIntegrity(batchId: string): Promise<{
    isTamperFree: boolean;
    batchId: string;
    logCount: number;
    storedRootHash: string;
    recomputedRootHash: string;
    onChainAnchor: any | null;
    disclaimer: string;
  }> {
    const batchRecord = await auditRepository.getBatchById(batchId);
    if (!batchRecord) {
      throw new Error(`Audit batch '${batchId}' not found in database.`);
    }

    const logs = await auditRepository.getLogsByBatchId(batchId);
    const recomputedRootHash = this.computeBatchRootHash(logs);

    // Check with smart contract
    const onChainAnchor = await blockchainService.getAnchoredBatch(batchId);

    const matchesStored = batchRecord.root_hash === recomputedRootHash;
    const matchesOnChain = onChainAnchor
      ? onChainAnchor.rootHash === recomputedRootHash
      : true; // if offline, rely on stored hash

    const isTamperFree = matchesStored && matchesOnChain;

    return {
      isTamperFree,
      batchId,
      logCount: logs.length,
      storedRootHash: batchRecord.root_hash,
      recomputedRootHash,
      onChainAnchor,
      disclaimer:
        'Cryptographic hash verification proves off-chain log sequence integrity and detects post-hoc database alterations. It does not replace independent physical investigation or verify off-chain real-world events.',
    };
  }
}

export const auditService = new AuditService();
