# BloodBridge: A Smart Blockchain Network to Reduce Blood Shortage

[![Solidity Contracts](https://img.shields.io/badge/Solidity-0.8.28-363636.svg)](contracts/)
[![Hardhat Tests](https://img.shields.io/badge/Hardhat%20Tests-34%20Passing-brightgreen.svg)](contracts/)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-44%20Passing-brightgreen.svg)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-blue.svg)](frontend/)

**BloodBridge** is a decentralized healthcare logistics and cryptographic integrity platform designed to eliminate emergency blood shortages, prevent data counterfeiting, and provide real-time, explainable matching between trauma wards, blood banks, and voluntary donors.

Developed as a B.Tech capstone project to demonstrate blockchain-based blood inventory coordination, emergency request management, and tamper-evident audit logging.

---

## Key Capabilities

1. **Decentralized Healthcare Accreditation**: `BloodBridgeRegistry.sol` immutably verifies hospitals and blood banks, preventing unauthorized clinics or intermediaries from injecting uninspected blood products into the network.
2. **Dedicated Emergency Blood Request Experience**: A prominent crimson CTA allows trauma surgeons to broadcast urgent requests with zero personal identifiable information (PII) on-chain.
3. **Explainable Algorithmic Matching**: Evaluates blood group compatibility (including red blood cells vs plasma inversion), cold-storage inventory priority (+25 pts), Euclidean/Haversine proximity, and real-time donor confirmation freshness.
4. **Cold-Chain Lifecycle Tracking**: `BloodBridgeRequestManager.sol` enforces authorized state transitions from `Open` $\rightarrow$ `Allocated` $\rightarrow$ `Dispatched` $\rightarrow$ `Fulfilled`.
5. **Real-Time Threat Intelligence**: Detects bulk scraping (Rule 1), brute-force authentication attacks (Rule 2), and unaccredited operations (Rule 3).
6. **Tamper-Evident Blockchain Audit Anchoring**: `BloodBridgeAuditAnchor.sol` anchors sequential Merkle roots of audit logs to Ethereum, enabling live verification of zero off-chain database tampering.
7. **12-Step Guided Live Demo Walkthrough**: Interactive UI banner guiding evaluators step-by-step through the entire clinical workflow with 1-click persona switching.

---

## Technology Stack

- **Smart Contracts**: Solidity `^0.8.28`, Hardhat, Ethers.js v6, OpenZeppelin Contracts.
- **Backend**: Node.js, Express, TypeScript (strict mode), Zod validation, Bcrypt password hashing, JSON Web Tokens (JWT).
- **Database**: PostgreSQL with `pg` driver + embedded PGlite for self-contained, zero-setup testing.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons, React Router v6.
- **Colors**: Crisp white (`#FFFFFF`), Deep navy (`#0F172A`), Crimson accent (`#E11D48`).

---

## Pre-Configured Demo Accounts

Evaluators can click any preset on the Login screen to switch immediately to that role:

| Role | Name / Facility | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | Apex Health Authority | `admin@bloodbridge.demo` | `AdminPassword123!` | On-chain verification, security alerts, audit anchoring |
| **Hospital** | City General Hospital | `hospital@citygeneral.demo` | `HospitalPassword123!` | Verified; emergency request creation, match viewing, fulfillment |
| **Hospital (Pending)** | St. Jude Children Hospital | `hospital.pending@stjude.demo` | `HospitalPassword123!` | Pending verification; tests Rule 3 security alert |
| **Blood Bank** | Metro Regional Blood Bank | `bloodbank@redcross.demo` | `BloodBankPassword123!` | Inventory batch management, unit allocation, cold-chain dispatch |
| **Donor** | Alex Morgan (O- Universal) | `donor.alex@bloodbridge.demo` | `DonorPassword123!` | Availability toggle, privacy profile, local urgent request feed |
| **Volunteer / NGO** | Sam Rivera | `volunteer.sam@bloodbridge.demo` | `VolunteerPassword123!` | Regional shortage monitor, awareness drive coordination |

---

## Download and Install Dependencies

After downloading or cloning this repository, open PowerShell in the repository root. Install dependencies separately in each application folder (do not upload `node_modules`):

```powershell
cd contracts
npm install
cd ..\backend
npm install
cd ..\frontend
npm install
cd ..
```

Copy `backend/.env.example` to `backend/.env` and review the local development settings before starting the backend. The example includes a **publicly known Hardhat development-only private key**; never reuse it or any demo key for real funds or production. The `.env` file is intentionally excluded from this repository.

## Quick Start (Windows Local Setup)

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `10+`

### 1. Smart Contracts
```powershell
cd contracts
npx hardhat test
```

To use the local blockchain integration, start a Hardhat node in a separate terminal (`cd contracts` then `npm run node`) and deploy the contracts using the project's deployment workflow. Local contract addresses can change after redeployment; update `backend/.env` accordingly. The frontend/backend demo can use embedded PGlite for local storage, but blockchain-backed features require the local chain and deployed contracts to be available.

### 2. Backend Service
```powershell
cd backend
npm test
npm run dev
```

### 3. Frontend Web Application
```powershell
cd frontend
npm run build
npm run dev
```
*Opens on `http://localhost:5173` with full `/api` proxy.*

---

## Project Documentation Directory

- 📖 [**Evaluator & Demo Presentation Guide**](docs/DEMO_GUIDE.md): 12-step guided scenario script for college reviews.
- 📐 [**System Architecture & Technical Design**](docs/ARCHITECTURE.md): On-chain vs off-chain topology, matching math, and security model.
- 🔌 [**REST API Reference**](docs/API_REFERENCE.md): Complete OpenAPI-style endpoint documentation.
- 🧪 [**Testing & Verification Guide**](file:///D:/Adit/Blockchain/docs/TESTING.md): Test suite execution instructions and sample outputs.
- 📊 [**Implementation Status Tracker**](file:///D:/Adit/Blockchain/IMPLEMENTATION_STATUS.md): Detailed status report across all 6 project phases.

---

## Medical Disclaimer

> **IMPORTANT**: BloodBridge is designed as an algorithmic screening, logistics coordination, and cryptographic verification tool. In accordance with clinical transfusion medicine standards, formal laboratory ABO/Rh cross-matching and compatibility testing by qualified medical personnel remain legally mandatory prior to the administration of any blood product.


## Security and Demo Limitations

- This is an educational demonstration, not a clinical decision system. Laboratory ABO/Rh verification and cross-matching remain mandatory before transfusion.
- Blockchain anchoring demonstrates record integrity; it does not prove that physical blood stock exists or is safe.
- Use fictional demo data only. Do not commit `.env`, real credentials, patient data, private keys, or production secrets.
- The bundled demo accounts and development credentials are for local evaluation only and must not be used in a deployed production environment.
