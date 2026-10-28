import {
  User,
  RegisterPayload,
  Organization,
  DonorProfile,
  BloodInventory,
  BloodRequest,
  RequestMatch,
  SecurityAlert,
  AuditLog,
  BlockchainStatus,
} from './types';

export class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, status: number, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const BASE_URL = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('bloodbridge_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bloodbridge_token', token);
    } else {
      localStorage.removeItem('bloodbridge_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (_networkErr) {
      throw new ApiError(
        'Unable to connect to the server. Check that the backend is running and try again.',
        0
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let message = data.message || data.error;
      if (!message) {
        if (response.status === 401) message = 'Incorrect email or password.';
        else if (response.status === 403) message = 'Access denied.';
        else if (response.status === 404) message = 'Resource not found.';
        else if (response.status === 409) {
          message = 'An account with this email already exists. Please sign in or use another email.';
        } else {
          message = `HTTP ${response.status}`;
        }
      }

      if (response.status === 401 || response.status === 403) {
        if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
          console.warn('[ApiClient] Auth check failed:', message);
        }
      }

      throw new ApiError(message, response.status, data.details);
    }

    return data as T;
  }

  // --- Auth ---
  async login(credentials: { email: string; password: string }) {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(res.token);
    return res;
  }

  async register(payload: RegisterPayload) {
    const res = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request<{ user: User; organization: Organization | null }>('/auth/me');
  }

  async getDemoAccounts() {
    return this.request<{ notice: string; accounts: any[] }>('/auth/demo-accounts');
  }

  logout() {
    this.setToken(null);
  }

  // --- Organizations ---
  async getMyOrg() {
    return this.request<{ organization: Organization }>('/organizations/me');
  }

  async listOrganizations(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ organizations: Organization[]; count: number }>(`/organizations${query}`);
  }

  async verifyOrganization(id: string) {
    return this.request<{ message: string; organization: Organization }>(`/organizations/${id}/verify`, {
      method: 'POST',
    });
  }

  async revokeOrganization(id: string, reason: string) {
    return this.request<{ message: string; organization: Organization }>(`/organizations/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Donor ---
  async getDonorProfile() {
    return this.request<{ profile: DonorProfile }>('/donors/profile');
  }

  async updateDonorProfile(profile: Partial<DonorProfile>) {
    return this.request<{ message: string; profile: DonorProfile }>('/donors/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  async toggleAvailability(isAvailable: boolean) {
    return this.request<{ message: string; profile: DonorProfile }>('/donors/availability', {
      method: 'POST',
      body: JSON.stringify({ isAvailable }),
    });
  }

  // --- Inventory ---
  async listInventory() {
    return this.request<{ inventory: BloodInventory[]; count: number }>('/inventory');
  }

  async addInventoryBatch(batch: any) {
    return this.request<{ message: string; batch: BloodInventory }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  }

  // --- Emergency Requests ---
  async createEmergencyRequest(payload: any) {
    return this.request<{
      message: string;
      request: BloodRequest;
      matches: RequestMatch[];
      onChainTxHash: string;
    }>('/requests/emergency', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listRequests(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ requests: BloodRequest[]; count: number }>(`/requests${query}`);
  }

  async getRequestById(id: string) {
    return this.request<{ request: BloodRequest }>(`/requests/${id}`);
  }

  async getRequestMatches(id: string) {
    return this.request<{ matches: RequestMatch[]; count: number }>(`/requests/${id}/matches`);
  }

  async allocateRequest(requestId: string, inventoryId: string, units: number) {
    return this.request<{ message: string; request: BloodRequest; reservationId: string }>(
      `/requests/${requestId}/allocate`,
      {
        method: 'POST',
        body: JSON.stringify({ inventoryId, units }),
      }
    );
  }

  async dispatchRequest(requestId: string, inventoryId: string, units: number) {
    return this.request<{ message: string; request: BloodRequest }>(`/requests/${requestId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ inventoryId, units }),
    });
  }

  async fulfillRequest(requestId: string) {
    return this.request<{ message: string; request: BloodRequest }>(`/requests/${requestId}/fulfill`, {
      method: 'POST',
    });
  }

  async cancelRequest(requestId: string, reason: string) {
    return this.request<{ message: string; request: BloodRequest }>(`/requests/${requestId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Admin Security & Audit ---
  async getSecurityAlerts(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ alerts: SecurityAlert[]; count: number }>(`/admin/security/alerts${query}`);
  }

  async updateAlertStatus(id: string, status: string, notes?: string) {
    return this.request<{ message: string; alert: SecurityAlert }>(`/admin/security/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async getAuditLogs(params?: { eventType?: string; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    if (params?.eventType) q.append('eventType', params.eventType);
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.offset) q.append('offset', params.offset.toString());
    return this.request<{ logs: AuditLog[]; total: number }>(`/admin/audit/logs?${q.toString()}`);
  }

  async anchorAuditBatch() {
    return this.request<{
      message: string;
      batchId: string;
      rootHash: string;
      logCount: number;
      txHash: string;
    }>('/admin/audit/anchor-batch', { method: 'POST' });
  }

  async verifyAuditBatch(batchId: string) {
    return this.request<{
      isTamperFree: boolean;
      batchId: string;
      logCount: number;
      storedRootHash: string;
      recomputedRootHash: string;
      onChainAnchor: any | null;
      disclaimer: string;
    }>(`/admin/audit/verify/${batchId}`);
  }

  // --- Blockchain Status ---
  async getBlockchainStatus() {
    return this.request<BlockchainStatus>('/blockchain/status');
  }
}

export const api = new ApiClient();
