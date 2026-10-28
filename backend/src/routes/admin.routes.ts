import { Router } from 'express';
import { z } from 'zod';
import { adminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { ALERT_STATUSES } from '../config/constants';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/security/alerts', (req, res, next) =>
  adminController.getSecurityAlerts(req, res, next)
);

const updateAlertSchema = z.object({
  status: z.enum(ALERT_STATUSES),
  notes: z.string().optional(),
});

router.patch(
  '/security/alerts/:id',
  validateBody(updateAlertSchema),
  (req, res, next) => adminController.updateAlertStatus(req, res, next)
);

router.get('/audit/logs', (req, res, next) =>
  adminController.getAuditLogs(req, res, next)
);

router.post('/audit/anchor-batch', (req, res, next) =>
  adminController.anchorBatch(req, res, next)
);

router.get('/audit/verify/:batchId', (req, res, next) =>
  adminController.verifyBatchIntegrity(req, res, next)
);

export default router;
