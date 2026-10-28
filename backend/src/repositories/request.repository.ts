import { db } from '../db/client';
import { BloodRequest, RequestMatch } from '../types';
import { BloodGroup, ComponentType, UrgencyLevel, RequestStatus } from '../config/constants';

export class RequestRepository {
  async findById(id: string): Promise<BloodRequest | null> {
    const res = await db.query<BloodRequest>(
      'SELECT * FROM blood_requests WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async list(filters?: { hospitalId?: string; status?: RequestStatus }): Promise<BloodRequest[]> {
    let sql = 'SELECT * FROM blood_requests';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.hospitalId) {
      params.push(filters.hospitalId);
      conditions.push(`hospital_id = $${params.length}`);
    }

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const res = await db.query<BloodRequest>(sql, params);
    return res.rows;
  }

  async create(req: {
    hospital_id: string;
    patient_ref_hash: string;
    blood_group: BloodGroup;
    component_type: ComponentType;
    units_requested: number;
    urgency_level: UrgencyLevel;
    destination_city: string;
    destination_lat?: number | null;
    destination_lng?: number | null;
    on_chain_request_hash?: string | null;
    notes?: string | null;
  }): Promise<BloodRequest> {
    return await db.transaction(async (tx) => {
      const res = await tx.query<BloodRequest>(
        `INSERT INTO blood_requests (
           hospital_id, patient_ref_hash, blood_group, component_type, units_requested,
           urgency_level, destination_city, destination_lat, destination_lng,
           status, on_chain_request_hash, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, $11)
         RETURNING *`,
        [
          req.hospital_id,
          req.patient_ref_hash,
          req.blood_group,
          req.component_type,
          req.units_requested,
          req.urgency_level,
          req.destination_city,
          req.destination_lat || null,
          req.destination_lng || null,
          req.on_chain_request_hash || null,
          req.notes || null,
        ]
      );

      const created = res.rows[0];

      // Record history
      await tx.query(
        `INSERT INTO request_history (request_id, actor_id, actor_role, from_status, to_status, notes)
         VALUES ($1, NULL, 'system', NULL, 'open', 'Emergency request initiated')`,
        [created.id]
      );

      return created;
    });
  }

  async updateStatus(
    id: string,
    newStatus: RequestStatus,
    actorId: string,
    actorRole: string,
    notes?: string,
    onChainTxHash?: string
  ): Promise<BloodRequest> {
    return await db.transaction(async (tx) => {
      const currentRes = await tx.query<BloodRequest>(
        `SELECT * FROM blood_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (currentRes.rowCount === 0) throw new Error('Blood request not found');

      const current = currentRes.rows[0];
      const previousStatus = current.status;

      const updateRes = await tx.query<BloodRequest>(
        `UPDATE blood_requests
         SET status = $1, on_chain_tx_hash = COALESCE($2, on_chain_tx_hash), updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [newStatus, onChainTxHash || null, id]
      );

      await tx.query(
        `INSERT INTO request_history (request_id, actor_id, actor_role, from_status, to_status, notes, on_chain_tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, actorId, actorRole, previousStatus, newStatus, notes || null, onChainTxHash || null]
      );

      return updateRes.rows[0];
    });
  }

  async saveMatches(requestId: string, matches: Array<{
    match_type: 'inventory' | 'donor';
    target_id: string;
    match_score: number;
    distance_km: number | null;
    explanation_json: any;
  }>): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM request_matches WHERE request_id = $1', [requestId]);

      for (const m of matches) {
        await tx.query(
          `INSERT INTO request_matches (request_id, match_type, target_id, match_score, distance_km, explanation_json, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'suggested')`,
          [
            requestId,
            m.match_type,
            m.target_id,
            m.match_score,
            m.distance_km,
            JSON.stringify(m.explanation_json),
          ]
        );
      }
    });
  }

  async getMatches(requestId: string): Promise<RequestMatch[]> {
    const res = await db.query<RequestMatch>(
      `SELECT * FROM request_matches
       WHERE request_id = $1
       ORDER BY match_score DESC, distance_km ASC NULLS LAST`,
      [requestId]
    );
    return res.rows;
  }
}

export const requestRepository = new RequestRepository();
