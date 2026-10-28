import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { organizationRepository } from '../repositories/organization.repository';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await authService.register(req.body, ip);
      res.status(201).json({
        message: 'Registration successful',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const { email, password } = req.body;
      const result = await authService.login(email, password, ip);
      res.status(200).json({
        message: 'Login successful',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      let org = null;
      if (user.role === 'hospital' || user.role === 'blood_bank') {
        org = await organizationRepository.findByUserId(user.id);
      }

      const { password_hash: _, ...safeUser } = user;
      res.status(200).json({
        user: safeUser,
        organization: org,
      });
    } catch (err) {
      next(err);
    }
  }

  getDemoAccounts(_req: Request, res: Response): void {
    res.status(200).json({
      notice: 'FICTIONAL DEMO CREDENTIALS FOR TESTING & EVALUATION ONLY',
      accounts: [
        {
          role: 'admin',
          label: 'System Administrator',
          email: 'admin@bloodbridge.demo',
          password: 'AdminPassword123!',
          description: 'Full administrative access: organization verification, security intelligence, and audit anchor management.',
        },
        {
          role: 'hospital',
          label: 'City General Hospital (Verified)',
          email: 'hospital@citygeneral.demo',
          password: 'HospitalPassword123!',
          description: 'Accredited hospital authorized to trigger emergency blood requests and confirm receipt.',
        },
        {
          role: 'hospital',
          label: 'St. Jude Memorial (Pending Verification)',
          email: 'hospital.pending@stjude.demo',
          password: 'HospitalPassword123!',
          description: 'Demo unverified hospital for testing administrator accreditation workflows.',
        },
        {
          role: 'blood_bank',
          label: 'Metro Red Cross Blood Center (Verified)',
          email: 'bloodbank@redcross.demo',
          password: 'BloodBankPassword123!',
          description: 'Accredited blood bank with verified inventories, reservation, and dispatch capabilities.',
        },
        {
          role: 'donor',
          label: 'Alex Rivera (Universal Donor O-)',
          email: 'donor.alex@bloodbridge.demo',
          password: 'DonorPassword123!',
          description: 'O- Negative active blood donor available for emergency matching calls.',
        },
        {
          role: 'volunteer',
          label: 'Samira Khan (NGO Coordinator)',
          email: 'volunteer.sam@bloodbridge.demo',
          password: 'VolunteerPassword123!',
          description: 'Volunteer / NGO coordinator tracking regional blood shortages and donor drives.',
        },
      ],
    });
  }
}

export const authController = new AuthController();
