import React, { useState } from 'react';
import { BloodGroup, ComponentType, UrgencyLevel } from '../api/types';
import { api } from '../api/client';
import { AlertTriangle, ShieldCheck, HeartPulse, X, CheckCircle2 } from 'lucide-react';

interface EmergencyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdRequest: any) => void;
  defaultCity?: string;
}

export const EmergencyRequestModal: React.FC<EmergencyRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCity = 'Metro City',
}) => {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [componentType, setComponentType] = useState<ComponentType>('packed_red_cells');
  const [unitsRequested, setUnitsRequested] = useState<number>(3);
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('emergency');
  const [destinationCity, setDestinationCity] = useState<string>(defaultCity);
  const [clinicalNotes, setClinicalNotes] = useState<string>('Acute trauma shock - emergency resuscitation');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        bloodGroup,
        componentType,
        unitsRequested: Number(unitsRequested),
        urgencyLevel,
        destinationCity,
        notes: clinicalNotes,
      };

      const res = await api.createEmergencyRequest(payload);
      onSuccess(res.request);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch emergency request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-crimson-600/40 rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-crimson-600/20 border border-crimson-500/40 flex items-center justify-center text-crimson-500">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Create Emergency Blood Request
              </h2>
              <p className="text-xs text-slate-400">
                Instantly queries ranked inventory and notifies eligible voluntary donors.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zero PII & Security Banner */}
        <div className="mt-4 p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-start space-x-2 text-xs text-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Privacy Guarantee:</span> The patient reference is
            cryptographically hashed before ledger submission. No patient name or medical history is exposed to
            the blockchain.
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/50 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Blood Group & Component Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Required Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
              >
                {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => (
                  <option key={bg} value={bg}>
                    {bg} {bg === 'O-' ? '(Universal RBC Donor)' : bg === 'AB+' ? '(Universal Plasma Donor)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Component Type</label>
              <select
                value={componentType}
                onChange={(e) => setComponentType(e.target.value as ComponentType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
              >
                <option value="packed_red_cells">Packed Red Blood Cells (PRBC)</option>
                <option value="whole_blood">Whole Blood</option>
                <option value="platelets">Platelets (Random / Single Donor)</option>
                <option value="fresh_frozen_plasma">Fresh Frozen Plasma (FFP)</option>
                <option value="cryoprecipitate">Cryoprecipitate</option>
              </select>
            </div>
          </div>

          {/* Units & Urgency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Units Requested (Units / Bags)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={unitsRequested}
                onChange={(e) => setUnitsRequested(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Urgency Level</label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
              >
                <option value="emergency">Emergency (&lt; 30 mins, highest priority)</option>
                <option value="critical">Critical (&lt; 2 hours)</option>
                <option value="urgent">Urgent (&lt; 6 hours)</option>
                <option value="routine">Routine Elective (&lt; 24 hours)</option>
              </select>
            </div>
          </div>

          {/* City / Destination */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Destination City / Facility</label>
            <input
              type="text"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Clinical Indication / Triage Notes</label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-crimson-500 focus:outline-hidden"
              placeholder="e.g. ICU Bed 4, cardiac bypass or acute trauma resuscitation..."
            />
          </div>

          {/* Medical Legal Disclaimer */}
          <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-lg text-[11px] text-amber-200/90 leading-relaxed">
            <span className="font-bold text-amber-400">Clinical Disclaimer:</span> BloodBridge provides
            logistical screening and candidate ranking. Formal laboratory ABO/Rh cross-matching and compatibility
            testing must be completed by clinical staff prior to any transfusion.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-crimson-600 hover:bg-crimson-500 text-white font-bold rounded-lg shadow-lg shadow-crimson-900/40 flex items-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Broadcasting to Chain...</span>
              ) : (
                <>
                  <HeartPulse className="w-4 h-4" />
                  <span>Broadcast Emergency Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
