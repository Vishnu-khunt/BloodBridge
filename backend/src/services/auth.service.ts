import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { donorRepository } from '../repositories/donor.repository';
import { auditRepository } from '../repositories/audit.repository';
import { securityService } from './security.service';
import { UserRole, OrgType, BloodGroup } from '../config/constants';
import { User, JwtPayload } from '../types';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors';

export class AuthService {
  async register(
    data: {
      email: string;
      password: string;
      role: UserRole;
      full_name: string;
      phone?: string;
      // Organization fields (if role is hospital or blood_bank)
      legal_name?: string;
      license_number?: string;
      address?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      eth_address?: string;
      // Donor fields (if role is donor)
      blood_group?: BloodGroup;
      gender?: string;
      date_of_birth?: string;
      weight_kg?: number;
      emergency_contact_consent?: boolean;
    },
    ipAddress?: string
  ): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedFullName = data.full_name.trim();

    // 1. Strict Role Elevation Protection
    if (data.role === 'admin') {
      await auditRepository.log({
        event_type: 'UNAUTHORIZED_ADMIN_REGISTRATION_ATTEMPT',
        resource_type: 'user',
        details: { email: normalizedEmail },
        ip_address: ipAddress,
        severity: 'critical',
      });
      throw new ForbiddenError('System administrator accounts cannot be self-registered.');
    }

    // 2. Check if user already exists (duplicate email check)
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError(
        'An account with this email already exists. Please sign in or use another email.'
      );
    }

    // 3. Role-specific validation before creating records
    if (data.role === 'hospital' || data.role === 'blood_bank') {
      if (!data.legal_name || data.legal_name.trim().length < 2) {
        throw new BadRequestError(
          `Please enter the ${data.role === 'hospital' ? 'hospital' : 'blood bank'} name.`
        );
      }
      if (!data.license_number || data.license_number.trim().length < 2) {
        throw new BadRequestError('Please enter the state license or registration number.');
      }
      if (!data.address || data.address.trim().length < 3) {
        throw new BadRequestError('Please enter the facility address.');
      }
      if (!data.city || data.city.trim().length < 2) {
        throw new BadRequestError('Please enter the city.');
      }

      // Check duplicate license number to prevent unhandled database crash
      const existingOrg = await organizationRepository.findByLicense(data.license_number.trim());
      if (existingOrg) {
        throw new ConflictError('An organization with this license number already exists.');
      }
    } else if (data.role === 'donor') {
      if (!data.blood_group) {
        throw new BadRequestError('Please select a valid blood group.');
      }
      if (!data.city || data.city.trim().length < 2) {
        throw new BadRequestError('Please enter your city/region.');
      }
    }

    // 4. Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    // 5. Create user record
    const user = await userRepository.create({
      email: normalizedEmail,
      password_hash,
      role: data.role,
      full_name: normalizedFullName,
      phone: data.phone?.trim() || null,
    });

    // 6. Handle role-specific profiles
    let orgId: string | undefined;
    let orgStatus: any | undefined;

    if (data.role === 'hospital' || data.role === 'blood_bank') {
      const org = await organizationRepository.create({
        user_id: user.id,
        org_type: data.role as OrgType,
        legal_name: data.legal_name!.trim(),
        license_number: data.license_number!.trim(),
        address: data.address!.trim(),
        city: data.city!.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        eth_address: data.eth_address,
      });
      orgId = org.id;
      orgStatus = org.verification_status; // Initially 'pending'
    } else if (data.role === 'donor') {
      await donorRepository.upsertProfile({
        user_id: user.id,
        blood_group: data.blood_group!,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        weight_kg: data.weight_kg || null,
        emergency_contact_consent: data.emergency_contact_consent !== false,
        city: data.city!.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        is_available: true,
      });
    }

    await auditRepository.log({
      actor_id: user.id,
      actor_role: user.role,
      event_type: 'USER_REGISTERED',
      resource_type: 'user',
      resource_id: user.id,
      details: { email: user.email, role: user.role },
      ip_address: ipAddress,
      severity: 'info',
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId,
      orgStatus,
    });

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      await securityService.recordFailedLogin(normalizedEmail, ipAddress);
      throw new UnauthorizedError('Incorrect email or password.');
    }

    if (!user.is_active) {
      throw new ForbiddenError('This account has been deactivated.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await securityService.recordFailedLogin(normalizedEmail, ipAddress, user.id);
      throw new UnauthorizedError('Incorrect email or password.');
    }

    // Attach organization info if hospital or blood bank
    let orgId: string | undefined;
    let orgStatus: any | undefined;
    if (user.role === 'hospital' || user.role === 'blood_bank') {
      const org = await organizationRepository.findByUserId(user.id);
      if (org) {
        orgId = org.id;
        orgStatus = org.verification_status;
      }
    }

    await auditRepository.log({
      actor_id: user.id,
      actor_role: user.role,
      event_type: 'USER_LOGIN_SUCCESS',
      resource_type: 'user',
      resource_id: user.id,
      details: { email: user.email },
      ip_address: ipAddress,
      severity: 'info',
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId,
      orgStatus,
    });

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }
}

export const authService = new AuthService();
