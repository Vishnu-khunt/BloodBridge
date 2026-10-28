import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BloodGroup, UserRole, RegisterPayload } from '../api/types';
import { ApiError } from '../api/client';
import {
  HeartPulse,
  ShieldAlert,
  Building2,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Role State
  const [role, setRole] = useState<'donor' | 'hospital' | 'blood_bank' | 'volunteer'>('donor');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Donor specific fields
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [city, setCity] = useState('');
  const [consent, setConsent] = useState(true);

  // Organization & Volunteer fields
  const [legalName, setLegalName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Full Name
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.full_name = 'Please enter your full legal name.';
    }

    // 2. Email
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    // 3. Phone (Optional, but if provided must be 7-15 digits)
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      const validPhoneFormat = /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim());
      if (!validPhoneFormat || digits.length < 7 || digits.length > 15) {
        errors.phone =
          'Enter a valid phone number, including the appropriate country code if required.';
      }
    }

    // 4. Password & Confirm Password
    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (password !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match.';
    }

    // 5. Role-specific validation
    if (role === 'donor') {
      if (!city.trim() || city.trim().length < 2) {
        errors.city = 'Please enter your city/region.';
      }
      if (!consent) {
        errors.consent = 'Consent is required to receive urgent blood request notifications.';
      }
    } else if (role === 'hospital' || role === 'blood_bank') {
      if (!legalName.trim() || legalName.trim().length < 2) {
        errors.legal_name = `Please enter the ${role === 'hospital' ? 'hospital' : 'blood bank'} name.`;
      }
      if (!licenseNumber.trim() || licenseNumber.trim().length < 2) {
        errors.license_number = 'Please enter the state license or registration number.';
      }
      if (!address.trim() || address.trim().length < 3) {
        errors.address = 'Please enter the facility address.';
      }
      if (!city.trim() || city.trim().length < 2) {
        errors.city = 'Please enter the city.';
      }
    } else if (role === 'volunteer') {
      if (!city.trim() || city.trim().length < 2) {
        errors.city = 'Please enter your city/region.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload: RegisterPayload = {
        email: email.trim().toLowerCase(),
        password,
        role: role as UserRole,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        city: city.trim(),
        emergency_contact_consent: consent,
      };

      if (role === 'donor') {
        payload.blood_group = bloodGroup;
      } else if (role === 'hospital' || role === 'blood_bank') {
        payload.legal_name = legalName.trim();
        payload.license_number = licenseNumber.trim();
        payload.address = address.trim();
      } else if (role === 'volunteer') {
        if (legalName.trim()) {
          payload.legal_name = legalName.trim();
        }
      }

      await register(payload);

      setSuccessMsg('Account registered successfully! Redirecting to your dashboard...');

      setTimeout(() => {
        if (role === 'donor') navigate('/donor');
        else if (role === 'hospital') navigate('/hospital');
        else if (role === 'blood_bank') navigate('/blood-bank');
        else navigate('/volunteer');
      }, 1000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
        if (err.details && Array.isArray(err.details)) {
          const mapped: Record<string, string> = {};
          err.details.forEach((d) => {
            mapped[d.field] = d.message;
          });
          setFieldErrors((prev) => ({ ...prev, ...mapped }));
        }
      } else {
        setGeneralError(err.message || 'Registration failed. Please check your information and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-crimson-600/10 border border-crimson-500/30 text-crimson-500 mb-3 shadow-lg shadow-crimson-950/50">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Create BloodBridge Account</h2>
          <p className="mt-1 text-xs text-slate-400">
            Join the smart decentralized network as a donor, healthcare facility, or volunteer
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          {generalError && (
            <div className="mb-4 p-3.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{generalError}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
            {/* Role Selection */}
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Select Your Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('donor');
                    setFieldErrors({});
                  }}
                  className={`p-3 rounded-lg border text-left flex items-start space-x-2 transition cursor-pointer ${
                    role === 'donor'
                      ? 'bg-crimson-950/40 border-crimson-500 text-white ring-1 ring-crimson-500/40'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4 text-crimson-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Blood Donor</div>
                    <div className="text-[10px] text-slate-400">Voluntary life-saving donor</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('hospital');
                    setFieldErrors({});
                  }}
                  className={`p-3 rounded-lg border text-left flex items-start space-x-2 transition cursor-pointer ${
                    role === 'hospital'
                      ? 'bg-blue-950/40 border-blue-500 text-white ring-1 ring-blue-500/40'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Hospital</div>
                    <div className="text-[10px] text-slate-400">Emergency & surgical ward</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('blood_bank');
                    setFieldErrors({});
                  }}
                  className={`p-3 rounded-lg border text-left flex items-start space-x-2 transition cursor-pointer ${
                    role === 'blood_bank'
                      ? 'bg-rose-950/40 border-rose-500 text-white ring-1 ring-rose-500/40'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Blood Bank</div>
                    <div className="text-[10px] text-slate-400">Storage & fractionation center</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('volunteer');
                    setFieldErrors({});
                  }}
                  className={`p-3 rounded-lg border text-left flex items-start space-x-2 transition cursor-pointer ${
                    role === 'volunteer'
                      ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500/40'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Volunteer / NGO</div>
                    <div className="text-[10px] text-slate-400">Community mobilization</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Anti-elevation Security Notice */}
            <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                System administrator accounts cannot be self-registered. Healthcare facility accounts require
                authorized administrator verification on the blockchain.
              </span>
            </div>

            {/* Common User Info: Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {role === 'hospital' || role === 'blood_bank'
                    ? "Authorized Contact Person's Name *"
                    : 'Full Legal Name *'}
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.full_name) {
                        setFieldErrors((prev) => ({ ...prev, full_name: '' }));
                      }
                    }}
                    placeholder={
                      role === 'hospital' || role === 'blood_bank'
                        ? 'e.g. Dr. Jordan Lee'
                        : 'e.g. Alex Morgan'
                    }
                    className={`w-full bg-slate-800 border ${
                      fieldErrors.full_name ? 'border-rose-500' : 'border-slate-700'
                    } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                  />
                </div>
                {fieldErrors.full_name && (
                  <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => ({ ...prev, phone: '' }));
                      }
                    }}
                    placeholder="e.g. +91 9876543210 or +1-555-0100"
                    className={`w-full bg-slate-800 border ${
                      fieldErrors.phone ? 'border-rose-500' : 'border-slate-700'
                    } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  placeholder="name@example.com"
                  className={`w-full bg-slate-800 border ${
                    fieldErrors.email ? 'border-rose-500' : 'border-slate-700'
                  } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="Min 8 characters"
                    className={`w-full bg-slate-800 border ${
                      fieldErrors.password ? 'border-rose-500' : 'border-slate-700'
                    } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirm_password) {
                        setFieldErrors((prev) => ({ ...prev, confirm_password: '' }));
                      }
                    }}
                    placeholder="Re-enter password"
                    className={`w-full bg-slate-800 border ${
                      fieldErrors.confirm_password ? 'border-rose-500' : 'border-slate-700'
                    } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                  />
                </div>
                {fieldErrors.confirm_password && (
                  <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.confirm_password}</p>
                )}
              </div>
            </div>

            {/* ROLE CONDITIONAL: DONOR */}
            {role === 'donor' && (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Blood Group *</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
                    >
                      {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => (
                        <option key={bg} value={bg}>
                          {bg} {bg === 'O-' ? '(Universal RBC)' : bg === 'AB+' ? '(Universal Plasma)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">City / Region *</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (fieldErrors.city) {
                            setFieldErrors((prev) => ({ ...prev, city: '' }));
                          }
                        }}
                        placeholder="e.g. Mumbai, New York"
                        className={`w-full bg-slate-800 border ${
                          fieldErrors.city ? 'border-rose-500' : 'border-slate-700'
                        } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                      />
                    </div>
                    {fieldErrors.city && (
                      <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.city}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-start space-x-2 text-slate-300 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-crimson-600 focus:ring-crimson-500 mt-0.5"
                    />
                    <span>
                      I consent to receive emergency blood-request notifications within my geographic region *
                    </span>
                  </label>
                  {fieldErrors.consent && (
                    <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.consent}</p>
                  )}
                </div>
              </div>
            )}

            {/* ROLE CONDITIONAL: HOSPITAL OR BLOOD BANK */}
            {(role === 'hospital' || role === 'blood_bank') && (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-[11px] text-blue-200 leading-relaxed">
                  <span className="font-bold text-blue-300">Accreditation Notice:</span> Healthcare
                  organizations register with a <code className="text-white">pending</code> verification status.
                  An authorized administrator must verify the license on <code>BloodBridgeRegistry.sol</code>{' '}
                  prior to inventory allocation or emergency dispatch.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {role === 'hospital' ? 'Hospital Legal Name *' : 'Blood Bank Name *'}
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => {
                          setLegalName(e.target.value);
                          if (fieldErrors.legal_name) {
                            setFieldErrors((prev) => ({ ...prev, legal_name: '' }));
                          }
                        }}
                        placeholder={
                          role === 'hospital'
                            ? 'e.g. St. Luke Memorial Hospital'
                            : 'e.g. Metro Regional Blood Center'
                        }
                        className={`w-full bg-slate-800 border ${
                          fieldErrors.legal_name ? 'border-rose-500' : 'border-slate-700'
                        } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                      />
                    </div>
                    {fieldErrors.legal_name && (
                      <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.legal_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      State License / Accreditation ID *
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => {
                          setLicenseNumber(e.target.value);
                          if (fieldErrors.license_number) {
                            setFieldErrors((prev) => ({ ...prev, license_number: '' }));
                          }
                        }}
                        placeholder="e.g. HOSP-2026-904"
                        className={`w-full bg-slate-800 border ${
                          fieldErrors.license_number ? 'border-rose-500' : 'border-slate-700'
                        } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                      />
                    </div>
                    {fieldErrors.license_number && (
                      <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.license_number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Facility Address *</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (fieldErrors.address) {
                          setFieldErrors((prev) => ({ ...prev, address: '' }));
                        }
                      }}
                      placeholder="e.g. 500 Healthcare Blvd, Suite 2"
                      className={`w-full bg-slate-800 border ${
                        fieldErrors.address ? 'border-rose-500' : 'border-slate-700'
                      } rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                    />
                    {fieldErrors.address && (
                      <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">City / Region *</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (fieldErrors.city) {
                            setFieldErrors((prev) => ({ ...prev, city: '' }));
                          }
                        }}
                        placeholder="e.g. New York, Mumbai"
                        className={`w-full bg-slate-800 border ${
                          fieldErrors.city ? 'border-rose-500' : 'border-slate-700'
                        } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                      />
                    </div>
                    {fieldErrors.city && (
                      <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.city}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ROLE CONDITIONAL: VOLUNTEER / NGO */}
            {role === 'volunteer' && (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Organization / NGO Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. Youth Red Cross Society"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">City / Region *</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (fieldErrors.city) {
                            setFieldErrors((prev) => ({ ...prev, city: '' }));
                          }
                        }}
                        placeholder="e.g. Metro City, Delhi"
                        className={`w-full bg-slate-800 border ${
                          fieldErrors.city ? 'border-rose-500' : 'border-slate-700'
                        } rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                      />
                    </div>
                    {fieldErrors.city && (
                      <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.city}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg shadow-md shadow-crimson-950/50 transition flex items-center justify-center space-x-2 cursor-pointer mt-4"
            >
              <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-crimson-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
