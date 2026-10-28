import { Router } from 'express';
import { z } from 'zod';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole, requireVerifiedOrg } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { BLOOD_GROUPS, COMPONENT_TYPES } from '../config/constants';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  requireRole('blood_bank'),
  requireVerifiedOrg(),
  (req, res, next) => inventoryController.listInventory(req, res, next)
);

const addBatchSchema = z.object({
  blood_group: z.enum(BLOOD_GROUPS),
  component_type: z.enum(COMPONENT_TYPES),
  units_available: z.number().int().min(1).max(500),
  collection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  batch_number: z.string().min(3),
  storage_location: z.string().optional(),
});

router.post(
  '/',
  requireRole('blood_bank'),
  requireVerifiedOrg(),
  validateBody(addBatchSchema),
  (req, res, next) => inventoryController.addBatch(req, res, next)
);

const reserveSchema = z.object({
  units: z.number().int().min(1),
  requestId: z.string().uuid(),
});

router.post(
  '/:id/reserve',
  requireRole('hospital', 'blood_bank'),
  requireVerifiedOrg(),
  validateBody(reserveSchema),
  (req, res, next) => inventoryController.reserveUnits(req, res, next)
);

router.post(
  '/reservations/:reservationId/release',
  requireRole('hospital', 'blood_bank'),
  (req, res, next) => inventoryController.releaseReservation(req, res, next)
);

export default router;
