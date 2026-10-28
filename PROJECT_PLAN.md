# BloodBridge — Master Project Plan
**A Smart Blockchain Network to Reduce Blood Shortage**
*A Healthcare SaaS & Decentralized Verification Platform (B.Tech Capstone Specification)*

---

## 1. Executive Summary & Core Principles

Blood shortages, coordination delays, and inventory opacity cause preventable fatalities in emergency medical procedures. **BloodBridge** solves this crisis through a hybrid architecture:
1. **High-Performance Off-Chain Application Layer**: Rapid emergency request routing, multi-factor ranked matching, inventory tracking, role-based workflows, and sensitive healthcare data storage.
2. **Decentralized Blockchain Verification Layer (Ethereum/Hardhat)**: Immutable tracking of critical state transitions (request creation, allocation, dispatch, fulfillment) and tamper-proof anchoring of audit logs using cryptographic batch hashing.

### Critical Safety & Privacy Principles
- **Medical Disclaimer**: Software matching does *not* constitute medical compatibility verification or clinical qualification. Strict cross-matching, testing, and blood typing by licensed medical professionals are always mandatory.
- **Privacy-First (No PII on Chain)**: Zero donor personal identifiers, contact details, medical history, or patient names are ever committed to the blockchain. Only cryptographic hashes, pseudonymized request IDs, status enums, and batch audit roots are anchored on-chain.
- **Role Elevation Prevention**: Role-based access control (RBAC) is enforced at the database, backend controller, and smart contract levels. Users cannot elevate their own roles.
- **Organization Vetting**: Hospitals and Blood Banks require explicit System Administrator verification before their inventory or requests are marked as trusted.

---

## 2. System Architecture

```
                                  +-------------------------------------------+
                                  |              CLIENT TIER                  |
                                  |   React 18 + TypeScript + Vite + Tailwind  |
                                  |   (Healthcare SaaS UX, Deep Navy/Crimson) |
                                  +---------------------+---------------------+
                                                        |
                                          REST / JSON   |   Ethers.js / Web3
                                                        v
                                  +-------------------------------------------+
                                  |             APPLICATION TIER              |
                                  |        Node.js + Express + TypeScript     |
                                  |  - Auth & RBAC (JWT + Bcrypt)             |
                                  |  - Multi-Factor Ranked Matching Engine    |
                                  |  - Inventory & Emergency Request Manager  |
                                  |  - Security Intelligence & Audit Service  |
                                  |  - Blockchain Anchor & Relayer Service    |
                                  +----------+--------------------+-----------+
                                             |                    |
                         Relational Queries  |                    | JSON-RPC
                                             v                    v
+--------------------------------------------+    +-------------------------------------------+
|               DATABASE TIER                |    |              BLOCKCHAIN TIER              |
|        PostgreSQL (Persistent Storage)     |    |        Hardhat / EVM Local Network        |
| - Users, Roles, Credentials                |    | - BloodBridgeRegistry.sol                 |
| - Donors, Blood Groups, Geo-Coordinates    |    |   (Verified org addresses & roles)        |
| - Blood Inventories & Component Batches    |    | - BloodBridgeRequestManager.sol           |
| - Emergency Requests & Match Explanations  |    |   (State machine: Created -> Fulfilled)   |
| - Security Events & Audit Trail Batches    |    | - BloodBridgeAuditAnchor.sol              |
+--------------------------------------------+    |   (Cryptographic Merkle/Batch Roots)      |
                                                  +-------------------------------------------+
```

---

## 3. Technology Stack & Tooling

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React | High-performance, type-safe, crisp healthcare design system with zero bloat. |
| **Backend** | Node.js, Express, TypeScript, Zod | Fast asynchronous I/O, rigorous schema validation, enterprise modular structure. |
| **Database** | PostgreSQL (with `pg` driver, migration scripts, and seeders) | ACID guarantees for critical inventory reserves and relational audit integrity. |
| **Blockchain** | Solidity 0.8.28, Hardhat, Ethers.js v6 | Standard Ethereum tooling for local deployment, automated smart-contract unit testing. |
| **Testing** | Vitest / Jest, Supertest, Hardhat Chai Matchers | Comprehensive coverage across unit rules, APIs, and smart contract security assertions. |

---

## 4. User Roles & Permission Matrix

