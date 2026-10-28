import {
  UserRole,
  OrgType,
  OrgStatus,
  BloodGroup,
  ComponentType,
  UrgencyLevel,
  RequestStatus,
  InventoryStatus,
  SeverityLevel,
  AlertStatus,
} from '../config/constants';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  user_id: string;
  org_type: OrgType;
  legal_name: string;
  license_number: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: OrgStatus;
  eth_address: string | null;
  verified_by: string | null;
  verified_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DonorProfile {
  id: string;
  user_id: string;
  blood_group: BloodGroup;
  gender: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  last_donation_date: string | null;
  is_available: boolean;
  availability_confirmed_at: Date | null;
  emergency_contact_consent: boolean;
  city: string;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface BloodInventory {
  id: string;
  blood_bank_id: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  units_available: number;
  units_reserved: number;
  collection_date: string;
  expiry_date: string;
  storage_location: string | null;
  batch_number: string;
  status: InventoryStatus;
  created_at: Date;
  updated_at: Date;
}

export interface BloodRequest {
  id: string;
  hospital_id: string;
  patient_ref_hash: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  units_requested: number;
  urgency_level: UrgencyLevel;
  destination_city: string;
  destination_lat: number | null;
  destination_lng: number | null;
  status: RequestStatus;
  on_chain_request_hash: string | null;
  on_chain_tx_hash: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RequestMatch {
  id: string;
  request_id: string;
  match_type: 'inventory' | 'donor';
  target_id: string;
  match_score: number;
  distance_km: number | null;
  explanation_json: {
    reasons: string[];
    breakdown: Record<string, any>;
    medicalDisclaimer: string;
  };
  status: 'suggested' | 'contacted' | 'reserved' | 'declined' | 'fulfilled';
  created_at: Date;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  severity: SeverityLevel;
  batch_id: string | null;
  created_at: Date;
}

export interface SecurityAlert {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: SeverityLevel;
  actor_id: string | null;
  ip_address: string | null;
  description: string;
  metadata: Record<string, any>;
  status: AlertStatus;
  investigated_by: string | null;
  resolution_notes: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  orgId?: string;
  orgStatus?: OrgStatus;
}
