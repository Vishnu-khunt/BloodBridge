// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./BloodBridgeRegistry.sol";

/**
 * @title BloodBridgeRequestManager
 * @notice Manages the immutable lifecycle of emergency blood requests.
 * @dev Enforces state machine transitions, organization permissions, and role checks.
 *
 * MEDICAL & PRIVACY DISCLAIMER:
 * 1. ZERO PERSONAL HEALTH INFORMATION (PHI):
 *    Patient identities, recipient medical history, donor personal details, and clinical
 *    diagnoses are stored strictly off-chain in encrypted compliance databases.
 *    Only pseudonymous cryptographic hashes (keccak256) are committed to this contract.
 * 2. CLINICAL COMPATIBILITY:
 *    On-chain state recording attests to logistical coordination events between accredited
 *    entities. It does NOT guarantee biological compatibility or clinical suitability.
 *    Physical laboratory cross-matching by licensed healthcare professionals is strictly required.
 */
contract BloodBridgeRequestManager {
    enum RequestStatus {
        None,
        Created,
        Allocated,
        Dispatched,
        Fulfilled,
        Cancelled
    }

    struct BloodRequest {
        bytes32 requestHash;
        address hospital;
        address allocatedBloodBank;
        bytes32 bloodGroupComponentHash; // keccak256 hash of standardized blood group & component type
        bytes32 inventoryBatchHash;       // Off-chain inventory unit/batch reference hash
        uint8 urgencyLevel;               // 1 = Routine, 2 = Urgent, 3 = Critical, 4 = Emergency
        uint16 unitsRequested;
        RequestStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    BloodBridgeRegistry public immutable registry;

    mapping(bytes32 => BloodRequest) private _requests;

    // Events
    event RequestCreated(
        bytes32 indexed requestHash,
        address indexed hospital,
        uint8 urgencyLevel,
        uint16 unitsRequested,
        bytes32 bloodGroupComponentHash,
        uint256 timestamp
    );

    event RequestAllocated(
        bytes32 indexed requestHash,
        address indexed bloodBank,
        bytes32 inventoryBatchHash,
        uint256 timestamp
    );

    event RequestDispatched(
        bytes32 indexed requestHash,
        address indexed bloodBank,
        uint256 timestamp
    );

    event RequestFulfilled(
        bytes32 indexed requestHash,
        address indexed hospital,
        uint256 timestamp
    );

    event RequestCancelled(
        bytes32 indexed requestHash,
        address indexed hospital,
        string reason,
        uint256 timestamp
    );

    // Custom Errors
    error InvalidRegistryAddress();
    error UnauthorizedHospital();
    error UnauthorizedBloodBank();
    error UnauthorizedCaller();
    error RequestAlreadyExists();
    error RequestNotFound();
    error InvalidRequestHash();
    error InvalidUrgencyLevel();
    error InvalidUnitsRequested();
    error InvalidComponentHash();
    error InvalidBatchHash();
    error InvalidStateTransition(RequestStatus currentStatus, RequestStatus attemptedStatus);

    modifier onlyVerifiedHospital() {
        if (!registry.isVerifiedHospital(msg.sender)) {
            revert UnauthorizedHospital();
        }
        _;
    }

    modifier onlyVerifiedBloodBank() {
        if (!registry.isVerifiedBloodBank(msg.sender)) {
            revert UnauthorizedBloodBank();
        }
        _;
    }

    constructor(address registryAddress) {
        if (registryAddress == address(0)) revert InvalidRegistryAddress();
        registry = BloodBridgeRegistry(registryAddress);
    }

    /**
     * @notice Initiates a new verified emergency blood request.
     * @param requestHash Cryptographic pseudonymous identifier for the request.
     * @param urgencyLevel 1 = Routine, 2 = Urgent, 3 = Critical, 4 = Emergency.
     * @param unitsRequested Number of units needed (1..50).
     * @param bloodGroupComponentHash Salted hash of blood group and component requirements.
     */
    function createRequest(
        bytes32 requestHash,
        uint8 urgencyLevel,
        uint16 unitsRequested,
        bytes32 bloodGroupComponentHash
    ) external onlyVerifiedHospital {
        if (requestHash == bytes32(0)) revert InvalidRequestHash();
        if (_requests[requestHash].status != RequestStatus.None) revert RequestAlreadyExists();
        if (urgencyLevel == 0 || urgencyLevel > 4) revert InvalidUrgencyLevel();
        if (unitsRequested == 0 || unitsRequested > 50) revert InvalidUnitsRequested();
        if (bloodGroupComponentHash == bytes32(0)) revert InvalidComponentHash();

        _requests[requestHash] = BloodRequest({
            requestHash: requestHash,
            hospital: msg.sender,
            allocatedBloodBank: address(0),
            bloodGroupComponentHash: bloodGroupComponentHash,
            inventoryBatchHash: bytes32(0),
            urgencyLevel: urgencyLevel,
            unitsRequested: unitsRequested,
            status: RequestStatus.Created,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit RequestCreated(
            requestHash,
            msg.sender,
            urgencyLevel,
            unitsRequested,
            bloodGroupComponentHash,
            block.timestamp
        );
    }

    /**
     * @notice Allocates inventory units from a verified blood bank to an open request.
     * @param requestHash The request to allocate units for.
     * @param inventoryBatchHash Cryptographic hash identifying the blood unit batch off-chain.
     */
    function allocateInventory(
        bytes32 requestHash,
        bytes32 inventoryBatchHash
    ) external onlyVerifiedBloodBank {
        BloodRequest storage req = _requests[requestHash];
        if (req.status == RequestStatus.None) revert RequestNotFound();
        if (req.status != RequestStatus.Created) {
            revert InvalidStateTransition(req.status, RequestStatus.Allocated);
        }
        if (inventoryBatchHash == bytes32(0)) revert InvalidBatchHash();

        req.status = RequestStatus.Allocated;
        req.allocatedBloodBank = msg.sender;
        req.inventoryBatchHash = inventoryBatchHash;
        req.updatedAt = block.timestamp;

        emit RequestAllocated(requestHash, msg.sender, inventoryBatchHash, block.timestamp);
    }

    /**
     * @notice Dispatches reserved blood bags into transit towards the requesting hospital.
     * @param requestHash The request currently in Allocated state.
     */
    function dispatchBlood(bytes32 requestHash) external onlyVerifiedBloodBank {
        BloodRequest storage req = _requests[requestHash];
        if (req.status == RequestStatus.None) revert RequestNotFound();
        if (req.allocatedBloodBank != msg.sender) revert UnauthorizedCaller();
        if (req.status != RequestStatus.Allocated) {
            revert InvalidStateTransition(req.status, RequestStatus.Dispatched);
        }

        req.status = RequestStatus.Dispatched;
        req.updatedAt = block.timestamp;

        emit RequestDispatched(requestHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Confirms physical receipt and successful delivery at the requesting hospital.
     * @param requestHash The request currently in Dispatched state.
     */
    function fulfillRequest(bytes32 requestHash) external onlyVerifiedHospital {
        BloodRequest storage req = _requests[requestHash];
        if (req.status == RequestStatus.None) revert RequestNotFound();
        if (req.hospital != msg.sender) revert UnauthorizedCaller();
        if (req.status != RequestStatus.Dispatched) {
            revert InvalidStateTransition(req.status, RequestStatus.Fulfilled);
        }

        req.status = RequestStatus.Fulfilled;
        req.updatedAt = block.timestamp;

        emit RequestFulfilled(requestHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Cancels a request prior to physical dispatch.
     * @param requestHash The request to cancel.
     * @param reason Documented cancellation explanation.
     */
    function cancelRequest(
        bytes32 requestHash,
        string calldata reason
    ) external onlyVerifiedHospital {
        BloodRequest storage req = _requests[requestHash];
        if (req.status == RequestStatus.None) revert RequestNotFound();
        if (req.hospital != msg.sender) revert UnauthorizedCaller();
        if (req.status != RequestStatus.Created && req.status != RequestStatus.Allocated) {
            revert InvalidStateTransition(req.status, RequestStatus.Cancelled);
        }

        req.status = RequestStatus.Cancelled;
        req.updatedAt = block.timestamp;

        emit RequestCancelled(requestHash, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Returns request state machine and audit properties.
     */
    function getRequest(
        bytes32 requestHash
    ) external view returns (
        address hospital,
        address allocatedBloodBank,
        bytes32 bloodGroupComponentHash,
        bytes32 inventoryBatchHash,
        uint8 urgencyLevel,
        uint16 unitsRequested,
        RequestStatus status,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        BloodRequest memory req = _requests[requestHash];
        if (req.status == RequestStatus.None) revert RequestNotFound();

        return (
            req.hospital,
            req.allocatedBloodBank,
            req.bloodGroupComponentHash,
            req.inventoryBatchHash,
            req.urgencyLevel,
            req.unitsRequested,
            req.status,
            req.createdAt,
            req.updatedAt
        );
    }
}
