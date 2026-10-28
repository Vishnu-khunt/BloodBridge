export type UserRole = 'donor' | 'hospital' | 'blood_bank' | 'admin' | 'volunteer';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type ComponentType =
  | 'whole_blood'
  | 'packed_red_cells'
  | 'platelets'
  | 'fresh_frozen_plasma'
  | 'cryoprecipitate';

export type UrgencyLevel = 'routine' | 'urgent' | 'critical' | 'emergency';

export type RequestStatus =
  | 'open'
  | 'matching'
  | 'allocated'
  | 'dispatched'
  | 'fulfilled'
  | 'cancelled';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  legal_name?: string;
  license_number?: string;
  address?: string;
  city?: string;
  blood_group?: BloodGroup;
  gender?: string;
  date_of_birth?: string;
  weight_kg?: number;
  emergency_contact_consent?: boolean;
}

export interface Organization {
  id: string;
  user_id: string;
  org_type: 'hospital' | 'blood_bank';
  legal_name: string;
  license_number: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked';
  eth_address?: string | null;
  rejection_reason?: string | null;
  verified_at?: string | null;
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
  availability_confirmed_at: string | null;
  emergency_contact_consent: boolean;
  city: string;
  latitude: number | null;
  longitude: number | null;
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
  status: 'available' | 'reserved' | 'quarantined' | 'expired';
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
  created_at: string;
  updated_at: string;
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
    breakdown: {
      compatibilityScore: number;
      inventoryPriorityBonus: number;
      proximityScore: number;
      freshnessScore: number;
      urgencyBonus: number;
    };
    medicalDisclaimer: string;
    details?: any;
  };
  status: 'suggested' | 'contacted' | 'reserved' | 'declined' | 'fulfilled';
}

export interface SecurityAlert {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'critical';
  actor_id: string | null;
  ip_address: string | null;
  description: string;
  metadata: Record<string, any>;
  status: 'open' | 'investigating' | 'dismissed' | 'resolved';
  created_at: string;
  resolution_notes?: string | null;
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
  severity: 'info' | 'warning' | 'critical';
  batch_id: string | null;
  created_at: string;
}

export interface BlockchainStatus {
  network: string;
  rpcUrl: string;
  isConnected: boolean;
  relayerAddress: string | null;
  contracts: {
    BloodBridgeRegistry: string;
    BloodBridgeRequestManager: string;
    BloodBridgeAuditAnchor: string;
  };
  recentTransactions: any[];
}
