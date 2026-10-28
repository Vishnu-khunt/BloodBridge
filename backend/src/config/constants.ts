export const USER_ROLES = [
  'donor',
  'hospital',
  'blood_bank',
  'admin',
  'volunteer',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORG_TYPES = ['hospital', 'blood_bank'] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_STATUSES = ['pending', 'verified', 'rejected', 'revoked'] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const COMPONENT_TYPES = [
  'whole_blood',
  'packed_red_cells',
  'platelets',
  'fresh_frozen_plasma',
  'cryoprecipitate',
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const URGENCY_LEVELS = ['routine', 'urgent', 'critical', 'emergency'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const URGENCY_LEVEL_NUMERIC: Record<UrgencyLevel, number> = {
  routine: 1,
  urgent: 2,
  critical: 3,
  emergency: 4,
};

export const REQUEST_STATUSES = [
  'open',
  'matching',
  'allocated',
  'dispatched',
  'fulfilled',
  'cancelled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const INVENTORY_STATUSES = [
  'available',
  'reserved',
  'quarantined',
  'expired',
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const SEVERITY_LEVELS = ['info', 'warning', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const ALERT_STATUSES = ['open', 'investigating', 'dismissed', 'resolved'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const MEDICAL_DISCLAIMER =
  'NOTICE: BloodBridge software matching algorithms provide logistical coordination recommendations only. Biological compatibility, Rh/ABO cross-matching, antibody screening, and clinical eligibility must be verified by licensed medical professionals and transfusion laboratory specialists prior to clinical administration.';
