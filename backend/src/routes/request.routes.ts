import { Router } from 'express';
import { z } from 'zod';
import { requestController } from '../controllers/request.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole, requireVerifiedOrg } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { BLOOD_GROUPS, COMPONENT_TYPES, URGENCY_LEVELS } from '../config/constants';

const router = Router();

router.use(authenticateToken);

// Prominent, dedicated "Create Emergency Request" endpoint
const emergencyRequestSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  componentType: z.enum(COMPONENT_TYPES),
  unitsRequested: z.number().int().min(1).max(50),
  urgencyLevel: z.enum(URGENCY_LEVELS),
  destinationCity: z.string().min(1),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  notes: z.string().optional(),
});

router.post(
  '/emergency',
  requireRole('hospital'),
  requireVerifiedOrg(),
  validateBody(emergencyRequestSchema),
  (req, res, next) => requestController.createEmergencyRequest(req, res, next)
);

router.get('/', (req, res, next) => requestController.listRequests(req, res, next));

router.get('/:id', (req, res, next) =>
  requestController.getRequestById(req, res, next)
);

router.get('/:id/matches', (req, res, next) =>
  requestController.getMatches(req, res, next)
);

// Blood Bank actions
const allocateSchema = z.object({
  inventoryId: z.string().uuid(),
  units: z.number().int().min(1),
});

router.post(
  '/:id/allocate',
  requireRole('blood_bank'),
  requireVerifiedOrg(),
  validateBody(allocateSchema),
  (req, res, next) => requestController.allocateRequest(req, res, next)
);

const dispatchSchema = z.object({
  inventoryId: z.string().uuid(),
  units: z.number().int().min(1),
});

router.post(
  '/:id/dispatch',
  requireRole('blood_bank'),
  requireVerifiedOrg(),
  validateBody(dispatchSchema),
  (req, res, next) => requestController.dispatchRequest(req, res, next)
);

// Hospital actions
router.post(
  '/:id/fulfill',
  requireRole('hospital'),
  requireVerifiedOrg(),
  (req, res, next) => requestController.fulfillRequest(req, res, next)
);

const cancelSchema = z.object({
  reason: z.string().min(3),
});

router.post(
  '/:id/cancel',
  requireRole('hospital'),
  requireVerifiedOrg(),
  validateBody(cancelSchema),
  (req, res, next) => requestController.cancelRequest(req, res, next)
);

export default router;
