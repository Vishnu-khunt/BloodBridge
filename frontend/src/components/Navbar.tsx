import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { useDemoTour } from '../context/DemoTourContext';
import { api } from '../api/client';
import { BlockchainStatus } from '../api/types';
import { Activity, ShieldCheck, ShieldAlert, LogOut, Compass, ChevronDown, CheckCircle2, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, organization, logout, switchDemoAccount } = useAuth();
  const { isActive, startTour, stopTour, currentStep } = useDemoTour();
  const navigate = useNavigate();

  const [bcStatus, setBcStatus] = useState<BlockchainStatus | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showBcModal, setShowBcModal] = useState(false);

  useEffect(() => {
    api.getBlockchainStatus()
      .then(setBcStatus)
      .catch(() => setBcStatus(null));
  }, []);

  const handleSwitchAccount = async (key: string) => {
    try {
      await switchDemoAccount(key);
      setShowAccountMenu(false);
      const targetRole = DEMO_CREDENTIALS[key].role;
      if (targetRole === 'admin') navigate('/admin');
      else if (targetRole === 'hospital') navigate('/hospital');
      else if (targetRole === 'blood_bank') navigate('/blood-bank');
      else if (targetRole === 'donor') navigate('/donor');
      else if (targetRole === 'volunteer') navigate('/volunteer');
    } catch (err: any) {
      alert(`Error switching account: ${err.message}`);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">System Admin</span>;
      case 'hospital':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">Hospital</span>;
      case 'blood_bank':
        return <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-rose-200">Blood Bank</span>;
      case 'donor':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">Blood Donor</span>;
      case 'volunteer':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">Volunteer/NGO</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-crimson-600 flex items-center justify-center shadow-md shadow-crimson-900/50 group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-xl leading-none">B</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Blood<span className="text-crimson-500">Bridge</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                  Smart Blockchain Blood Network
                </span>
              </div>
            </Link>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            {/* Blockchain Status Pill */}
            <button
              onClick={() => setShowBcModal(true)}
              className="hidden md:flex items-center space-x-2 text-xs py-1.5 px-3 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
              title="Click to view smart contract deployment details"
            >
              <span className={`w-2 h-2 rounded-full ${bcStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-medium">
                {bcStatus?.isConnected ? 'Local Blockchain Connected' : 'Connecting Chain...'}
              </span>
            </button>

            {/* Guided Demo Tour Toggle */}
            <button
              onClick={() => (isActive ? stopTour() : startTour())}
              className={`flex items-center space-x-1.5 text-xs py-1.5 px-3 rounded-full font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${isActive ? 'animate-spin' : ''}`} />
              <span>{isActive ? `Demo Active (Step ${currentStep.step}/12)` : 'Guided Demo Tour'}</span>
            </button>

            {/* Fast Demo Account Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center space-x-1.5 text-xs py-1.5 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <span>Switch Demo User</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Switch 1-Click Demo Persona
                  </div>
                  {Object.entries(DEMO_CREDENTIALS).map(([key, item]) => {
                    const isSelected = user?.email === item.email;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSwitchAccount(key)}
                        className={`w-full text-left px-3 py-2 flex items-start justify-between hover:bg-slate-800 transition ${
                          isSelected ? 'bg-slate-800/80 text-white font-medium' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{item.label}</span>
                          <span className="text-[10px] text-slate-400">{item.email}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Info & Accreditation */}
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="hidden lg:flex flex-col text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs font-semibold text-white">{user.full_name}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  {organization && (
                    <div className="flex items-center gap-1 justify-end text-[11px] text-slate-400">
                      <span>{organization.legal_name}</span>
                      {organization.verification_status === 'verified' ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[10px] font-medium">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-amber-400 text-[10px] font-medium">
                          <ShieldAlert className="w-3 h-3" /> {organization.verification_status}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 text-white px-3 py-1.5 rounded-md transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Blockchain Details Modal */}
      {showBcModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-crimson-500" />
              Smart Contract Deployment Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              BloodBridge operates on an Ethereum-compatible local chain. All state transitions, organization
              verifications, and emergency request hashes are immutably registered on-chain.
            </p>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 font-medium">Network</div>
                <div className="text-emerald-400 font-mono mt-0.5">
                  {bcStatus?.network || 'Hardhat Localhost (Chain ID: 31337)'}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2">
                <div className="text-slate-400 font-medium">Deployed Smart Contracts</div>

                <div>
                  <div className="text-slate-300 font-semibold">1. BloodBridgeRegistry</div>
                  <div className="text-slate-400 font-mono text-[11px] truncate">
                    {bcStatus?.contracts?.BloodBridgeRegistry || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}
                  </div>
                </div>

                <div>
                  <div className="text-slate-300 font-semibold">2. BloodBridgeRequestManager</div>
                  <div className="text-slate-400 font-mono text-[11px] truncate">
                    {bcStatus?.contracts?.BloodBridgeRequestManager || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'}
                  </div>
                </div>

                <div>
                  <div className="text-slate-300 font-semibold">3. BloodBridgeAuditAnchor</div>
                  <div className="text-slate-400 font-mono text-[11px] truncate">
                    {bcStatus?.contracts?.BloodBridgeAuditAnchor || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 font-medium">Backend Relayer Address</div>
                <div className="text-slate-300 font-mono text-[11px] truncate">
                  {bcStatus?.relayerAddress || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowBcModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg font-medium transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
