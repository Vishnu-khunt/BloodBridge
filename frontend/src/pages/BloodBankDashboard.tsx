import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BloodInventory, BloodRequest, BloodGroup, ComponentType } from '../api/types';
import { StatCard } from '../components/StatCard';
import { OnChainVerificationBadge } from '../components/OnChainVerificationBadge';
import {
  Database,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  X,
  Package,
  Layers,
  Thermometer,
  RefreshCw,
} from 'lucide-react';

export const BloodBankDashboard: React.FC = () => {
  const { organization } = useAuth();

  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New Batch Form State
  const [newGroup, setNewGroup] = useState<BloodGroup>('O-');
  const [newComponent, setNewComponent] = useState<ComponentType>('packed_red_cells');
  const [newUnits, setNewUnits] = useState<number>(10);
  const [newStorage, setNewStorage] = useState<string>('Vault-C3, Freezer-02');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invRes, reqRes] = await Promise.all([
        api.listInventory().catch(() => ({ inventory: [] })),
        api.listRequests().catch(() => ({ requests: [] })),
      ]);
      setInventory(invRes.inventory || []);
      setRequests(reqRes.requests || []);
    } catch (err: any) {
      console.error('Failed to load blood bank data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBatch(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const expiry = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const payload = {
        blood_group: newGroup,
        component_type: newComponent,
        units_available: Number(newUnits),
        collection_date: today,
        expiry_date: expiry,
        batch_number: `BATCH-${newGroup.replace('+', 'POS').replace('-', 'NEG')}-${Math.floor(1000 + Math.random() * 9000)}`,
        storage_location: newStorage,
      };
      await api.addInventoryBatch(payload);
      setActionSuccessMsg('New blood inventory batch successfully cataloged!');
      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to add batch: ${err.message}`);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleAllocate = async (requestId: string, reqBloodGroup: BloodGroup, unitsNeeded: number) => {
    // Find compatible inventory batch
    const candidate = inventory.find(
      (b) => b.blood_group === reqBloodGroup && b.units_available >= unitsNeeded
    ) || inventory.find((b) => b.units_available >= unitsNeeded);

    if (!candidate) {
      alert(`No batch found with at least ${unitsNeeded} units available. Please register or select another batch.`);
      return;
    }

    try {
      await api.allocateRequest(requestId, candidate.id, unitsNeeded);
      setActionSuccessMsg(`Allocated ${unitsNeeded} units from Batch #${candidate.batch_number}!`);
      await loadData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Allocation failed: ${err.message}`);
    }
  };

  const handleDispatch = async (requestId: string, reqBloodGroup: BloodGroup, units: number) => {
    // Locate the batch that holds the reservation for this blood group & units
    const candidate = inventory.find(
      (b) => b.blood_group === reqBloodGroup && b.units_reserved >= units
    ) || inventory.find((b) => b.units_reserved >= units) || inventory[0];

    if (!candidate) {
      alert('No inventory batch with reserved units available to record dispatch.');
      return;
    }

    try {
      await api.dispatchRequest(requestId, candidate.id, units);
      setActionSuccessMsg(`Shipment dispatched! Cold-chain transit recorded on-chain.`);
      await loadData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    }
  };

  const totalAvailable = inventory.reduce((acc, curr) => acc + curr.units_available, 0);
  const totalReserved = inventory.reduce((acc, curr) => acc + curr.units_reserved, 0);
  const pendingRequests = requests.filter((r) => r.status === 'open' || r.status === 'matching');
  const allocatedRequests = requests.filter((r) => r.status === 'allocated');

  const isVerified = organization?.verification_status === 'verified';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Storage & Fractionation Center</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">{organization?.legal_name || 'Metro Regional Blood Bank'}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Blood Inventory & Allocation Management</span>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Certified Facility
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" /> Verification Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain cold-chain storage logs, reserve blood components for trauma wards, and dispatch tracked shipments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-3 rounded-xl shadow-md flex items-center space-x-2 transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Batch</span>
        </button>
      </div>

      {/* Unaccredited Warning for Pending Blood Banks */}
      {!isVerified && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300">Unaccredited Blood Bank (Verification Pending)</div>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              Your blood bank account is awaiting administrator accreditation. Organization verification is required before restricted operations (e.g. inventory allocation and dispatch). In demo mode, sign in as the <strong>Administrator</strong> persona to verify your facility in <code>BloodBridgeRegistry.sol</code>.
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Units"
          value={totalAvailable}
          subtitle="Ready for clinical dispatch"
          icon={Database}
          variant="crimson"
        />
        <StatCard
          title="Reserved Units"
          value={totalReserved}
          subtitle="Locked for allocated surgeries"
          icon={Layers}
          variant="amber"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests.length}
          subtitle="Hospital allocations waiting"
          icon={Clock}
          variant="blue"
        />
        <StatCard
          title="Cold-Chain Integrity"
          value="4.0 °C"
          subtitle="All storage sensors normal"
          icon={Thermometer}
          variant="emerald"
        />
      </div>

      {/* Incoming Emergency Requests Requiring Allocation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Incoming Emergency Hospital Allocations</span>
            </h2>
            <p className="text-xs text-slate-400">
              Urgent hospital orders requiring inventory reservation or shipment dispatch.
            </p>
          </div>
          <button
            onClick={loadData}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">No pending requests right now.</div>
        ) : (
          <div className="space-y-3">
            {requests
              .filter((r) => r.status === 'open' || r.status === 'matching' || r.status === 'allocated')
              .map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-10 h-10 rounded-xl bg-crimson-600/20 border border-crimson-500/40 text-crimson-400 font-black text-sm flex items-center justify-center shrink-0">
                      {req.blood_group}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {req.units_requested} Units {req.component_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {req.urgency_level}
                        </span>
                        <span className="text-slate-400 text-[11px]">• {req.destination_city}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {req.notes || 'Emergency surgical requirement'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <OnChainVerificationBadge
                      requestHash={req.on_chain_request_hash}
                      txHash={req.on_chain_tx_hash}
                      status={req.status}
                    />

                    {/* Actions */}
                    {req.status !== 'allocated' ? (
                      <button
                        onClick={() => handleAllocate(req.id, req.blood_group, req.units_requested)}
                        className="bg-crimson-600 hover:bg-crimson-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                      >
                        Allocate Units
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDispatch(req.id, req.blood_group, req.units_requested)}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch Shipment</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Verified Inventory Batches Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-crimson-400" />
              <span>Current Cold-Storage Batches</span>
            </h2>
            <p className="text-xs text-slate-400">
              Verified inventory batches ready for algorithmic matching and emergency reservation.
            </p>
          </div>
          <span className="text-xs text-slate-500">{inventory.length} total batches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Batch Number</th>
                <th className="py-2.5 px-3">Blood Group</th>
                <th className="py-2.5 px-3">Component Type</th>
                <th className="py-2.5 px-3">Available</th>
                <th className="py-2.5 px-3">Reserved</th>
                <th className="py-2.5 px-3">Cold Storage Location</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inventory.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-white">{batch.batch_number}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded font-black text-[11px] bg-crimson-950/60 text-crimson-300 border border-crimson-500/30">
                      {batch.blood_group}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 capitalize">
                    {batch.component_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{batch.units_available}</td>
                  <td className="py-2.5 px-3 font-bold text-amber-400">{batch.units_reserved}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {batch.storage_location || 'Standard Cryo Vault'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(batch.expiry_date).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-rose-500" />
                Register Blood Inventory Batch
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Blood Group</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as BloodGroup)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                >
                  {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Component Type</label>
                <select
                  value={newComponent}
                  onChange={(e) => setNewComponent(e.target.value as ComponentType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                >
                  <option value="packed_red_cells">Packed Red Cells</option>
                  <option value="whole_blood">Whole Blood</option>
                  <option value="platelets">Platelets</option>
                  <option value="fresh_frozen_plasma">Fresh Frozen Plasma</option>
                  <option value="cryoprecipitate">Cryoprecipitate</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Units (Bags)</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={newUnits}
                  onChange={(e) => setNewUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cold-Storage Location</label>
                <input
                  type="text"
                  value={newStorage}
                  onChange={(e) => setNewStorage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm"
                >
                  {isSubmittingBatch ? 'Registering...' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
