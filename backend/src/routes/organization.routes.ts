import { Router } from 'express';
import { z } from 'zod';
import { organizationController } from '../controllers/organization.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/me', (req, res, next) =>
  organizationController.getMyOrg(req, res, next)
);

// Admin-only endpoints
router.get('/', requireRole('admin'), (req, res, next) =>
  organizationController.listAll(req, res, next)
);

router.post('/:id/verify', requireRole('admin'), (req, res, next) =>
  organizationController.verifyOrg(req, res, next)
);

const revokeSchema = z.object({
  reason: z.string().min(5, 'Revocation reason must be at least 5 characters long'),
});

router.post(
  '/:id/revoke',
  requireRole('admin'),
  validateBody(revokeSchema),
  (req, res, next) => organizationController.revokeOrg(req, res, next)
);

export default router;
