import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Unauthorized: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-black text-white">403 — Access Denied</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your current account role <code className="text-rose-400 font-bold">{user?.role || 'Guest'}</code> does
          not possess authorization to view this resource. BloodBridge enforces strict cryptographic and
          role-based access control.
        </p>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Your Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
