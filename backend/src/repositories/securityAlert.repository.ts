import { db } from '../db/client';
import { SecurityAlert } from '../types';
import { AlertStatus, SeverityLevel } from '../config/constants';

export class SecurityAlertRepository {
  async create(alert: {
    rule_id: string;
    rule_name: string;
    severity: SeverityLevel;
    actor_id?: string | null;
    ip_address?: string | null;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<SecurityAlert> {
    const res = await db.query<SecurityAlert>(
      `INSERT INTO security_alerts (
         rule_id, rule_name, severity, actor_id, ip_address, description, metadata, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
       RETURNING *`,
      [
        alert.rule_id,
        alert.rule_name,
        alert.severity,
        alert.actor_id || null,
        alert.ip_address || null,
        alert.description,
        JSON.stringify(alert.metadata || {}),
      ]
    );
    return res.rows[0];
  }

  async list(filters?: { status?: AlertStatus; severity?: SeverityLevel }): Promise<SecurityAlert[]> {
    let sql = 'SELECT * FROM security_alerts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filters?.severity) {
      params.push(filters.severity);
      conditions.push(`severity = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const res = await db.query<SecurityAlert>(sql, params);
    return res.rows;
  }

  async updateStatus(
    id: string,
    status: AlertStatus,
    investigatedBy: string,
    resolutionNotes?: string
  ): Promise<SecurityAlert | null> {
    const res = await db.query<SecurityAlert>(
      `UPDATE security_alerts
       SET status = $1, investigated_by = $2, resolution_notes = $3,
           resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $4
       RETURNING *`,
      [status, investigatedBy, resolutionNotes || null, id]
    );
    return res.rows[0] || null;
  }

  /**
   * Counts events of a given type within a rolling time window.
   */
  async countRecentEvents(
    eventType: string,
    actorId?: string | null,
    ipAddress?: string | null,
    windowMinutes = 5
  ): Promise<number> {
    let sql = `
      SELECT COUNT(*) as count FROM audit_logs
      WHERE event_type = $1
        AND created_at >= CURRENT_TIMESTAMP - ($2 || ' minutes')::interval
    `;
    const params: any[] = [eventType, windowMinutes.toString()];

    if (actorId) {
      params.push(actorId);
      sql += ` AND actor_id = $${params.length}`;
    } else if (ipAddress) {
      params.push(ipAddress);
      sql += ` AND ip_address = $${params.length}`;
    }

    const res = await db.query<{ count: string }>(sql, params);
    return parseInt(res.rows[0]?.count || '0', 10);
  }
}

export const securityAlertRepository = new SecurityAlertRepository();
