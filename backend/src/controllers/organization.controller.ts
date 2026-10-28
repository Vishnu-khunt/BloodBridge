import { Request, Response, NextFunction } from 'express';
import { organizationRepository } from '../repositories/organization.repository';
import { auditRepository } from '../repositories/audit.repository';
import { OrgStatus } from '../config/constants';

export class OrganizationController {
  async getMyOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await organizationRepository.findByUserId(req.user!.userId);
      if (!org) {
        res.status(404).json({ error: 'No organization found for current user' });
        return;
      }
      res.status(200).json({ organization: org });
    } catch (err) {
      next(err);
    }
  }

  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as OrgStatus | undefined;
      const orgs = await organizationRepository.listAll(status);
      res.status(200).json({ organizations: orgs, count: orgs.length });
    } catch (err) {
      next(err);
    }
  }

  async verifyOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const org = await organizationRepository.findById(id);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const updated = await organizationRepository.updateVerification(
        id,
        'verified',
        req.user!.userId
      );

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: 'admin',
        event_type: 'ORGANIZATION_VERIFIED',
        resource_type: 'organization',
        resource_id: id,
        details: { legalName: org.legal_name, license: org.license_number },
        ip_address: req.ip,
        severity: 'info',
      });

      res.status(200).json({
        message: `Organization '${org.legal_name}' has been successfully verified.`,
        organization: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async revokeOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const org = await organizationRepository.findById(id);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const updated = await organizationRepository.updateVerification(
        id,
        'revoked',
        req.user!.userId,
        reason
      );

      await auditRepository.log({
        actor_id: req.user!.userId,
        actor_role: 'admin',
        event_type: 'ORGANIZATION_REVOKED',
        resource_type: 'organization',
        resource_id: id,
        details: { legalName: org.legal_name, reason },
        ip_address: req.ip,
        severity: 'warning',
      });

      res.status(200).json({
        message: `Organization '${org.legal_name}' accreditation revoked.`,
        organization: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();
