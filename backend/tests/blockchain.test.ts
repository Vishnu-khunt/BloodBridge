import { expect } from 'chai';
import { auditService } from '../src/services/audit.service';
import { auditRepository } from '../src/repositories/audit.repository';
import { db } from '../src/db/client';

describe('Blockchain Integration & Audit Log Cryptographic Anchoring', () => {
  it('should canonicalize audit logs deterministically', () => {
    const dummyLog = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      actor_id: 'actor-1',
      actor_role: 'hospital',
      event_type: 'EMERGENCY_REQUEST_CREATED',
      resource_type: 'request',
      resource_id: 'req-1',
      details: { bloodGroup: 'O-', units: 2 },
      ip_address: '127.0.0.1',
      severity: 'info' as const,
      batch_id: null,
      created_at: new Date('2026-10-27T12:00:00Z'),
    };

    const str1 = auditService.canonicalizeLog(dummyLog);
    const str2 = auditService.canonicalizeLog({ ...dummyLog });

    expect(str1).to.equal(str2);
    expect(str1).to.include('"event_type":"EMERGENCY_REQUEST_CREATED"');
  });

  it('should anchor unanchored logs and verify cryptographic integrity', async () => {
    // 1. Insert test audit log
    await auditRepository.log({
      event_type: 'TEST_INTEGRITY_EVENT',
      resource_type: 'test',
      details: { key: 'value' },
      severity: 'info',
    });

    // 2. Anchor pending batch
    const anchorResult = await auditService.anchorPendingLogs();
    expect(anchorResult.batchId).to.be.not.undefined;
    expect(anchorResult.rootHash).to.be.not.undefined;
    expect(anchorResult.logCount).to.be.above(0);

    // 3. Verify batch integrity (should be 100% tamper-free)
    const verification = await auditService.verifyBatchIntegrity(anchorResult.batchId);
    expect(verification.isTamperFree).to.equal(true);
    expect(verification.storedRootHash).to.equal(verification.recomputedRootHash);
    expect(verification.disclaimer).to.include('Cryptographic hash verification proves');
  });

  it('should detect tamper if an off-chain audit record is altered', async () => {
    // 1. Insert and anchor a new log
    const testLog = await auditRepository.log({
      event_type: 'TAMPER_DETECTION_TEST',
      resource_type: 'audit',
      details: { status: 'original' },
      severity: 'warning',
    });

    const batch = await auditService.anchorPendingLogs();

    // 2. Maliciously modify the off-chain log row in database
    await db.query(
      `UPDATE audit_logs SET details = '{"status":"maliciously_tampered"}'::jsonb WHERE id = $1`,
      [testLog.id]
    );

    // 3. Run integrity verification
    const verification = await auditService.verifyBatchIntegrity(batch.batchId);
    expect(verification.isTamperFree).to.equal(false);
    expect(verification.recomputedRootHash).to.not.equal(verification.storedRootHash);
  });
});
