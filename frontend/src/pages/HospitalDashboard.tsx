import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BloodRequest, RequestMatch, Organization } from '../api/types';
import { EmergencyRequestModal } from '../components/EmergencyRequestModal';
import { MatchExplanationCard } from '../components/MatchExplanationCard';
import { OnChainVerificationBadge } from '../components/OnChainVerificationBadge';
import { StatCard } from '../components/StatCard';
import {
  HeartPulse,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  Activity,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const { user, organization, refreshProfile } = useAuth();

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [matches, setMatches] = useState<RequestMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.listRequests();
      setRequests(res.requests || []);
      if (res.requests && res.requests.length > 0 && !selectedRequest) {
        handleSelectRequest(res.requests[0]);
      }
    } catch (err: any) {
      console.error('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSelectRequest = async (req: BloodRequest) => {
    setSelectedRequest(req);
    setIsLoadingMatches(true);
    try {
      const res = await api.getRequestMatches(req.id);
      setMatches(res.matches || []);
    } catch (err: any) {
      console.error('Failed to load matches for request:', err);
      setMatches([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleFulfill = async (reqId: string) => {
    try {
      await api.fulfillRequest(reqId);
      setActionSuccessMsg('Request marked FULFILLED! Completed lifecycle loop on-chain.');
      await loadRequests();
      if (selectedRequest?.id === reqId) {
        const updated = await api.getRequestById(reqId);
        setSelectedRequest(updated.request);
      }
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Fulfillment error: ${err.message}`);
    }
  };

  const isVerified = organization?.verification_status === 'verified';

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
      case 'matching':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-bold uppercase animate-pulse">Matching Active</span>;
      case 'allocated':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Units Allocated</span>;
      case 'dispatched':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><Truck className="w-3 h-3" /> In Transit</span>;
      case 'fulfilled':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded uppercase">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Emergency CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-crimson-400 uppercase tracking-wider">Hospital Ward</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">{organization?.legal_name || 'City General Hospital'}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Emergency Blood Operations</span>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> On-Chain Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" /> Verification Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch cryptographically anchored emergency requests, view mathematical match rankings, and track blood deliveries.
          </p>
        </div>

        {/* PROMINENT CREATE EMERGENCY REQUEST BUTTON */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-crimson-600 hover:bg-crimson-500 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-lg shadow-crimson-900/50 flex items-center space-x-2.5 transition transform hover:scale-102 cursor-pointer border border-crimson-400/40"
          >
            <HeartPulse className="w-5 h-5 animate-pulse text-white" />
            <span className="text-sm tracking-wide uppercase">Create Emergency Request</span>
          </button>
        </div>
      </div>

      {/* Unaccredited Warning for Pending Hospitals */}
      {!isVerified && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300">Unaccredited Organization State (Security Intelligence Rule 3)</div>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              Your hospital license is pending verification. In demo mode, switch to the <strong>Administrator</strong> persona
              to approve your on-chain accreditation in <code>BloodBridgeRegistry.sol</code>. Requests created while unaccredited
              will trigger security intelligence alerts.
            </p>
          </div>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Requests"
          value={requests.filter((r) => r.status !== 'fulfilled' && r.status !== 'cancelled').length}
          subtitle="Real-time matching active"
          icon={Clock}
          variant="crimson"
        />
        <StatCard
          title="Units In Transit"
          value={
            requests
              .filter((r) => r.status === 'dispatched')
              .reduce((acc, curr) => acc + curr.units_requested, 0)
          }
          subtitle="Cold-chain delivery tracking"
          icon={Truck}
          variant="purple"
        />
        <StatCard
          title="Fulfilled Requests"
          value={requests.filter((r) => r.status === 'fulfilled').length}
          subtitle="Completed emergency lifecycles"
          icon={PackageCheck}
          variant="emerald"
        />
        <StatCard
          title="Ledger Integrity"
          value="100%"
          subtitle="All requests anchored to Ethereum"
          icon={ShieldCheck}
          variant="blue"
        />
      </div>

      {/* Main Two-Column Layout: Requests List & Ranked Match Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Requests List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-crimson-400" />
              <span>Hospital Blood Requests</span>
            </h2>
            <button
              onClick={loadRequests}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              title="Refresh requests"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
            {['all', 'open', 'allocated', 'dispatched', 'fulfilled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-2.5 py-1 rounded-md font-semibold capitalize transition ${
                  statusFilter === tab
                    ? 'bg-crimson-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No requests found in this category. Click <strong>Create Emergency Request</strong> above to start!
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredRequests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800/90 border-crimson-500/60 ring-1 ring-crimson-500/40'
                        : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-8 h-8 rounded-lg bg-crimson-600/20 border border-crimson-500/40 text-crimson-400 font-black text-xs flex items-center justify-center">
                          {req.blood_group}
                        </span>
                        <div>
                          <div className="font-bold text-white">
                            {req.units_requested} Units {req.component_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {req.destination_city}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">{getStatusBadge(req.status)}</div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between">
                      <OnChainVerificationBadge
                        requestHash={req.on_chain_request_hash}
                        txHash={req.on_chain_tx_hash}
                        status={req.status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Request Inspector & Ranked Matches (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRequest ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              {/* Header details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Request Inspection
                    </span>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {selectedRequest.units_requested} Units {selectedRequest.blood_group} ({selectedRequest.component_type.replace(/_/g, ' ')})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedRequest.notes || 'Emergency surgical requirement'}
                  </p>
                </div>

                {/* Fulfillment Action if dispatched */}
                {selectedRequest.status === 'dispatched' && (
                  <button
                    onClick={() => handleFulfill(selectedRequest.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-md flex items-center space-x-2 transition"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirm Reception & Fulfill</span>
                  </button>
                )}
              </div>

              {/* On-Chain Verification Block */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Blockchain Request Hash</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">BloodBridgeRequestManager.sol</span>
                </div>
                <div className="font-mono text-emerald-300 text-[11px] break-all bg-slate-900 p-2 rounded border border-slate-800">
                  {selectedRequest.on_chain_request_hash || 'Pending on-chain transaction...'}
                </div>
              </div>

              {/* Ranked Matches List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Explainable Ranked Matches</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Ranked by ABO/Rh compatibility, cold-storage inventory priority, proximity, and freshness.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{matches.length} candidates found</span>
                </div>

                {isLoadingMatches ? (
                  <div className="py-12 text-center text-slate-500 text-xs">Computing match rankings...</div>
                ) : matches.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                    No matching inventory batches or voluntary donors currently available for this blood group.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m, idx) => (
                      <MatchExplanationCard
                        key={m.id || idx}
                        match={m}
                        rank={idx + 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
              Select a blood request from the left list to view cryptographic details and ranked candidates.
            </div>
          )}
        </div>
      </div>

      {/* Create Emergency Request Modal */}
      <EmergencyRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newReq) => {
          loadRequests();
          handleSelectRequest(newReq);
          setActionSuccessMsg('Emergency request broadcasted and anchored to Ethereum!');
          setTimeout(() => setActionSuccessMsg(null), 5000);
        }}
        defaultCity={organization?.city || 'Metro City'}
      />
    </div>
  );
};
