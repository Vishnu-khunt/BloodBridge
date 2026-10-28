import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, RegisterPayload } from '../api/types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  switchDemoAccount: (role: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS: Record<string, { email: string; pass: string; label: string; role: string }> = {
  admin: {
    email: 'admin@bloodbridge.demo',
    pass: 'AdminPassword123!',
    label: 'System Administrator (Apex Health Authority)',
    role: 'admin',
  },
  hospital: {
    email: 'hospital@citygeneral.demo',
    pass: 'HospitalPassword123!',
    label: 'Hospital (City General - Verified)',
    role: 'hospital',
  },
  hospital_pending: {
    email: 'hospital.pending@stjude.demo',
    pass: 'HospitalPassword123!',
    label: 'Hospital (St. Jude - Pending Verification)',
    role: 'hospital',
  },
  blood_bank: {
    email: 'bloodbank@redcross.demo',
    pass: 'BloodBankPassword123!',
    label: 'Blood Bank (Metro Regional Blood Bank)',
    role: 'blood_bank',
  },
  donor: {
    email: 'donor.alex@bloodbridge.demo',
    pass: 'DonorPassword123!',
    label: 'Blood Donor (Alex Morgan - O Negative)',
    role: 'donor',
  },
  volunteer: {
    email: 'volunteer.sam@bloodbridge.demo',
    pass: 'VolunteerPassword123!',
    label: 'Volunteer / NGO Coordinator (Sam Rivera)',
    role: 'volunteer',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      if (!api.getToken()) {
        setUser(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }
      const res = await api.getMe();
      setUser(res.user);
      setOrganization(res.organization);
    } catch (err) {
      console.error('[AuthContext] Failed to load session:', err);
      api.setToken(null);
      setToken(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      setToken(res.token);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setToken(res.token);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const switchDemoAccount = async (accountKey: string) => {
    const creds = DEMO_CREDENTIALS[accountKey];
    if (!creds) {
      throw new Error(`Unknown demo account key: ${accountKey}`);
    }
    await login(creds.email, creds.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isLoading,
        login,
        register,
        logout,
        switchDemoAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
