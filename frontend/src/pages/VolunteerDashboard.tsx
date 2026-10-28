import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import {
  Users,
  HeartPulse,
  Megaphone,
  MapPin,
  Calendar,
  CheckCircle2,
  TrendingDown,
  PlusCircle,
  X,
  Target,
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  targetGroup: string;
  location: string;
  time: string;
  description: string;
  status: 'Recruiting Donors' | 'Planned' | 'Active Today';
}

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [inventoryStats, setInventoryStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Community Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      title: 'Metro Tech Park Universal Donor Drive',
      targetGroup: 'O- and A-',
      location: 'North Tech Hub, Building 4',
      time: 'Tomorrow, 09:00 - 17:00',
      description: 'Focusing on O- and A- negative donors with on-site rapid hemoglobin and vitals screening.',
      status: 'Recruiting Donors',
    },
    {
      id: '2',
      title: 'City University Youth Donation Camp',
      targetGroup: 'Whole Blood (All Groups)',
      location: 'Student Union Auditorium',
      time: 'This Saturday, 10:00 - 16:00',
      description: 'Student council collaboration for whole blood and apheresis platelet education.',
      status: 'Planned',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetGroup, setNewTargetGroup] = useState('O- Negative Emergency');
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('Upcoming Weekend, 10:00 - 18:00');
  const [newDescription, setNewDescription] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    api.listInventory()
      .then((res) => {
        const counts: Record<string, number> = {
          'O-': 0,
          'O+': 0,
          'A-': 0,
          'A+': 0,
          'B-': 0,
          'B+': 0,
          'AB-': 0,
          'AB+': 0,
        };
        (res.inventory || []).forEach((b) => {
          if (counts[b.blood_group] !== undefined) {
            counts[b.blood_group] += b.units_available;
          }
        });
        setInventoryStats(Object.entries(counts).map(([group, count]) => ({ group, count })));
      })
      .catch(() => setInventoryStats([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Campaign = {
      id: Date.now().toString(),
      title: newTitle || 'Community Emergency Blood Drive',
      targetGroup: newTargetGroup,
      location: newLocation || 'Central Municipal Center',
      time: newTime,
      description: newDescription || 'Targeted voluntary drive to replenish depleted regional reserves.',
      status: 'Recruiting Donors',
    };
    setCampaigns([created, ...campaigns]);
    setIsModalOpen(false);
    setSuccessBanner(`Awareness drive "${created.title}" successfully launched! Voluntary notification dispatched.`);
    setTimeout(() => setSuccessBanner(null), 5000);

    // Reset form
    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Community Outreach</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">Volunteer / NGO Coordinator ({user?.full_name})</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Regional Donor Mobilization & Deficit Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track regional blood reserve deficits, mobilize targeted voluntary donor groups, and coordinate awareness drives.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-md flex items-center space-x-2 transition shrink-0 cursor-pointer"
        >
          <Megaphone className="w-4 h-4" />
          <span>Launch Urgent Donor Drive</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Voluntary Donors"
          value="1,420"
          subtitle="Regional pool ready"
          icon={Users}
          variant="emerald"
        />
        <StatCard
          title="Critical Shortage Group"
          value="O Negative"
          subtitle="Reserves below 24h threshold"
          icon={TrendingDown}
          variant="crimson"
        />
        <StatCard
          title="Awareness Campaigns"
          value={`${campaigns.length} Active`}
          subtitle="Universities & Tech Parks"
          icon={Megaphone}
          variant="amber"
        />
        <StatCard
          title="Community Turnout Rate"
          value="78%"
          subtitle="Up 12% this quarter"
          icon={HeartPulse}
          variant="purple"
        />
      </div>

      {/* Regional Deficit Monitor by Blood Group */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-crimson-400" />
              <span>Real-Time Regional Inventory Sufficiency</span>
            </h2>
            <p className="text-xs text-slate-400">
              Aggregated across all certified regional blood banks. Groups below 15 units require active mobilization.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          {inventoryStats.map(({ group, count }) => {
            const isDeficit = count < 10;
            return (
              <div
                key={group}
                className={`p-3.5 rounded-xl border text-center transition ${
                  isDeficit
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="text-lg font-black">{group}</div>
                <div className="text-2xl font-black mt-1 text-white">{count}</div>
                <div className="text-[10px] uppercase font-bold tracking-wider mt-1">
                  {isDeficit ? (
                    <span className="text-rose-400">Critical Deficit</span>
                  ) : (
                    <span className="text-emerald-400">Adequate</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Community Campaigns */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Scheduled Community Mobilization Drives</span>
          </h2>
          <span className="text-xs text-slate-500">{campaigns.length} campaigns scheduled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2 hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{camp.title}</span>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  {camp.status}
                </span>
              </div>
              <p className="text-slate-400">{camp.description}</p>
              <div className="flex items-center gap-1.5 text-amber-300/90 font-medium text-[11px]">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Target: {camp.targetGroup}</span>
              </div>
              <div className="text-slate-400 flex items-center gap-2 text-[11px] pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{camp.location}</span>
                <span>•</span>
                <span>{camp.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Launch Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                Launch Urgent Donor Mobilization Drive
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Metro Trauma Center Emergency Drive"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Blood Group / Component</label>
                <select
                  value={newTargetGroup}
                  onChange={(e) => setNewTargetGroup(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                >
                  <option value="O- Universal RBC Donor">O- Negative (Universal Red Blood Cells)</option>
                  <option value="AB+ Universal Plasma">AB+ Positive (Universal Plasma)</option>
                  <option value="Platelets Single Donor (All Groups)">Platelets (Random / Single Donor)</option>
                  <option value="All Blood Groups">All ABO / Rh Groups Welcome</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Venue / Venue Address</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. North Square Community Hall"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Date & Time</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Campaign Objective / Instructions</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief volunteer instructions or donor screening guidelines..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden"
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
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition"
                >
                  Dispatch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
