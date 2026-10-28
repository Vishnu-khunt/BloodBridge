# BloodBridge — Testing & Quality Assurance Guide

BloodBridge features an automated multi-tier test suite covering smart contracts, backend business logic, security intelligence, and end-to-end integration workflows.

---

## 1. Smart Contract Test Suite (Hardhat + Solidity)

To execute the smart contract test suite:
```powershell
cd contracts
npx hardhat test
```

### Verified Coverage
- **`BloodBridgeRegistry.sol`**:
  - Deployer administrator permissions
  - Verification of hospitals and blood banks
  - Revocation of accreditation
  - Rejection of unaccredited caller actions
  - Event emission (`OrganizationVerified`, `OrganizationRevoked`)
- **`BloodBridgeRequestManager.sol`**:
  - Request creation with pseudonymous sha256 hashes
  - Allocation of verified inventory
  - Cold-chain dispatch and courier events
  - Emergency fulfillment closing loop
  - Rejection of invalid state transitions (e.g. fulfilling already cancelled requests)
- **`BloodBridgeAuditAnchor.sol`**:
  - Authorized relayer batch anchoring
  - Nonce and batch ID uniqueness
  - Tamper detection and root retrieval
- **Total Passing Tests**: **34 / 34 passing** (Execution time: ~2.5s)

---

## 2. Backend & Integration Test Suite (Node.js + Mocha + PGlite)

To execute the backend and integration test suite:
```powershell
cd backend
npm test
```

### Verified Coverage
- **Authentication & RBAC (`auth.test.ts`, `rbac.test.ts`)**:
  - Bcrypt password hashing
  - JWT generation and expiration verification
  - Role separation across 5 personas
  - Strict prevention of administrative self-elevation during registration
- **Inventory Concurrency & Reservations (`inventory.test.ts`)**:
  - Cold-storage batch creation
  - Transactional unit reservations
  - Prevention of double-allocation or negative inventory
- **Explainable Ranked Matching (`matching.test.ts`)**:
  - Red blood cell ABO/Rh compatibility
  - Plasma/platelet dynamic compatibility inversion
  - Haversine geographic proximity scoring
  - Freshness confirmation bonus
  - Certified inventory priority boost
- **Security Intelligence Rules (`security.test.ts`)**:
  - Rule 1: High-frequency scraping detection
  - Rule 2: Brute-force authentication defense
  - Rule 3: Unaccredited organization operation blocking
- **Blockchain Integration & Tamper Detection (`blockchain.test.ts`)**:
  - Deterministic recursive canonical JSON serializer
  - Batch anchoring to `BloodBridgeAuditAnchor.sol`
  - Synthetic database alteration detection
- **Phase 5 End-to-End Guided Flow (`e2e_demo_flow.test.ts`)**:
  - Full 12-step guided demo lifecycle executed via Supertest
- **Total Passing Tests**: **34 / 34 passing** (Execution time: ~4.0s)

---

## 3. Frontend Build & Static Type Check

To verify the React frontend:
```powershell
cd frontend
# TypeScript static type check
npx tsc

# Production Vite bundle build
npx vite build
```

### Output Summary
- `dist/index.html`: ~0.85 kB
- `dist/assets/index-B4v515nb.css`: ~30.40 kB
- `dist/assets/index-BD-J50yP.js`: ~288.38 kB
- Zero compiler errors, zero unresolved imports.

---

## 4. Running the Entire Application Locally

### Step 1: Start Hardhat Local Blockchain
```powershell
cd contracts
npx hardhat node
```
In a second terminal, deploy the contracts:
```powershell
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
```

### Step 2: Start the Backend Service
```powershell
cd backend
npm run dev
```
Backend runs on `http://localhost:5000` with PostgreSQL / PGlite.

### Step 3: Start the Frontend Application
```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173` in any modern web browser to access the application.
