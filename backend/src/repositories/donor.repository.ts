import { db } from '../db/client';
import { DonorProfile } from '../types';
import { BloodGroup } from '../config/constants';

export class DonorRepository {
  async findByUserId(userId: string): Promise<DonorProfile | null> {
    const res = await db.query<DonorProfile>(
      'SELECT * FROM donors WHERE user_id = $1',
      [userId]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<DonorProfile | null> {
    const res = await db.query<DonorProfile>('SELECT * FROM donors WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async upsertProfile(donor: {
    user_id: string;
    blood_group: BloodGroup;
    gender?: string | null;
    date_of_birth?: string | null;
    weight_kg?: number | null;
    last_donation_date?: string | null;
    is_available?: boolean;
    emergency_contact_consent?: boolean;
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<DonorProfile> {
    const res = await db.query<DonorProfile>(
      `INSERT INTO donors (user_id, blood_group, gender, date_of_birth, weight_kg, last_donation_date, is_available, emergency_contact_consent, city, latitude, longitude, availability_confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true), COALESCE($8, true), $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         blood_group = EXCLUDED.blood_group,
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth,
         weight_kg = EXCLUDED.weight_kg,
         last_donation_date = EXCLUDED.last_donation_date,
         is_available = EXCLUDED.is_available,
         emergency_contact_consent = EXCLUDED.emergency_contact_consent,
         city = EXCLUDED.city,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        donor.user_id,
        donor.blood_group,
        donor.gender || null,
        donor.date_of_birth || null,
        donor.weight_kg || null,
        donor.last_donation_date || null,
        donor.is_available,
        donor.emergency_contact_consent,
        donor.city,
        donor.latitude || null,
        donor.longitude || null,
      ]
    );
    return res.rows[0];
  }

  async updateAvailability(userId: string, isAvailable: boolean): Promise<DonorProfile | null> {
    const res = await db.query<DonorProfile>(
      `UPDATE donors
       SET is_available = $1, availability_confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [isAvailable, userId]
    );
    return res.rows[0] || null;
  }

  async findAvailableDonors(compatibleGroups: BloodGroup[]): Promise<DonorProfile[]> {
    if (compatibleGroups.length === 0) return [];
    const placeholders = compatibleGroups.map((_, i) => `$${i + 1}`).join(', ');
    const res = await db.query<DonorProfile>(
      `SELECT * FROM donors
       WHERE is_available = true
         AND blood_group IN (${placeholders})
       ORDER BY availability_confirmed_at DESC`,
      [...compatibleGroups]
    );
    return res.rows;
  }
}

export const donorRepository = new DonorRepository();
