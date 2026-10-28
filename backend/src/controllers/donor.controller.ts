import { Request, Response, NextFunction } from 'express';
import { donorRepository } from '../repositories/donor.repository';
import { auditRepository } from '../repositories/audit.repository';

export class DonorController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await donorRepository.findByUserId(req.user!.userId);
      if (!profile) {
        res.status(404).json({ error: 'Donor profile not found' });
        return;
      }
      res.status(200).json({ profile });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await donorRepository.upsertProfile({
        user_id: req.user!.userId,
        ...req.body,
      });

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: 'donor',
        event_type: 'DONOR_PROFILE_UPDATED',
        resource_type: 'donor',
        resource_id: updated.id,
        ip_address: req.ip,
        severity: 'info',
      });

      res.status(200).json({
        message: 'Donor profile updated successfully',
        profile: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isAvailable } = req.body;
      const updated = await donorRepository.updateAvailability(
        req.user!.userId,
        Boolean(isAvailable)
      );

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: 'donor',
        event_type: 'DONOR_AVAILABILITY_CHANGED',
        resource_type: 'donor',
        details: { isAvailable },
        ip_address: req.ip,
        severity: 'info',
      });

      res.status(200).json({
        message: `Availability updated to: ${isAvailable ? 'Available' : 'Unavailable'}`,
        profile: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const donorController = new DonorController();