| Role | Core Capabilities | Restrictions |
|---|---|---|
| **1. Blood Donor** | Manage availability status, view donation history, receive match requests, consent to emergency calls. | Cannot view other donors, cannot create hospital emergency requests. |
| **2. Hospital / Patient Rep** | **Create Emergency Request** via dedicated flow, view ranked matches (inventory first, then donors), confirm fulfillment. | Cannot access raw audit logs or approve other organizations. |
| **3. Blood Bank** | Manage inventory (component types, units, expiry dates), reserve units, dispatch blood bags, record batch fulfillment. | Can only modify inventory belonging to their own verified facility. |
| **4. System Administrator** | Approve/reject hospital and blood bank accreditations, view Security Intelligence Dashboard, verify on-chain audit anchors. | Cannot alter finalized historical blood requests or tamper with on-chain records. |
| **5. Volunteer / NGO** | Coordinate donor mobilization campaigns, track regional shortages, view aggregated anonymous heatmaps. | No access to private medical or personal donor contact details without explicit consent. |

---

## 5. Database Schema & Data Models

### Key Tables
1. **`users`**:
   - `id` (UUID, PK)
   - `email` (VARCHAR, UNIQUE)
   - `password_hash` (VARCHAR)
   - `role` (ENUM: `donor`, `hospital`, `blood_bank`, `admin`, `volunteer`)
   - `full_name` (VARCHAR)
   - `phone` (VARCHAR)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **`organizations`**:
   - `id` (UUID, PK)
   - `user_id` (UUID, FK -> `users.id`)
   - `org_type` (ENUM: `hospital`, `blood_bank`)
   - `legal_name`, `license_number` (VARCHAR)
   - `address`, `city`, `latitude`, `longitude` (DECIMAL)
   - `verification_status` (ENUM: `pending`, `verified`, `rejected`)
   - `eth_address` (VARCHAR)
   - `verified_at`, `verified_by` (TIMESTAMP / FK)

