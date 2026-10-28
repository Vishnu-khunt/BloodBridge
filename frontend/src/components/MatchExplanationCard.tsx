import React, { useState } from 'react';
import { RequestMatch } from '../api/types';
import { ShieldCheck, ChevronDown, ChevronUp, MapPin, Database, UserCheck, AlertCircle, Sparkles } from 'lucide-react';

interface MatchExplanationCardProps {
  match: RequestMatch;
  rank: number;
  onAllocate?: (targetId: string) => void;
  isAllocating?: boolean;
}

export const MatchExplanationCard: React.FC<MatchExplanationCardProps> = ({
  match,
  rank,
  onAllocate,
  isAllocating = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isInventory = match.match_type === 'inventory';

  const score = Math.round(match.match_score);
  const explanation = match.explanation_json;

  return (
    <div
      className={`border rounded-xl p-4 transition-all ${
        rank === 1
          ? 'bg-slate-900/90 border-crimson-500/50 shadow-md shadow-crimson-950/30'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Rank, Type, Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
              rank === 1
                ? 'bg-crimson-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            #{rank}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                {isInventory ? (
                  <>
                    <Database className="w-4 h-4 text-rose-400" />
                    <span>Verified Blood Bank Inventory</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Voluntary Active Donor</span>
                  </>
                )}
              </span>

              {isInventory && (
                <span className="bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded font-semibold uppercase">
                  Immediate Allocation
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {match.distance_km != null ? `${match.distance_km.toFixed(1)} km away` : 'Proximity calculated'}
              </span>
              <span>•</span>
              <span className="text-slate-300 font-mono text-[11px]">ID: {match.target_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Score Ring / Pill */}
        <div className="text-right flex flex-col items-end">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-lg font-black ${
                score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {score}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Match Score</span>
        </div>
      </div>

      {/* Primary Reason Tags */}
      {explanation?.reasons && explanation.reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {explanation.reasons.slice(0, 3).map((r, i) => (
            <span
              key={i}
              className="text-[11px] bg-slate-800/80 border border-slate-700/60 text-slate-300 px-2.5 py-0.5 rounded-full"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Expand / Collapse Explanation breakdown */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-crimson-400" />
          <span>{isExpanded ? 'Hide Algorithmic Breakdown' : 'Explain Why This Match Ranked'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {isInventory && onAllocate && (
          <button
            onClick={() => onAllocate(match.target_id)}
            disabled={isAllocating}
            className="text-xs bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            {isAllocating ? 'Allocating...' : 'Allocate from Batch'}
          </button>
        )}
      </div>

      {/* Detailed Mathematical Explanation View */}
      {isExpanded && explanation && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>Score Composition Breakdown</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">ABO/Rh Compatibility</div>
              <div className="font-mono text-emerald-400 font-bold mt-0.5">
                {explanation.breakdown?.compatibilityScore ?? 0} pts
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">Inventory Priority Bonus</div>
              <div className="font-mono text-rose-400 font-bold mt-0.5">
                +{explanation.breakdown?.inventoryPriorityBonus ?? 0} pts
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">Proximity / Distance</div>
              <div className="font-mono text-blue-400 font-bold mt-0.5">
                {explanation.breakdown?.proximityScore != null
                  ? explanation.breakdown.proximityScore.toFixed(1)
                  : '0.0'}{' '}
                pts
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">Freshness Confirmation</div>
              <div className="font-mono text-amber-400 font-bold mt-0.5">
                {explanation.breakdown?.freshnessScore ?? 0} pts
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">Urgency Multiplier</div>
              <div className="font-mono text-purple-400 font-bold mt-0.5">
                +{explanation.breakdown?.urgencyBonus ?? 0} pts
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400">Final Aggregated Score</div>
              <div className="font-mono text-white font-bold mt-0.5">{score} / 100</div>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/30 text-[10px] text-amber-200/90 leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Mandatory Clinical Notice:</span>{' '}
              {explanation.medicalDisclaimer ||
                'This algorithmic score is for logistical screening only. Clinical laboratory cross-matching is legally mandatory prior to transfusion.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
