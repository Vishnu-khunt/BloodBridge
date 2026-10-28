import { db } from '../db/client';
import { BloodInventory } from '../types';
import { BloodGroup, ComponentType } from '../config/constants';

export class InventoryRepository {
  async findById(id: string): Promise<BloodInventory | null> {
    const res = await db.query<BloodInventory>(
      'SELECT * FROM blood_inventories WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async listByBloodBank(bloodBankId: string): Promise<BloodInventory[]> {
    const res = await db.query<BloodInventory>(
      `SELECT * FROM blood_inventories
       WHERE blood_bank_id = $1
       ORDER BY expiry_date ASC`,
      [bloodBankId]
    );
    return res.rows;
  }

  async createBatch(batch: {
    blood_bank_id: string;
    blood_group: BloodGroup;
    component_type: ComponentType;
    units_available: number;
    collection_date: string;
    expiry_date: string;
    storage_location?: string | null;
    batch_number: string;
  }): Promise<BloodInventory> {
    const res = await db.query<BloodInventory>(
      `INSERT INTO blood_inventories (
         blood_bank_id, blood_group, component_type, units_available, units_reserved,
         collection_date, expiry_date, storage_location, batch_number, status
       )
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, 'available')
       RETURNING *`,
      [
        batch.blood_bank_id,
        batch.blood_group,
        batch.component_type,
        batch.units_available,
        batch.collection_date,
        batch.expiry_date,
        batch.storage_location || null,
        batch.batch_number,
      ]
    );
    return res.rows[0];
  }

  async findAvailableForMatching(
    compatibleGroups: BloodGroup[],
    componentType: ComponentType
  ): Promise<(BloodInventory & { blood_bank_name: string; city: string; latitude: number | null; longitude: number | null })[]> {
    if (compatibleGroups.length === 0) return [];
    const groupPlaceholders = compatibleGroups.map((_, i) => `$${i + 2}`).join(', ');
    const res = await db.query(
      `SELECT bi.*, org.legal_name as blood_bank_name, org.city, org.latitude, org.longitude
       FROM blood_inventories bi
       JOIN organizations org ON bi.blood_bank_id = org.id
       WHERE org.verification_status = 'verified'
         AND bi.status = 'available'
         AND bi.component_type = $1
         AND bi.blood_group IN (${groupPlaceholders})
         AND bi.expiry_date >= CURRENT_DATE
         AND (bi.units_available - bi.units_reserved) > 0
       ORDER BY bi.expiry_date ASC`,
      [componentType, ...compatibleGroups]
    );
    return res.rows;
  }

  /**
   * Concurrently safe stock reservation with row-level locking (SELECT ... FOR UPDATE).
   */
  async reserveStock(
    inventoryId: string,
    unitsToReserve: number,
    requestId: string,
    reservedBy: string
  ): Promise<{ inventory: BloodInventory; reservationId: string }> {
    return await db.transaction(async (tx) => {
      // 1. Lock the inventory row
      const checkRes = await tx.query<BloodInventory>(
        `SELECT * FROM blood_inventories WHERE id = $1 FOR UPDATE`,
        [inventoryId]
      );

      if (checkRes.rowCount === 0) {
        throw new Error('Inventory batch not found');
      }

      const inv = checkRes.rows[0];

      if (inv.status !== 'available') {
        throw new Error(`Inventory batch is not available (status: ${inv.status})`);
      }

      if (new Date(inv.expiry_date) < new Date()) {
        throw new Error('Cannot reserve expired blood inventory');
      }

      const remainingUnreserved = inv.units_available - inv.units_reserved;
      if (remainingUnreserved < unitsToReserve) {
        throw new Error(
          `Insufficient unreserved stock. Requested: ${unitsToReserve}, Remaining: ${remainingUnreserved}`
        );
      }

      // 2. Increment reserved units
      const updateRes = await tx.query<BloodInventory>(
        `UPDATE blood_inventories
         SET units_reserved = units_reserved + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [unitsToReserve, inventoryId]
      );

      // 3. Insert reservation record
      const resvRes = await tx.query<{ id: string }>(
        `INSERT INTO inventory_reservations (inventory_id, request_id, units_reserved, reserved_by, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [inventoryId, requestId, unitsToReserve, reservedBy]
      );

      return {
        inventory: updateRes.rows[0],
        reservationId: resvRes.rows[0].id,
      };
    });
  }

  async releaseReservation(reservationId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const resvRes = await tx.query(
        `SELECT * FROM inventory_reservations WHERE id = $1 AND status = 'active' FOR UPDATE`,
        [reservationId]
      );

      if (resvRes.rowCount === 0) return;

      const resv = resvRes.rows[0];

      await tx.query(
        `UPDATE inventory_reservations SET status = 'released' WHERE id = $1`,
        [reservationId]
      );

      await tx.query(
        `UPDATE blood_inventories
         SET units_reserved = GREATEST(0, units_reserved - $1), updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [resv.units_reserved, resv.inventory_id]
      );
    });
  }

  async dispatchReservedStock(
    inventoryId: string,
    unitsDispatched: number
  ): Promise<BloodInventory> {
    return await db.transaction(async (tx) => {
      const lockRes = await tx.query<BloodInventory>(
        `SELECT * FROM blood_inventories WHERE id = $1 FOR UPDATE`,
        [inventoryId]
      );

      if (lockRes.rowCount === 0) throw new Error('Inventory batch not found');

      const inv = lockRes.rows[0];
      if (inv.units_reserved < unitsDispatched || inv.units_available < unitsDispatched) {
        throw new Error('Cannot dispatch more units than available/reserved');
      }

      const newAvailable = inv.units_available - unitsDispatched;
      const newReserved = inv.units_reserved - unitsDispatched;
      const newStatus = newAvailable === 0 ? 'reserved' : inv.status;

      const updateRes = await tx.query<BloodInventory>(
        `UPDATE blood_inventories
         SET units_available = $1, units_reserved = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [newAvailable, newReserved, newStatus, inventoryId]
      );

      return updateRes.rows[0];
    });
  }
}

export const inventoryRepository = new InventoryRepository();
