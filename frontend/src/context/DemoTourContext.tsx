import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TourStep {
  step: number;
  title: string;
  role: 'admin' | 'hospital' | 'blood_bank' | 'donor' | 'volunteer';
  roleLabel: string;
  accountKey: string;
  path: string;
  description: string;
  actionHint: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: 'Hospital Verification on Blockchain',
    role: 'admin',
    roleLabel: 'Apex Health Administrator',
    accountKey: 'admin',
    path: '/admin',
    description: 'Verify unaccredited organizations. Admin verifies St. Jude Children Hospital on-chain.',
    actionHint: 'Click "Approve & Verify On-Chain" next to St. Jude Hospital to write accreditation into BloodBridgeRegistry.',
  },
  {
    step: 2,
    title: 'Blood Bank Batch Ingestion',
    role: 'blood_bank',
    roleLabel: 'Metro Regional Blood Bank',
    accountKey: 'blood_bank',
    path: '/blood-bank',
    description: 'Blood banks register tested units with batch numbers, collection dates, and cold-storage tags.',
    actionHint: 'View existing inventory or click "+ Register Batch" to add fresh units (e.g. O- Packed Red Cells).',
  },
  {
    step: 3,
    title: 'Donor Availability Confirmation',
    role: 'donor',
    roleLabel: 'Blood Donor (Alex Morgan)',
    accountKey: 'donor',
    path: '/donor',
    description: 'Voluntary donors confirm physical readiness, health screening consent, and location proximity.',
    actionHint: 'Toggle the "Ready to Donate" switch to update your real-time availability freshness score.',
  },
  {
    step: 4,
    title: 'Hospital Emergency Request Creation',
    role: 'hospital',
    roleLabel: 'City General Hospital (Emergency ICU)',
    accountKey: 'hospital',
    path: '/hospital',
    description: 'Emergency doctors create an urgent request with component type, urgency tier, and units.',
    actionHint: 'Click the crimson "Create Emergency Request" button. Fill in urgency level "emergency" and submit.',
  },
  {
    step: 5,
    title: 'Explainable Ranked Matching',
    role: 'hospital',
    roleLabel: 'City General Hospital',
    accountKey: 'hospital',
    path: '/hospital',
    description: 'The algorithmic matching engine evaluates blood compatibility, distance, inventory priority, and freshness.',
    actionHint: 'Click "View AI/Rule Explanation" on any candidate to inspect mathematical score weights and medical disclaimers.',
  },
  {
    step: 6,
    title: 'Smart Contract Request Hash Anchoring',
    role: 'hospital',
    roleLabel: 'City General Hospital',
    accountKey: 'hospital',
    path: '/hospital',
    description: 'Every emergency request anchors a cryptographic sha256 hash to BloodBridgeRequestManager on Ethereum.',
    actionHint: 'Inspect the on-chain verification badge showing the keccak256 request hash and Ethereum transaction hash.',
  },
  {
    step: 7,
    title: 'Blood Bank Unit Allocation',
    role: 'blood_bank',
    roleLabel: 'Metro Regional Blood Bank',
    accountKey: 'blood_bank',
    path: '/blood-bank',
    description: 'Blood bank reviews incoming hospital emergency requests and reserves verified inventory batches.',
    actionHint: 'Locate the pending request and click "Allocate Units" to lock inventory and trigger smart contract transition.',
  },
  {
    step: 8,
    title: 'Cold-Chain Dispatch & Transit',
    role: 'blood_bank',
    roleLabel: 'Metro Regional Blood Bank',
    accountKey: 'blood_bank',
    path: '/blood-bank',
    description: 'Courier departs with temperature-controlled blood container; status transitions to Dispatched.',
    actionHint: 'Click "Dispatch Shipment" to record courier handover and emit an on-chain Dispatched event.',
  },
  {
    step: 9,
    title: 'Hospital Delivery & Fulfillment',
    role: 'hospital',
    roleLabel: 'City General Hospital',
    accountKey: 'hospital',
    path: '/hospital',
    description: 'Emergency department receives and cross-matches units, marking the request fulfilled.',
    actionHint: 'Click "Confirm Reception & Fulfill" to close the lifecycle loop on-chain.',
  },
  {
    step: 10,
    title: 'Security Intelligence Detection',
    role: 'admin',
    roleLabel: 'Apex Health Administrator',
    accountKey: 'admin',
    path: '/admin',
    description: 'Rule-based security intelligence monitors for brute-force attacks, excessive scraping, or unaccredited calls.',
    actionHint: 'Observe the Security Incidents panel displaying flagged anomalies with IP, actor, and severity metadata.',
  },
  {
    step: 11,
    title: 'Audit Log & Merkle Tree Inspection',
    role: 'admin',
    roleLabel: 'Apex Health Administrator',
    accountKey: 'admin',
    path: '/admin',
    description: 'Every sensitive operation is logged into a tamper-evident sequential audit trail with canonical JSON serialization.',
    actionHint: 'Review the live audit log table showing structured events and security severity ratings.',
  },
  {
    step: 12,
    title: 'Blockchain Anchor & Cryptographic Verification',
    role: 'admin',
    roleLabel: 'Apex Health Administrator',
    accountKey: 'admin',
    path: '/admin',
    description: 'Admin anchors an unanchored audit log batch to BloodBridgeAuditAnchor.sol and runs tamper-proof verification.',
    actionHint: 'Click "Anchor Pending Batch to Blockchain", then click "Verify Tamper-Free Status" to recompute Merkle root live.',
  },
];

interface DemoTourContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  jumpToStep: (stepNumber: number) => void;
}

const DemoTourContext = createContext<DemoTourContextType | undefined>(undefined);

export const DemoTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(() => {
    return localStorage.getItem('bloodbridge_tour_active') === 'true';
  });
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    const saved = localStorage.getItem('bloodbridge_tour_step');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('bloodbridge_tour_active', isActive ? 'true' : 'false');
  }, [isActive]);

  useEffect(() => {
    localStorage.setItem('bloodbridge_tour_step', currentStepIndex.toString());
  }, [currentStepIndex]);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  const startTour = () => {
    setIsActive(true);
    setCurrentStepIndex(0);
  };

  const stopTour = () => {
    setIsActive(false);
  };

  const nextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const jumpToStep = (stepNumber: number) => {
    const idx = stepNumber - 1;
    if (idx >= 0 && idx < TOUR_STEPS.length) {
      setCurrentStepIndex(idx);
      setIsActive(true);
    }
  };

  return (
    <DemoTourContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        jumpToStep,
      }}
    >
      {children}
    </DemoTourContext.Provider>
  );
};

export const useDemoTour = () => {
  const ctx = useContext(DemoTourContext);
  if (!ctx) {
    throw new Error('useDemoTour must be used within a DemoTourProvider');
  }
  return ctx;
};
