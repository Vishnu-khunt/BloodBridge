import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createRateLimiter } from '../middlewares/rateLimiter';
import { USER_ROLES, BLOOD_GROUPS } from '../config/constants';

const router = Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  message: 'Too many authentication attempts. Please try again later.',
});

// Phone regex allowing optional '+', digits, spaces, hyphens, parentheses, 7-15 digits
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      const digitsOnly = val.replace(/\D/g, '');
      return phoneRegex.test(val) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
    },
    {
      message: 'Enter a valid phone number, including the appropriate country code if required.',
    }
  );

// Unified registration schema with pre-normalization for camelCase and nested objects
export const registerSchema = z.preprocess(
  (input: any) => {
    if (typeof input !== 'object' || input === null) return input;
    const normalized = { ...input };

    // Normalize camelCase to snake_case if present
    if (normalized.fullName && !normalized.full_name) {
      normalized.full_name = normalized.fullName;
    }
    if (normalized.bloodGroup && !normalized.blood_group) {
      normalized.blood_group = normalized.bloodGroup;
    }
    if (normalized.legalName && !normalized.legal_name) {
      normalized.legal_name = normalized.legalName;
    }
    if (normalized.licenseNumber && !normalized.license_number) {
      normalized.license_number = normalized.licenseNumber;
    }
    if (normalized.ethAddress && !normalized.eth_address) {
      normalized.eth_address = normalized.ethAddress;
    }
    if (
      normalized.emergencyContactConsent !== undefined &&
      normalized.emergency_contact_consent === undefined
    ) {
      normalized.emergency_contact_consent = normalized.emergencyContactConsent;
    }

    // Flatten nested donorProfile or organization if present
    if (normalized.donorProfile && typeof normalized.donorProfile === 'object') {
      if (normalized.donorProfile.bloodGroup) normalized.blood_group = normalized.donorProfile.bloodGroup;
      if (normalized.donorProfile.blood_group) normalized.blood_group = normalized.donorProfile.blood_group;
      if (normalized.donorProfile.city && !normalized.city) normalized.city = normalized.donorProfile.city;
      if (normalized.donorProfile.emergencyContactConsent !== undefined) {
        normalized.emergency_contact_consent = normalized.donorProfile.emergencyContactConsent;
      }
    }

    if (normalized.organization && typeof normalized.organization === 'object') {
      if (normalized.organization.legalName) normalized.legal_name = normalized.organization.legalName;
      if (normalized.organization.legal_name) normalized.legal_name = normalized.organization.legal_name;
      if (normalized.organization.licenseNumber) normalized.license_number = normalized.organization.licenseNumber;
      if (normalized.organization.license_number) normalized.license_number = normalized.organization.license_number;
      if (normalized.organization.address && !normalized.address) normalized.address = normalized.organization.address;
      if (normalized.organization.city && !normalized.city) normalized.city = normalized.organization.city;
    }

    // Normalize string fields
    if (typeof normalized.email === 'string') {
      normalized.email = normalized.email.trim().toLowerCase();
    }
    if (typeof normalized.full_name === 'string') {
      normalized.full_name = normalized.full_name.trim();
    }
    if (typeof normalized.phone === 'string') {
      normalized.phone = normalized.phone.trim();
    }
    if (typeof normalized.city === 'string') {
      normalized.city = normalized.city.trim();
    }
    if (typeof normalized.legal_name === 'string') {
      normalized.legal_name = normalized.legal_name.trim();
    }
    if (typeof normalized.license_number === 'string') {
      normalized.license_number = normalized.license_number.trim();
    }
    if (typeof normalized.address === 'string') {
      normalized.address = normalized.address.trim();
    }

    return normalized;
  },
  z.object({
    email: z
      .string({ required_error: 'Enter a valid email address.' })
      .email('Enter a valid email address.'),
    password: z
      .string({ required_error: 'Password must be at least 8 characters.' })
      .min(8, 'Password must be at least 8 characters.'),
    role: z.enum(USER_ROLES, {
      errorMap: () => ({ message: 'Please select a valid role.' }),
    }),
    full_name: z
      .string({ required_error: 'Please enter your full legal name.' })
      .min(2, 'Please enter your full legal name.'),
    phone: phoneSchema,

    // Organization fields
    legal_name: z.string().optional(),
    license_number: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    eth_address: z.string().optional(),

    // Donor fields
    blood_group: z
      .enum(BLOOD_GROUPS, {
        errorMap: () => ({ message: 'Please select a valid blood group.' }),
      })
      .optional(),
    gender: z.string().optional(),
    date_of_birth: z.string().optional(),
    weight_kg: z.number().optional(),
    emergency_contact_consent: z.boolean().optional(),
  })
);

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Enter a valid email address.' })
    .email('Enter a valid email address.'),
  password: z
    .string({ required_error: 'Please enter your password.' })
    .min(1, 'Please enter your password.'),
});

router.post('/register', loginLimiter, validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', loginLimiter, validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.get('/me', authenticateToken, (req, res, next) =>
  authController.me(req, res, next)
);

router.get('/demo-accounts', (req, res) =>
  authController.getDemoAccounts(req, res)
);

export default router;
