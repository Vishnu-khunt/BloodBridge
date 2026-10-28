import { Router } from 'express';
import { z } from 'zod';
import { donorController } from '../controllers/donor.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { BLOOD_GROUPS } from '../config/constants';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('donor'));

router.get('/profile', (req, res, next) =>
  donorController.getProfile(req, res, next)
);

const updateProfileSchema = z.object({
  blood_group: z.enum(BLOOD_GROUPS),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.number().optional(),
  last_donation_date: z.string().optional(),
  city: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  emergency_contact_consent: z.boolean().optional(),
});

router.put('/profile', validateBody(updateProfileSchema), (req, res, next) =>
  donorController.updateProfile(req, res, next)
);

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

router.post('/availability', validateBody(availabilitySchema), (req, res, next) =>
  donorController.toggleAvailability(req, res, next)
);

export default router;
