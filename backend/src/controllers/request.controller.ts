import { Request, Response, NextFunction } from 'express';
import { requestService } from '../services/request.service';
import { requestRepository } from '../repositories/request.repository';

export class RequestController {
  async createEmergencyRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = req.user!.orgId!;
      const result = await requestService.createEmergencyRequest({
        hospitalId,
        actorId: req.user!.userId,
        ipAddress: req.ip,
        ...req.body,
      });

      res.status(201).json({
        message: 'Emergency blood request created and matching executed successfully',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = req.user!.role === 'hospital' ? req.user!.orgId : undefined;
      const status = req.query.status as any;
      const requests = await requestRepository.list({ hospitalId, status });
      res.status(200).json({ requests, count: requests.length });
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const request = await requestRepository.findById(id);
      if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      res.status(200).json({ request });
    } catch (err) {
      next(err);
    }
  }

  async allocateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { inventoryId, units } = req.body;
      const bloodBankId = req.user!.orgId!;

      const result = await requestService.allocateInventoryToRequest({
        requestId: id,
        inventoryId,
        unitsToAllocate: units,
        bloodBankId,
        actorId: req.user!.userId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        message: 'Inventory allocated to request successfully',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async dispatchRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { inventoryId, units } = req.body;

      const updated = await requestService.dispatchRequest({
        requestId: id,
        inventoryId,
        unitsDispatched: units,
        actorId: req.user!.userId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        message: 'Blood units dispatched in cold chain transport',
        request: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async fulfillRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const hospitalId = req.user!.orgId!;

      const updated = await requestService.fulfillRequest({
        requestId: id,
        hospitalId,
        actorId: req.user!.userId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        message: 'Blood units received and accepted. Request fulfilled.',
        request: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const hospitalId = req.user!.orgId!;

      const updated = await requestService.cancelRequest({
        requestId: id,
        hospitalId,
        reason: reason || 'Cancelled by requesting hospital',
        actorId: req.user!.userId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        message: 'Request cancelled successfully',
        request: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const matches = await requestRepository.getMatches(id);
      res.status(200).json({ matches, count: matches.length });
    } catch (err) {
      next(err);
    }
  }
}

export const requestController = new RequestController();
