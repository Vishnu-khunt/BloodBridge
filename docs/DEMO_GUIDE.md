# BloodBridge — College Evaluator & Demo Presentation Guide

**Project Name**: BloodBridge: A Smart Blockchain Network to Reduce Blood Shortage  
**Degree**: Bachelor of Technology (B.Tech) Capstone Project  
**Platform**: Ethereum Solidity Smart Contracts + Node.js/Express + PostgreSQL / PGlite + React/Vite/Tailwind  
**Workspace**: `D:\Adit\Blockchain`  

---

## 1. Executive Summary for Evaluators

BloodBridge solves two critical bottlenecks in healthcare supply chains:
1. **Critical Latency in Blood Routing**: Emergency wards struggle to locate compatible blood components in real-time, often resorting to manual calling or fragmented registries.
2. **Data Tampering & Counterfeiting**: Unaccredited clinics, illegal blood distribution, and modified audit trails compromise patient safety.

BloodBridge combines **on-chain decentralized authorization and audit anchoring** with a **high-performance, privacy-preserving off-chain matching and reservation engine**.

---

## 2. Pre-Configured Demo Personas

All accounts are pre-seeded with reproducible fictional test data. Evaluators can switch between personas with 1-click in the UI header.

| Persona / Organization | Email | Password | Role | On-Chain Verification |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator**<br>(Apex Health Authority) | `admin@bloodbridge.demo` | `AdminPassword123!` | `admin` | Contract Deployer / Master Relayer |
| **City General Hospital**<br>(Emergency Trauma Center) | `hospital@citygeneral.demo` | `HospitalPassword123!` | `hospital` | **Verified** on `BloodBridgeRegistry.sol` |
| **St. Jude Children Hospital**<br>(Unaccredited / Pending) | `hospital.pending@stjude.demo` | `HospitalPassword123!` | `hospital` | **Pending** (Demonstrates Rule 3 security alert) |
| **Metro Regional Blood Bank**<br>(Cryo Storage Center) | `bloodbank@redcross.demo` | `BloodBankPassword123!` | `blood_bank` | **Verified** on `BloodBridgeRegistry.sol` |
| **Voluntary Donor (Alex Morgan)**<br>(Universal RBC O-) | `donor.alex@bloodbridge.demo` | `DonorPassword123!` | `donor` | Active in local matching pool |
| **Volunteer / NGO Coordinator**<br>(Sam Rivera) | `volunteer.sam@bloodbridge.demo` | `VolunteerPassword123!` | `volunteer` | Regional mobilization access |

---

## 3. The 12-Step Guided Live Demonstration

The UI includes a persistent **Guided Demo Tour** banner at the top of the screen that tracks and assists evaluators through the exact 12-step sequence.

### Step 1: Hospital On-Chain Accreditation
- **Role**: System Administrator (`admin@bloodbridge.demo`)
- **Page**: `/admin`
- **Action**: In the *Healthcare Organization Verification Queue*, locate **St. Jude Children Hospital** (status: *Pending Approval*).
- **Execution**: Click **"Approve & Verify On-Chain"**.
- **Result**: The backend invokes `BloodBridgeRegistry.sol.verifyOrganization()`. The smart contract emits an `OrganizationVerified` event, and the status switches to **Verified On-Chain**.

### Step 2: Blood Bank Cold-Storage Batch Ingestion
- **Role**: Blood Bank (`bloodbank@redcross.demo`)
- **Page**: `/blood-bank`
- **Action**: Click **"+ Register New Batch"**.
- **Execution**: Select Blood Group `O-`, Component `Packed Red Blood Cells (PRBC)`, Units `15`, Storage Location `CryoVault-9, Tier-A`.
- **Result**: The batch is saved with a unique batch number. Available units immediately update across all real-time inventory dashboards.

### Step 3: Donor Availability Confirmation
- **Role**: Blood Donor (`donor.alex@bloodbridge.demo`)
- **Page**: `/donor`
- **Action**: Toggle the **"Readiness Status"** switch to *Active*.
- **Execution**: Clicking updates the `availability_confirmed_at` timestamp.
- **Result**: The algorithmic matching engine grants up to **+15 freshness points** to donors confirmed within the last 24 hours.

