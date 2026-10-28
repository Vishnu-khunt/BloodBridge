import { Request, Response, NextFunction } from 'express';
import { inventoryRepository } from '../repositories/inventory.repository';
import { auditRepository } from '../repositories/audit.repository';

export class InventoryController {
  async listInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.orgId!;
      const inventory = await inventoryRepository.listByBloodBank(orgId);
      res.status(200).json({ inventory, count: inventory.length });
    } catch (err) {
      next(err);
    }
  }

  async addBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.orgId!;
      const batch = await inventoryRepository.createBatch({
        blood_bank_id: orgId,
        ...req.body,
      });

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: 'blood_bank',
        event_type: 'INVENTORY_BATCH_REGISTERED',
        resource_type: 'blood_inventory',
        resource_id: batch.id,
        details: {
          batchNumber: batch.batch_number,
          bloodGroup: batch.blood_group,
          componentType: batch.component_type,
          units: batch.units_available,
        },
        ip_address: req.ip,
        severity: 'info',
      });

      res.status(201).json({
        message: 'Blood inventory batch registered successfully',
        batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async reserveUnits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { units, requestId } = req.body;

      const result = await inventoryRepository.reserveStock(
        id,
        units,
        requestId,
        req.user!.userId
      );

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: req.user!.role,
        event_type: 'INVENTORY_RESERVED',
        resource_type: 'blood_inventory',
        resource_id: id,
        details: { units, requestId, reservationId: result.reservationId },
        ip_address: req.ip,
        severity: 'info',
      });

      res.status(200).json({
        message: 'Inventory reserved successfully',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async releaseReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reservationId } = req.params;
      await inventoryRepository.releaseReservation(reservationId);

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: req.user!.role,
        event_type: 'INVENTORY_RESERVATION_RELEASED',
        resource_type: 'inventory_reservation',
        resource_id: reservationId,
        ip_address: req.ip,
        severity: 'info',
      });

      res.status(200).json({ message: 'Reservation released successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
