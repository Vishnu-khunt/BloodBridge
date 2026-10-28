import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Copy, Check } from 'lucide-react';

interface OnChainVerificationBadgeProps {
  requestHash: string | null;
  txHash: string | null;
  status: string;
}

export const OnChainVerificationBadge: React.FC<OnChainVerificationBadgeProps> = ({
  requestHash,
  txHash,
  status,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!requestHash) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
        Off-chain pending
      </span>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded-lg">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="font-semibold text-[11px]">On-Chain Verified</span>

      <span className="text-slate-600">|</span>

      {/* Request Hash */}
      <button
        onClick={() => copyToClipboard(requestHash, 'hash')}
        className="font-mono text-[10px] text-slate-300 hover:text-white flex items-center gap-0.5"
        title={`Request Hash: ${requestHash}`}
      >
        <span>Hash: {requestHash.slice(0, 6)}...{requestHash.slice(-4)}</span>
        {copied === 'hash' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
      </button>

      {/* Tx Hash */}
      {txHash && (
        <>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => copyToClipboard(txHash, 'tx')}
            className="font-mono text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
            title={`Transaction: ${txHash}`}
          >
            <span>Tx: {txHash.slice(0, 6)}...</span>
            {copied === 'tx' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <ExternalLink className="w-2.5 h-2.5" />}
          </button>
        </>
      )}
    </div>
  );
};