### Step 4: Hospital Emergency Blood Request
- **Role**: Hospital (`hospital@citygeneral.demo`)
- **Page**: `/hospital`
- **Action**: Click the prominent crimson **"Create Emergency Request"** button.
- **Execution**: Request `3` units of `O-` Packed Red Cells for *Emergency ICU Trauma*.
- **Result**: The backend generates a sha256 pseudonymized hash (`patient_ref_hash`), ensuring zero PII on-chain.

### Step 5: Explainable Ranked Matching
- **Role**: Hospital (`hospital@citygeneral.demo`)
- **Page**: `/hospital`
- **Action**: Inspect the newly generated request in the *Hospital Blood Requests* list.
- **Execution**: Click **"Explain Why This Match Ranked"** on Candidate #1.
- **Result**: View the mathematical score breakdown:
  - ABO/Rh Compatibility: 100 pts
  - Inventory Priority Bonus: +25 pts (certified stock prioritizes immediate infusion)
  - Proximity Score: Euclidean / Haversine distance weighting
  - Freshness Score: Real-time confirmation bonus
  - Clinical Disclaimer: Explicit notice that laboratory cross-matching is mandatory.

### Step 6: Blockchain Anchoring of Emergency Request
- **Role**: Hospital (`hospital@citygeneral.demo`)
- **Page**: `/hospital`
- **Action**: Inspect the **On-Chain Verification Badge**.
- **Result**: Shows the keccak256 request hash (`0x...`) anchored to `BloodBridgeRequestManager.sol` and the Ethereum transaction hash.

### Step 7: Blood Bank Unit Allocation
- **Role**: Blood Bank (`bloodbank@redcross.demo`)
- **Page**: `/blood-bank`
- **Action**: Locate the hospital's incoming emergency request.
- **Execution**: Click **"Allocate Units"**.
- **Result**: 3 units transition from *Available* to *Reserved* in the selected batch. The smart contract transitions status from `Open` to `Allocated`.

### Step 8: Cold-Chain Shipment Dispatch
- **Role**: Blood Bank (`bloodbank@redcross.demo`)
- **Page**: `/blood-bank`
- **Action**: Click **"Dispatch Shipment"**.
- **Execution**: Records courier handover and cold-storage seals.
- **Result**: Status transitions to `Dispatched` (`In Transit`) on both the off-chain ledger and `BloodBridgeRequestManager.sol`.

### Step 9: Hospital Delivery Confirmation & Fulfillment
- **Role**: Hospital (`hospital@citygeneral.demo`)
- **Page**: `/hospital`
- **Action**: Locate the dispatched request.
- **Execution**: Click **"Confirm Reception & Fulfill"**.
- **Result**: The hospital verifies component integrity and marks the request `Fulfilled`. The on-chain lifecycle is closed immutably.

### Step 10: Security Threat Intelligence Detection
- **Role**: System Administrator (`admin@bloodbridge.demo`)
- **Page**: `/admin`
- **Action**: Inspect the *Automated Security Intelligence Detection* panel.
- **Execution**: Review detected anomaly flags:
  - **Rule 1**: High-frequency search queries from a single actor (anti-scraping).
  - **Rule 2**: Consecutive failed authentication attempts (brute-force defense).
  - **Rule 3**: Unaccredited organization attempting privileged operations.

### Step 11: Tamper-Evident Audit Trail
- **Role**: System Administrator (`admin@bloodbridge.demo`)
- **Page**: `/admin`
- **Action**: Scroll to the *Tamper-Evident Audit Trail* table.
- **Result**: Every sensitive action is serialized with canonical key sorting and stored with sequential hashes.

### Step 12: Cryptographic Anchor & Tamper-Free Verification
- **Role**: System Administrator (`admin@bloodbridge.demo`)
- **Page**: `/admin`
- **Action**:
  1. Click **"Anchor Batch to Blockchain"**: Writes the Merkle root hash of unanchored logs to `BloodBridgeAuditAnchor.sol`.
  2. Click **"Verify Tamper-Free"**: Recomputes the Merkle tree from raw records live and compares against the smart contract anchor.
- **Result**: The verification banner displays:
  **"Tamper-Free Verification PASSED: Zero Modifications Detected"**, proving mathematical integrity.

---

