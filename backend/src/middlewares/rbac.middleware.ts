import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../config/constants';
import { organizationRepository } from '../repositories/organization.repository';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for this resource',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role '${req.user.role}' is not authorized. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

export function requireVerifiedOrg() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Donors, volunteers, and admins bypass org verification check
    if (['donor', 'volunteer', 'admin'].includes(req.user.role)) {
      return next();
    }

    const org = await organizationRepository.findByUserId(req.user.userId);
    if (!org) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No healthcare organization associated with this account',
      });
      return;
    }

    if (org.verification_status !== 'verified') {
      res.status(403).json({
        error: 'Forbidden',
        message: `Organization accreditation status is '${org.verification_status}'. Privileged operational actions require Administrator verification.`,
        verification_status: org.verification_status,
      });
      return;
    }

    req.user.orgId = org.id;
    req.user.orgStatus = org.verification_status;
    next();
  };
}
