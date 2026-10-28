# BloodBridge Backend Service
**Decentralized Verification & Healthcare Coordination API**

## 1. Overview
The **BloodBridge Backend** provides high-throughput, secure REST APIs for emergency blood requests, explainable ranked matching, hospital and blood bank inventory management, role-based access control (RBAC), and security anomaly detection. It integrates off-chain PostgreSQL transactional persistence with on-chain Ethereum/Hardhat smart contracts (`BloodBridgeRegistry`, `BloodBridgeRequestManager`, `BloodBridgeAuditAnchor`).

---

## 2. Technology Stack
- **Runtime**: Node.js v24.16.0 (Express, TypeScript)
- **Database**: PostgreSQL (standard `pg` driver + embedded PGlite for zero-config testing)
- **Validation**: Zod schema validation
- **Authentication**: JWT Bearer Tokens with Bcrypt password hashing
- **Blockchain Client**: Ethers.js v6
- **Test Suite**: Mocha + Chai + Supertest (27 automated tests passing)

---

## 3. Pre-Configured Fictional Demo Accounts
| Role | Account Name | Email | Password | Permissions & Notes |
|---|---|---|---|---|
| **System Admin** | Dr. Eleanor Vance | `admin@bloodbridge.demo` | `AdminPassword123!` | Organization verification, security alert resolution, on-chain audit batch anchoring. |
| **Hospital** | City General Hospital | `hospital@citygeneral.demo` | `HospitalPassword123!` | Accredited hospital. Can execute `Create Emergency Request`, allocate, and fulfill blood. |
| **Hospital (Pending)**| St. Jude Memorial | `hospital.pending@stjude.demo` | `HospitalPassword123!` | Demo unaccredited facility for testing administrative verification flows. |
| **Blood Bank** | Metro Red Cross | `bloodbank@redcross.demo` | `BloodBankPassword123!` | Accredited blood center. Can manage batches, reserve stock, and dispatch blood. |
| **Donor (O-)** | Alex Rivera | `donor.alex@bloodbridge.demo` | `DonorPassword123!` | Universal RBC donor profile with availability management. |
| **Volunteer / NGO** | Samira Khan | `volunteer.sam@bloodbridge.demo` | `VolunteerPassword123!` | NGO coordinator tracking regional blood shortages. |

---

## 4. REST API Endpoint Reference (`/api/v1`)

### Authentication (`/api/v1/auth`)
- `POST /register`: Registers donor, hospital, or blood bank. Prevents admin self-elevation.
- `POST /login`: Authenticates user, verifies active status, issues JWT. Rate-limited.
- `GET /me`: Returns current authenticated user and organization metadata.
- `GET /demo-accounts`: Lists pre-configured fictional demo accounts for testing.

### Organization Management (`/api/v1/organizations`)
- `GET /me`: Organization details for the current user.
- `GET /`: (Admin only) Lists all organizations or filters by `status` (`pending`, `verified`, `revoked`).
- `POST /:id/verify`: (Admin only) Verifies and approves a hospital or blood bank.
- `POST /:id/revoke`: (Admin only) Revokes an organization's accreditation with a reason.

### Donor Profiles (`/api/v1/donors`)
- `GET /profile`: Retrieves donor profile.
- `PUT /profile`: Updates blood group, city, weight, and emergency contact consent.
- `POST /availability`: Toggles availability status (`true`/`false`) and updates confirmation timestamp.

### Inventory Management (`/api/v1/inventory`)
- `GET /`: Lists all blood batches belonging to the authenticated verified blood bank.
- `POST /`: Registers a new blood inventory batch (blood group, component, units, collection/expiry dates).
- `POST /:id/reserve`: Concurrently reserves units using row-level locking (`SELECT ... FOR UPDATE`).
- `POST /reservations/:reservationId/release`: Releases reserved inventory back to available stock.

### Emergency Requests & Matching (`/api/v1/requests`)
- `POST /emergency`: **Create Emergency Request** workflow. Validates urgency, computes pseudonymous request hash, anchors on-chain, and automatically triggers ranked matching.
- `GET /`: Lists emergency requests (filtered by hospital for hospital callers).
- `GET /:id`: Retrieves request details and status history.
- `GET /:id/matches`: Returns ranked inventory and donor matches with transparent scoring factors and clinical disclaimer.
- `POST /:id/allocate`: (Blood Bank only) Allocates and reserves stock for the request.
- `POST /:id/dispatch`: (Blood Bank only) Dispatches blood units in cold chain transit.
- `POST /:id/fulfill`: (Requesting Hospital only) Confirms physical receipt and marks request fulfilled.
- `POST /:id/cancel`: (Requesting Hospital only) Cancels open or allocated request and releases stock.

### Security Intelligence & Audit System (`/api/v1/admin`)
- `GET /security/alerts`: Lists security alerts (filtered by `open`, `investigating`, `resolved`).
- `PATCH /security/alerts/:id`: Updates alert investigation status and resolution notes.
- `GET /audit/logs`: Paginated, filterable security and workflow audit trail.
- `POST /audit/anchor-batch`: Computes canonical Merkle/batch root hash of unanchored logs and anchors on-chain.
- `GET /audit/verify/:batchId`: Recomputes log hashes from database and verifies against smart contract anchor.

### Blockchain Relayer (`/api/v1/blockchain`)
- `GET /status`: Inspects local Hardhat RPC status, contract addresses, and recent transactions.

---

## 5. Security Intelligence Rules
1. **Rule 1: Excessive Donor Searches (`SEC_RULE_EXCESSIVE_SEARCH_001`)**:
   Flags actors performing $\ge 15$ queries within a rolling 5-minute window to detect automated scraping or unauthorized harvesting.
2. **Rule 2: Repeated Authentication Failures (`SEC_RULE_BRUTE_FORCE_AUTH_002`)**:
   Flags $\ge 5$ consecutive failed logins within 10 minutes for an account/IP to detect brute-force patterns.
3. **Rule 3: Unaccredited Inventory Action (`SEC_RULE_UNACCREDITED_ACTION_003`)**:
   Blocks and flags unverified or revoked organizations attempting inventory modifications or requests.

---

## 6. How to Run Locally

### Start Server
```powershell
cd backend
npm run dev
# Server listens at http://localhost:5000
```

### Build TypeScript
```powershell
cd backend
npm run build
```

### Run Automated Tests
```powershell
cd backend
npm test
# Executes 27 automated tests via Mocha/Chai
```
