import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { ShieldCheck, HeartPulse, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, switchDemoAccount } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Please enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        if (err.details && Array.isArray(err.details)) {
          const mapped: Record<string, string> = {};
          err.details.forEach((d) => {
            mapped[d.field] = d.message;
          });
          setFieldErrors(mapped);
        }
      } else {
        setErrorMsg(err.message || 'Incorrect email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (key: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      await switchDemoAccount(key);
      const targetRole = DEMO_CREDENTIALS[key].role;
      if (targetRole === 'admin') navigate('/admin');
      else if (targetRole === 'hospital') navigate('/hospital');
      else if (targetRole === 'blood_bank') navigate('/blood-bank');
      else if (targetRole === 'donor') navigate('/donor');
      else if (targetRole === 'volunteer') navigate('/volunteer');
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo account login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-crimson-600/10 border border-crimson-500/30 text-crimson-500 mb-3 shadow-lg shadow-crimson-950/50">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Sign in to Blood<span className="text-crimson-500">Bridge</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Decentralized blood logistics with cryptographic integrity and explainable matching
          </p>
        </div>

        {/* 1-Click Quick Demo Presets */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Evaluator 1-Click Demo Personas</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Select a preconfigured role to test real permissions and blockchain interactions:
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {Object.entries(DEMO_CREDENTIALS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleQuickDemo(key)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-slate-200 transition flex items-center justify-between group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.email}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Standard Email/Password Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs" noValidate>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="name@example.com"
                  className={`w-full bg-slate-800 border ${
                    fieldErrors.email ? 'border-rose-500' : 'border-slate-700'
                  } rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-slate-800 border ${
                    fieldErrors.password ? 'border-rose-500' : 'border-slate-700'
                  } rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden`}
                  required
                />
              </div>
              {fieldErrors.password && (
                <p className="text-rose-400 text-[11px] mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg shadow-md shadow-crimson-950/50 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-crimson-400 hover:underline font-semibold">
              Register as Donor or Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