3. **`donors`**:
   - `id` (UUID, PK)
   - `user_id` (UUID, FK -> `users.id`)
   - `blood_group` (ENUM: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
   - `last_donation_date` (DATE)
   - `is_available` (BOOLEAN)
   - `availability_confirmed_at` (TIMESTAMP)
   - `latitude`, `longitude` (DECIMAL)
   - `city` (VARCHAR)

4. **`blood_inventories`**:
   - `id` (UUID, PK)
   - `blood_bank_id` (UUID, FK -> `organizations.id`)
   - `blood_group` (ENUM: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
   - `component_type` (ENUM: `whole_blood`, `packed_red_cells`, `platelets`, `fresh_frozen_plasma`, `cryoprecipitate`)
   - `units_available` (INT)
   - `units_reserved` (INT)
   - `collection_date`, `expiry_date` (DATE)
   - `status` (ENUM: `available`, `reserved`, `quarantined`, `expired`)

5. **`blood_requests`**:
   - `id` (UUID, PK)
   - `hospital_id` (UUID, FK -> `organizations.id`)
   - `blood_group` (ENUM)
   - `component_type` (ENUM)
   - `units_requested` (INT)
   - `urgency_level` (ENUM: `emergency`, `critical`, `urgent`, `routine`)
   - `status` (ENUM: `open`, `matching`, `partially_fulfilled`, `fulfilled`, `cancelled`)
   - `on_chain_request_id` (VARCHAR)
   - `on_chain_tx_hash` (VARCHAR)
   - `created_at`, `required_by` (TIMESTAMP)

6. **`request_matches`**:
   - `id` (UUID, PK)
   - `request_id` (UUID, FK -> `blood_requests.id`)
   - `match_type` (ENUM: `inventory`, `donor`)
   - `target_id` (UUID: inventory ID or donor ID)
   - `match_score` (INT 0-100)
   - `distance_km` (DECIMAL)
   - `explanation_json` (JSONB: compatibility breakdown, freshness, score factors)
   - `status` (ENUM: `suggested`, `contacted`, `accepted`, `declined`, `fulfilled`)

7. **`audit_logs`**:
   - `id` (UUID, PK)
   - `actor_id` (UUID, FK -> `users.id`)
   - `actor_role` (VARCHAR)
   - `event_type` (VARCHAR: `SEARCH_PERFORMED`, `DONOR_VIEWED`, `INVENTORY_MUTATION`, `REQUEST_STATE_CHANGE`, `FAILED_LOGIN`)
   - `resource_id` (VARCHAR)
   - `details_json` (JSONB)
   - `severity` (ENUM: `info`, `warning`, `critical`)
   - `batch_id` (UUID)
   - `batch_hash` (VARCHAR)
   - `created_at` (TIMESTAMP)

8. **`security_alerts`**:
   - `id` (UUID, PK)
   - `rule_name` (VARCHAR: `EXCESSIVE_DONOR_SEARCH`, `BRUTE_FORCE_LOGIN`, `UNACCREDITED_INVENTORY_ACTION`)
   - `severity` (ENUM: `low`, `medium`, `high`, `critical`)
   - `actor_id` (UUID, FK -> `users.id`)
   - `description` (TEXT)
   - `status` (ENUM: `open`, `investigating`, `dismissed`, `resolved`)
   - `created_at` (TIMESTAMP)

---

## 6. Smart Contracts (Solidity 0.8.28)

1. **`BloodBridgeRegistry.sol`**:
   - Maintains verified Ethereum addresses of approved Hospitals and Blood Banks.
   - Restricts privileged lifecycle functions so only vetted addresses can trigger emergency requests or fulfill units.
2. **`BloodBridgeRequestManager.sol`**:
   - State machine tracking:
     - `createRequest(bytes32 requestHash, uint8 urgencyLevel, uint8 unitsRequested)`
     - `allocateInventory(bytes32 requestHash, bytes32 inventoryHash)`
     - `dispatchBlood(bytes32 requestHash)`
     - `fulfillRequest(bytes32 requestHash)`
   - Emits indexed events for real-time frontend listener updates.
3. **`BloodBridgeAuditAnchor.sol`**:
   - `anchorBatch(bytes32 rootHash, uint256 batchId, uint256 logCount)`
   - Stores block number, timestamp, and transaction submitter for verifiable tamper detection.

---

## 7. Explainable Ranked Matching Engine

Every request triggers a deterministic ranking algorithm:
1. **Immunological Compatibility (Strict Filter)**:
   - RBC/Whole Blood compatibility matrix:
     - O- is universal donor; AB+ is universal recipient.
     - Incompatible blood groups receive score 0 and are omitted.
2. **Inventory Priority Rule**:
   - Verified Blood Bank stocks are ranked ahead of live donor calls to minimize mobilization delay.
3. **Geographic Proximity (Haversine Distance)**:
   - Evaluated between request hospital location and donor/bank coordinates.
4. **Freshness & Donor Fatigue**:
   - Availability confirmed within < 24h scores highest.
   - Donors must have elapsed $\ge 90$ days since last whole-blood donation.
5. **Score Formulation**:
   $$\text{Score} = w_1 \cdot C_{\text{compat}} + w_2 \cdot P_{\text{distance}} + w_3 \cdot F_{\text{freshness}} + w_4 \cdot T_{\text{type}}$$
6. **Transparent Explanation**:
   Every suggested match returns an explainability payload, e.g.:
   ```json
   {
     "candidateType": "inventory",
     "score": 96,
     "reasons": [
       "Exact blood group match (A+ to A+)",
       "Verified inventory: Red Cross Central (3.4 km away)",
       "Component: Packed Red Blood Cells (Expiry: 28 days)",
       "Facility verified and active"
     ],
     "medicalDisclaimer": "Subject to mandatory laboratory cross-matching."
   }
   ```

---

## 8. Security Intelligence & Audit System

- **Continuous Rule Evaluation**:
  - *Rule 1: Excessive Donor Search*: Flags any user performing $\ge 15$ queries within a rolling 5-minute window.
  - *Rule 2: Repeated Authentication Failures*: Triggers high-severity alert upon 5 consecutive failed logins from an IP/account.
  - *Rule 3: Unaccredited Modification Attempt*: Flags unapproved hospitals attempting inventory adjustments.
- **On-Chain Cryptographic Integrity Check**:
  - Off-chain audit logs are batched into SHA-256 / Merkle digests and committed to `BloodBridgeAuditAnchor.sol`.
  - The Admin Security Dashboard provides a 1-click **Verify Integrity** tool that re-hashes the stored logs and compares with the on-chain anchor.

---

## 9. Folder Structure

```
C:\Projects\BloodBridge\ (or local project root)
├── contracts/                        # Smart Contracts & Hardhat
│   ├── contracts/
│   │   ├── BloodBridgeRegistry.sol
│   │   ├── BloodBridgeRequestManager.sol
│   │   └── BloodBridgeAuditAnchor.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   ├── RequestManager.test.ts
│   │   └── AuditAnchor.test.ts
│   ├── hardhat.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                          # Express + TypeScript Backend
│   ├── src/
│   │   ├── config/                   # DB, Blockchain, JWT configs
│   │   ├── controllers/              # Route controllers
│   │   ├── db/
│   │   │   ├── migrations/           # SQL schema DDL
│   │   │   ├── seeds/                # Demo users, hospitals, inventory
│   │   │   └── db.ts                 # Database client pool
│   │   ├── middlewares/              # Auth, RBAC, Audit, RateLimiter
│   │   ├── routes/                   # Auth, Requests, Inventory, Matches, Admin
│   │   ├── services/                 # Matching engine, Blockchain relayer, Security monitor
│   │   ├── types/                    # Shared interfaces
│   │   └── index.ts                  # Server entry point
│   ├── tests/
│   │   ├── matching.test.ts
│   │   └── rbac.test.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/               # Navbar, Badges, Modals, Tables, Cards
│   │   │   ├── EmergencyRequestModal.tsx
│   │   │   ├── MatchExplanationCard.tsx
│   │   │   └── OnChainBadge.tsx
│   │   ├── context/                  # AuthContext, BlockchainContext
│   │   ├── pages/                    # 5 Role Dashboards + Auth
│   │   │   ├── DonorDashboard.tsx
│   │   │   ├── HospitalDashboard.tsx
│   │   │   ├── BloodBankDashboard.tsx
│   │   │   ├── AdminSecurityDashboard.tsx
│   │   │   ├── VolunteerDashboard.tsx
│   │   │   └── LoginDemo.tsx
│   │   ├── services/                 # API calls, Web3 contract calls
│   │   ├── utils/                    # Compatibility matrix, formatting
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                             # Setup guides & College demo instructions
├── PROJECT_PLAN.md                   # This master specification
└── IMPLEMENTATION_STATUS.md          # Living progress tracking
```

---

## 10. Implementation Phases & Milestones

1. **Phase 1: Project Blueprint & Setup (Completed)**
   - Initial analysis, `PROJECT_PLAN.md`, and `IMPLEMENTATION_STATUS.md`.
2. **Phase 2: Blockchain Layer (Contracts, Hardhat, Tests)**
   - Author `BloodBridgeRegistry.sol`, `BloodBridgeRequestManager.sol`, and `BloodBridgeAuditAnchor.sol`.
   - Setup Hardhat environment, write contract unit tests, deploy script.
3. **Phase 3: Backend Core & Database Architecture**
   - Setup Express, TypeScript, DB migrations, seed data (5 roles demo accounts, hospitals, inventories).
   - Implement Auth (JWT/Bcrypt), RBAC middleware, and Audit logger.
   - Build Explainable Ranked Matching Engine and Security Intelligence Rule Engine.
   - Expose REST APIs for Requests, Inventory, Matching, and Admin verification.
4. **Phase 4: Frontend Development & Role Dashboards**
   - Initialize Vite + React + Tailwind CSS with Healthcare SaaS theme.
   - Implement Dedicated "Create Emergency Request" experience with input validation.
   - Build 5 separate role dashboards (Donor, Hospital, Blood Bank, Admin Security, Volunteer).
   - Implement Match Explanation visualizer and On-Chain Transaction Explorer.
5. **Phase 5: Guided Demo Scenarios & Blockchain Integration**
   - Pre-configured 1-click role switcher demo accounts.
   - Interactive guided demo walkthrough (Emergency request creation -> Matching -> Reserve -> On-chain fulfillment -> Security alert generation -> On-chain audit verification).
6. **Phase 6: Automated Testing, Security Hardening & Documentation**
   - Backend unit/integration tests, smart contract tests.
   - Comprehensive college presentation & setup guide (`README.md`, `DEMO_GUIDE.md`).
