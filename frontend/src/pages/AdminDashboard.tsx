import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Organization, SecurityAlert, AuditLog, BlockchainStatus } from '../api/types';
import { StatCard } from '../components/StatCard';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Database,
  Link as LinkIcon,
  CheckCircle2,
  Lock,
  Search,
  Activity,
  Layers,
  RefreshCw,
  Cpu,
  FileCheck2,
  FileX2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bcStatus, setBcStatus] = useState<BlockchainStatus | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Audit Verification state
  const [verifyingBatchId, setVerifyingBatchId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isAnchoring, setIsAnchoring] = useState<boolean>(false);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [orgRes, alertRes, auditRes, bcRes] = await Promise.all([
        api.listOrganizations().catch(() => ({ organizations: [] })),
        api.getSecurityAlerts().catch(() => ({ alerts: [] })),
        api.getAuditLogs({ limit: 15 }).catch(() => ({ logs: [] })),
        api.getBlockchainStatus().catch(() => null),
      ]);
      setOrgs(orgRes.organizations || []);
      setAlerts(alertRes.alerts || []);
      setAuditLogs(auditRes.logs || []);
      setBcStatus(bcRes);
    } catch (err: any) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleVerifyOrg = async (orgId: string, orgName: string) => {
    try {
      const res = await api.verifyOrganization(orgId);
      setActionNotice(`Verified ${orgName} on-chain! BloodBridgeRegistry.sol updated.`);
      await loadAll();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  const handleRevokeOrg = async (orgId: string, orgName: string) => {
    const reason = prompt(`Enter revocation reason for ${orgName}:`, 'Regulatory audit failure');
    if (!reason) return;
    try {
      await api.revokeOrganization(orgId, reason);
      setActionNotice(`Revoked accreditation for ${orgName} on-chain.`);
      await loadAll();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const handleUpdateAlertStatus = async (alertId: string, status: string) => {
    try {
      await api.updateAlertStatus(alertId, status, 'Updated by system administrator in incident console');
      setActionNotice(`Security alert status updated to ${status.toUpperCase()}`);
      await loadAll();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Failed to update alert: ${err.message}`);
    }
  };

  const handleAnchorAuditBatch = async () => {
    setIsAnchoring(true);
    try {
      const res = await api.anchorAuditBatch();
      setActionNotice(
        `Anchored ${res.logCount} audit logs! Root: ${res.rootHash.slice(0, 16)}... Tx: ${res.txHash.slice(0, 16)}...`
      );
      await loadAll();
      setTimeout(() => setActionNotice(null), 7000);
    } catch (err: any) {
      alert(`Anchor batch failed: ${err.message}`);
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleVerifyIntegrity = async (batchId: string) => {
    setVerifyingBatchId(batchId);
    setVerificationResult(null);
    try {
      const res = await api.verifyAuditBatch(batchId);
      setVerificationResult(res);
    } catch (err: any) {
      alert(`Verification calculation failed: ${err.message}`);
    }
  };

  const pendingOrgs = orgs.filter((o) => o.verification_status === 'pending');
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Apex Health Authority</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">System Administrator ({user?.email})</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Governance, Security & Blockchain Audit</span>
            <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-950/40 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" /> Full Root Privileges
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authorize healthcare facilities in the smart contract registry, monitor threat intelligence, and anchor tamper-proof audit trails.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleAnchorAuditBatch}
            disabled={isAnchoring}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer text-xs"
          >
            <Cpu className="w-4 h-4" />
            <span>{isAnchoring ? 'Writing to Chain...' : 'Anchor Batch to Blockchain'}</span>
          </button>

          <button
            onClick={loadAll}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-purple-950/50 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Accreditations"
          value={pendingOrgs.length}
          subtitle="Awaiting on-chain verification"
          icon={ShieldAlert}
          variant="amber"
        />
        <StatCard
          title="Security Incidents"
          value={alerts.length}
          subtitle={`${criticalAlerts.length} critical severity flags`}
          icon={AlertTriangle}
          variant={criticalAlerts.length > 0 ? 'crimson' : 'slate'}
        />
        <StatCard
          title="Audit Trail Logs"
          value={auditLogs.length}
          subtitle="Sequential sha256 records"
          icon={Database}
          variant="blue"
        />
        <StatCard
          title="Registry Smart Contract"
          value={bcStatus?.isConnected ? 'Online' : 'Simulated'}
          subtitle="BloodBridgeRegistry.sol"
          icon={LinkIcon}
          variant="emerald"
        />
      </div>

      {/* SECTION 1: Organization Verification Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Healthcare Organization Verification Queue</span>
            </h2>
            <p className="text-xs text-slate-400">
              Hospitals and blood banks must be verified on <code>BloodBridgeRegistry.sol</code> before executing privileged operations.
            </p>
          </div>
          <span className="text-xs text-slate-500">{orgs.length} total registered facilities</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Organization Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">License Number</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">On-Chain Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-white">{org.legal_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{org.eth_address || 'Ethereum address pending'}</div>
                  </td>
                  <td className="py-2.5 px-3 capitalize text-slate-300">{org.org_type.replace('_', ' ')}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{org.license_number}</td>
                  <td className="py-2.5 px-3">{org.city}</td>
                  <td className="py-2.5 px-3">
                    {org.verification_status === 'verified' ? (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 uppercase">
                        Verified On-Chain
                      </span>
                    ) : org.verification_status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-950/60 text-amber-300 border border-amber-500/40 uppercase animate-pulse">
                        Pending Approval
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-950/60 text-rose-300 border border-rose-500/40 uppercase">
                        {org.verification_status}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {org.verification_status === 'pending' ? (
                      <button
                        onClick={() => handleVerifyOrg(org.id, org.legal_name)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition"
                      >
                        Approve & Verify On-Chain
                      </button>
                    ) : org.verification_status === 'verified' ? (
                      <button
                        onClick={() => handleRevokeOrg(org.id, org.legal_name)}
                        className="bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 px-2.5 py-1 rounded text-[11px] transition"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Security Intelligence Incidents */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Automated Security Intelligence Detection</span>
            </h2>
            <p className="text-xs text-slate-400">
              Rule 1 (High-frequency searches), Rule 2 (Brute-force credentials), and Rule 3 (Unaccredited privileged calls).
            </p>
          </div>
          <span className="text-xs text-slate-500">{alerts.length} incidents recorded</span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">No active security alerts. System is normal.</div>
        ) : (
          <div className="space-y-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start space-x-3">
                  <span
                    className={`px-2 py-0.5 rounded font-black text-[10px] uppercase mt-0.5 shrink-0 ${
                      al.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : al.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {al.severity}
                  </span>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{al.rule_name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">[{al.rule_id}]</span>
                    </div>
                    <div className="text-slate-300 text-xs mt-0.5">{al.description}</div>
                    <div className="text-slate-500 text-[10px] font-mono mt-1">
                      Actor: {al.actor_id || 'Anonymous'} • IP: {al.ip_address || '127.0.0.1'} • {new Date(al.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                    {al.status}
                  </span>
                  <div className="flex items-center space-x-1.5 mt-1.5 justify-end">
                    {al.status !== 'investigating' && al.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateAlertStatus(al.id, 'investigating')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                      >
                        Investigate
                      </button>
                    )}
                    {al.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateAlertStatus(al.id, 'resolved')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Cryptographic Audit Trail & Blockchain Anchor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span>Tamper-Evident Audit Trail & Blockchain Merkle Anchor</span>
            </h2>
            <p className="text-xs text-slate-400">
              Every sensitive action is serialized with canonical key sorting and anchored to <code>BloodBridgeAuditAnchor.sol</code>.
            </p>
          </div>

          <button
            onClick={handleAnchorAuditBatch}
            disabled={isAnchoring}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Anchor Current Batch to Chain</span>
          </button>
        </div>

        {/* Verification Inspector Card */}
        {verificationResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              verificationResult.isTamperFree
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {verificationResult.isTamperFree ? (
                <>
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">Tamper-Free Verification PASSED: Zero Modifications Detected</span>
                </>
              ) : (
                <>
                  <FileX2 className="w-5 h-5 text-rose-400" />
                  <span className="text-white">Tamper Detected: Stored Hash does NOT match Recomputed Hash!</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono mt-2">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                <span className="text-slate-400 block">Stored Canonical Root Hash:</span>
                <span className="text-white break-all">{verificationResult.storedRootHash}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                <span className="text-slate-400 block">Live Recomputed Root Hash:</span>
                <span className="text-emerald-300 break-all">{verificationResult.recomputedRootHash}</span>
              </div>
            </div>

            {verificationResult.onChainAnchor && (
              <div className="text-[11px] text-slate-300 pt-1">
                Smart Contract Confirmation: Root anchor confirmed on Ethereum by relayer{' '}
                <span className="font-mono text-purple-300">{verificationResult.onChainAnchor.submittingAddress}</span>.
              </div>
            )}
          </div>
        )}

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Actor / Role</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3">Batch ID / State</th>
                <th className="py-2.5 px-3 text-right">Integrity Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-2 px-3 font-bold text-white font-sans">{log.event_type}</td>
                  <td className="py-2 px-3 text-slate-400">{log.resource_type}</td>
                  <td className="py-2 px-3 text-slate-300">
                    {log.actor_role || 'system'} ({log.ip_address || '127.0.0.1'})
                  </td>
                  <td className="py-2 px-3 text-slate-400 max-w-xs truncate" title={JSON.stringify(log.details)}>
                    {JSON.stringify(log.details)}
                  </td>
                  <td className="py-2 px-3">
                    {log.batch_id ? (
                      <span className="text-emerald-400 text-[10px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {log.batch_id.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[10px] font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        Pending Next Anchor
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-sans">
                    {log.batch_id ? (
                      <button
                        onClick={() => handleVerifyIntegrity(log.batch_id!)}
                        className="bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs px-2.5 py-1 rounded transition border border-purple-500/30"
                      >
                        Verify Tamper-Free
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Unanchored</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
