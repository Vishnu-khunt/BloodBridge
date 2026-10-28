import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoTour, TOUR_STEPS } from '../context/DemoTourContext';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { Compass, ArrowRight, ArrowLeft, CheckCircle2, X, RefreshCw } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { isActive, currentStep, currentStepIndex, nextStep, prevStep, stopTour, jumpToStep } = useDemoTour();
  const { user, switchDemoAccount } = useAuth();
  const navigate = useNavigate();

  if (!isActive) return null;

  const targetAccount = DEMO_CREDENTIALS[currentStep.accountKey];
  const isCorrectUser = user?.email === targetAccount?.email;

  const handleSwitchAndNavigate = async () => {
    try {
      if (!isCorrectUser) {
        await switchDemoAccount(currentStep.accountKey);
      }
      navigate(currentStep.path);
    } catch (err: any) {
      alert(`Could not switch persona: ${err.message}`);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 sticky top-16 z-30 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Step Info */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black shrink-0 shadow-sm">
            {currentStep.step}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-100 uppercase tracking-wider text-[11px]">
                Demo Walkthrough • Step {currentStep.step} of {TOUR_STEPS.length}
              </span>
              <span className="text-slate-400 font-medium">({currentStep.roleLabel})</span>
            </div>
            <div className="text-amber-200/90 font-medium mt-0.5">
              <span className="font-bold text-white">{currentStep.title}:</span> {currentStep.actionHint}
            </div>
          </div>
        </div>

        {/* Center / Right: Action & Navigation */}
        <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto justify-end">
          {!isCorrectUser ? (
            <button
              onClick={handleSwitchAndNavigate}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition hover:scale-102"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch to {currentStep.roleLabel}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Correct Persona Active
            </span>
          )}

          <div className="flex items-center space-x-1 pl-2 border-l border-amber-500/30">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="p-1 rounded hover:bg-amber-500/20 disabled:opacity-40 text-amber-200 transition"
              title="Previous Step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <select
              value={currentStep.step}
              onChange={(e) => jumpToStep(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-amber-500/30 text-amber-200 text-xs rounded px-2 py-1 focus:outline-hidden"
            >
              {TOUR_STEPS.map((s) => (
                <option key={s.step} value={s.step}>
                  {s.step}. {s.title}
                </option>
              ))}
            </select>

            <button
              onClick={nextStep}
              disabled={currentStepIndex === TOUR_STEPS.length - 1}
              className="p-1 rounded hover:bg-amber-500/20 disabled:opacity-40 text-amber-200 transition"
              title="Next Step"
            >
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={stopTour}
              className="p-1 rounded hover:bg-amber-500/20 text-amber-300 ml-1 transition"
              title="Dismiss Demo Banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
