import { Request, Response, NextFunction } from 'express';
import { securityAlertRepository } from '../repositories/securityAlert.repository';
import { auditRepository } from '../repositories/audit.repository';
import { auditService } from '../services/audit.service';

export class AdminController {
  async getSecurityAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as any;
      const severity = req.query.severity as any;
      const alerts = await securityAlertRepository.list({ status, severity });
      res.status(200).json({ alerts, count: alerts.length });
    } catch (err) {
      next(err);
    }
  }

  async updateAlertStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updated = await securityAlertRepository.updateStatus(
        id,
        status,
        req.user!.userId,
        notes
      );

      if (!updated) {
        res.status(404).json({ error: 'Security alert not found' });
        return;
      }

      res.status(200).json({
        message: `Alert updated to '${status}'`,
        alert: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventType, actorId, severity, limit, offset } = req.query;
      const result = await auditRepository.list({
        eventType: eventType as string,
        actorId: actorId as string,
        severity: severity as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async anchorBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await auditService.anchorPendingLogs();
      res.status(200).json({
        message: 'Audit logs batch anchored on-chain successfully',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyBatchIntegrity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batchId } = req.params;
      const result = await auditService.verifyBatchIntegrity(batchId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
