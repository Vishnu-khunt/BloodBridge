import { db } from '../db/client';
import { Organization } from '../types';
import { OrgStatus } from '../config/constants';

export class OrganizationRepository {
  async findById(id: string): Promise<Organization | null> {
    const res = await db.query<Organization>('SELECT * FROM organizations WHERE id = $1', [
      id,
    ]);
    return res.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Organization | null> {
    const res = await db.query<Organization>(
      'SELECT * FROM organizations WHERE user_id = $1',
      [userId]
    );
    return res.rows[0] || null;
  }

  async findByLicense(licenseNumber: string): Promise<Organization | null> {
    const res = await db.query<Organization>(
      'SELECT * FROM organizations WHERE license_number = $1',
      [licenseNumber]
    );
    return res.rows[0] || null;
  }

  async create(org: {
    user_id: string;
    org_type: string;
    legal_name: string;
    license_number: string;
    address: string;
    city: string;
    latitude?: number | null;
    longitude?: number | null;
    eth_address?: string | null;
  }): Promise<Organization> {
    const res = await db.query<Organization>(
      `INSERT INTO organizations (user_id, org_type, legal_name, license_number, address, city, latitude, longitude, eth_address, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [
        org.user_id,
        org.org_type,
        org.legal_name,
        org.license_number,
        org.address,
        org.city,
        org.latitude || null,
        org.longitude || null,
        org.eth_address || null,
      ]
    );
    return res.rows[0];
  }

  async listAll(status?: OrgStatus): Promise<Organization[]> {
    if (status) {
      const res = await db.query<Organization>(
        'SELECT * FROM organizations WHERE verification_status = $1 ORDER BY created_at DESC',
        [status]
      );
      return res.rows;
    }
    const res = await db.query<Organization>(
      'SELECT * FROM organizations ORDER BY created_at DESC'
    );
    return res.rows;
  }

  async updateVerification(
    id: string,
    status: OrgStatus,
    verifiedBy: string,
    rejectionReason?: string
  ): Promise<Organization | null> {
    const res = await db.query<Organization>(
      `UPDATE organizations
       SET verification_status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP, rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, verifiedBy, rejectionReason || null, id]
    );
    return res.rows[0] || null;
  }
}

export const organizationRepository = new OrganizationRepository();
