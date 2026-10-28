# BloodBridge — REST API Specification (`/api/v1`)

All endpoints use JSON payloads and require an `Authorization: Bearer <JWT>` header unless designated as public.

---

## 1. Authentication & Session (`/api/v1/auth`)

### `POST /auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "hospital@citygeneral.demo",
    "password": "HospitalPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c1f7a0b3-9e42-4f11-8a6e-473491295db2",
      "email": "hospital@citygeneral.demo",
      "role": "hospital",
      "full_name": "Dr. Marcus Sterling",
      "is_active": true
    }
  }
  ```

### `POST /auth/register`
- **Access**: Public (Self-elevation to `admin` is blocked and rejected with 403 Forbidden: `"System administrator accounts cannot be self-registered."`)
- **Request Body (Blood Donor)**:
  ```json
  {
    "email": "priya.sharma@example.com",
    "password": "SecurePassword123!",
    "role": "donor",
    "full_name": "Priya Sharma",
    "phone": "+91 9876543210",
    "blood_group": "O-",
    "city": "Mumbai",
    "emergency_contact_consent": true
  }
  ```
- **Request Body (Hospital - Pending Accreditation)**:
  ```json
  {
    "email": "admin@metrocare.hospital",
    "password": "SecurePassword123!",
    "role": "hospital",
    "full_name": "Dr. Anita Desai",
    "phone": "+91-22-26543210",
    "legal_name": "Metro Care Super Specialty Hospital",
    "license_number": "HOSP-MH-2026-904",
    "address": "74 Healthcare Avenue, Bandra West",
    "city": "Mumbai"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c1f7a0b3-9e42-4f11-8a6e-473491295db2",
      "email": "priya.sharma@example.com",
      "role": "donor",
      "full_name": "Priya Sharma",
      "phone": "+91 9876543210",
      "is_active": true
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Validation failure (e.g. missing name, invalid email, password < 8 chars, invalid phone, missing city).
  - `403 Forbidden`: Attempted self-registration with `role: "admin"`.
  - `409 Conflict`: Duplicate email (`"An account with this email already exists. Please sign in or use another email."`) or duplicate facility license.

### `GET /auth/me`
- **Access**: Authenticated
- **Response (200 OK)**: Returns the current user object and associated organization or donor profile.

---

## 2. Healthcare Organizations (`/api/v1/organizations`)

### `GET /organizations`
- **Access**: Authenticated (`admin`, `hospital`, `blood_bank`)
- **Query Params**: `?status=pending|verified|rejected|revoked`
- **Response (200 OK)**: Returns array of organizations with Ethereum address and accreditation status.

### `POST /organizations/:id/verify`
- **Access**: System Administrator (`admin` only)
- **Response (200 OK)**: Invokes `BloodBridgeRegistry.sol.verifyOrganization(ethAddress)` and marks status `verified`.

### `POST /organizations/:id/revoke`
- **Access**: System Administrator (`admin` only)
- **Request Body**: `{ "reason": "Audit discrepancy" }`
- **Response (200 OK)**: Invokes `BloodBridgeRegistry.sol.revokeOrganization(ethAddress)` and marks status `revoked`.

---

## 3. Voluntary Donors (`/api/v1/donors`)

### `GET /donors/profile`
- **Access**: Donor (`donor` only)
- **Response (200 OK)**: Returns donor profile including blood group, city, availability, and last donation date.

### `POST /donors/availability`
- **Access**: Donor (`donor` only)
- **Request Body**: `{ "isAvailable": true }`
- **Response (200 OK)**: Updates `is_available` and refreshes `availability_confirmed_at` to current timestamp.

---

## 4. Blood Inventory (`/api/v1/inventory`)

### `GET /inventory`
- **Access**: Verified Blood Bank (`blood_bank`)
- **Response (200 OK)**: Returns list of cold-storage inventory batches.

### `POST /inventory`
- **Access**: Verified Blood Bank (`blood_bank`)
- **Request Body**:
  ```json
  {
    "blood_group": "O-",
    "component_type": "packed_red_cells",
    "units_available": 10,
    "collection_date": "2026-10-25",
    "expiry_date": "2026-12-05",
    "batch_number": "BATCH-ONEG-4819",
    "storage_location": "Vault-C3, Freezer-02"
  }
  ```
- **Response (201 Created)**: Returns the persisted inventory batch record.

---

## 5. Emergency Requests (`/api/v1/requests`)

### `POST /requests/emergency`
- **Access**: Verified Hospital (`hospital` only)
- **Request Body**:
  ```json
  {
    "bloodGroup": "O-",
    "componentType": "packed_red_cells",
    "unitsRequested": 3,
    "urgencyLevel": "emergency",
    "destinationCity": "New York",
    "notes": "Emergency surgery"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Emergency request created and anchored to blockchain",
    "request": {
      "id": "e4a2d8f1-...",
      "status": "open",
      "blood_group": "O-",
      "units_requested": 3,
      "on_chain_request_hash": "0x4b78c9...",
      "on_chain_tx_hash": "0x89e21..."
    },
    "matches": [ ... ]
  }
  ```

### `GET /requests/:id/matches`
- **Access**: Requesting Hospital or Admin
- **Response (200 OK)**: Returns ranked list of matches with `match_score`, `distance_km`, and `explanation_json` containing score breakdown.

### `POST /requests/:id/allocate`
- **Access**: Verified Blood Bank
- **Request Body**: `{ "inventoryId": "uuid...", "units": 3 }`
- **Response (200 OK)**: Locks reserved units and transitions state to `allocated`.

### `POST /requests/:id/dispatch`
- **Access**: Verified Blood Bank
- **Request Body**: `{ "inventoryId": "uuid...", "units": 3 }`
- **Response (200 OK)**: Transitions state to `dispatched` and emits on-chain event.

### `POST /requests/:id/fulfill`
- **Access**: Requesting Hospital
- **Response (200 OK)**: Completes request lifecycle, marks status `fulfilled`.

---

## 6. Security Intelligence & Tamper-Evident Audit (`/api/v1/admin`)

### `GET /admin/security/alerts`
- **Access**: System Administrator (`admin` only)
- **Response (200 OK)**: Returns detected security flags (Rule 1, Rule 2, Rule 3).

### `GET /admin/audit/logs`
- **Access**: System Administrator (`admin` only)
- **Query Params**: `?limit=25&offset=0`
- **Response (200 OK)**: Chronological list of tamper-evident audit records.

### `POST /admin/audit/anchor-batch`
- **Access**: System Administrator (`admin` only)
- **Response (200 OK)**: Canonicalizes unanchored logs, computes root hash, and writes anchor to `BloodBridgeAuditAnchor.sol`.

### `GET /admin/audit/verify/:batchId`
- **Access**: System Administrator (`admin` only)
- **Response (200 OK)**: Recomputes the Merkle root dynamically from database records and verifies against the smart contract anchor.
  ```json
  {
    "isTamperFree": true,
    "batchId": "a1b2c3d4-...",
    "logCount": 12,
    "storedRootHash": "0x5e2b4...",
    "recomputedRootHash": "0x5e2b4...",
    "onChainAnchor": {
      "rootHash": "0x5e2b4...",
      "logCount": 12,
      "submittingAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    },
    "disclaimer": "Cryptographic integrity verified."
  }
  ```

---

## 7. Blockchain Telemetry (`/api/v1/blockchain`)

### `GET /blockchain/status`
- **Access**: Public / Authenticated
- **Response (200 OK)**: Network status, RPC endpoint, relayer address, and deployed contract addresses.
