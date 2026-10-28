import { db } from '../db/client';
import { AuditLog } from '../types';
import { SeverityLevel } from '../config/constants';

export class AuditRepository {
  async log(event: {
    actor_id?: string | null;
    actor_role?: string | null;
    event_type: string;
    resource_type: string;
    resource_id?: string | null;
    details?: Record<string, any>;
    ip_address?: string | null;
    severity?: SeverityLevel;
  }): Promise<AuditLog> {
    const res = await db.query<AuditLog>(
      `INSERT INTO audit_logs (
         actor_id, actor_role, event_type, resource_type, resource_id,
         details, ip_address, severity
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        event.actor_id || null,
        event.actor_role || null,
        event.event_type,
        event.resource_type,
        event.resource_id || null,
        JSON.stringify(event.details || {}),
        event.ip_address || null,
        event.severity || 'info',
      ]
    );
    return res.rows[0];
  }

  async getUnanchoredLogs(limit = 100): Promise<AuditLog[]> {
    const res = await db.query<AuditLog>(
      `SELECT * FROM audit_logs
       WHERE batch_id IS NULL
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  async createBatch(batch: {
    batch_id: string;
    root_hash: string;
    log_count: number;
    metadata_uri?: string;
  }): Promise<void> {
    await db.query(
      `INSERT INTO audit_batches (batch_id, root_hash, log_count, metadata_uri, status)
       VALUES ($1, $2, $3, $4, 'anchored')`,
      [batch.batch_id, batch.root_hash, batch.log_count, batch.metadata_uri || null]
    );
  }

  async linkLogsToBatch(logIds: string[], batchId: string): Promise<void> {
    if (logIds.length === 0) return;
    const placeholders = logIds.map((_, idx) => `$${idx + 2}`).join(', ');
    await db.query(
      `UPDATE audit_logs SET batch_id = $1 WHERE id IN (${placeholders})`,
      [batchId, ...logIds]
    );
  }

  async getBatchById(batchId: string): Promise<any | null> {
    const res = await db.query(`SELECT * FROM audit_batches WHERE batch_id = $1`, [batchId]);
    return res.rows[0] || null;
  }

  async getLogsByBatchId(batchId: string): Promise<AuditLog[]> {
    const res = await db.query<AuditLog>(
      `SELECT * FROM audit_logs WHERE batch_id = $1 ORDER BY created_at ASC`,
      [batchId]
    );
    return res.rows;
  }

  async list(filters?: {
    eventType?: string;
    actorId?: string;
    severity?: SeverityLevel;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let sql = 'SELECT * FROM audit_logs';
    let countSql = 'SELECT COUNT(*) as total FROM audit_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.eventType) {
      params.push(filters.eventType);
      conditions.push(`event_type = $${params.length}`);
    }
    if (filters?.actorId) {
      params.push(filters.actorId);
      conditions.push(`actor_id = $${params.length}`);
    }
    if (filters?.severity) {
      params.push(filters.severity);
      conditions.push(`severity = $${params.length}`);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    const countRes = await db.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    params.push(limit);
    params.push(offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await db.query<AuditLog>(sql, params);
    return { logs: res.rows, total };
  }
}

export const auditRepository = new AuditRepository();
