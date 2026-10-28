// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BloodBridgeAuditAnchor
 * @notice Provides tamper-evident cryptographic anchoring for off-chain security & workflow audit batches.
 * @dev Allows authorized backend relayer services to commit Merkle roots or batch hashes on-chain.
 *
 * TRUST ASSUMPTIONS & AUDIT DISCLAIMER:
 * 1. PROOF OF EXISTENCE & TAMPER DETECTION:
 *    Anchoring a cryptographic hash on-chain creates a mathematically verifiable, timestamped
 *    proof that a specific sequence of audit logs existed in that exact state at or before the block time.
 *    Any subsequent alteration of the off-chain log rows will cause hash verification to fail.
 * 2. NO REPLACEMENT FOR REAL-WORLD VERIFICATION:
 *    An on-chain hash does NOT intrinsically guarantee that the underlying off-chain event
 *    accurately reflected real-world physical activity, or that malicious off-chain actors did not
 *    omit logs prior to hashing. It provides non-repudiation and detects post-hoc modifications.
 */
contract BloodBridgeAuditAnchor is Ownable {
    struct AuditBatch {
        bytes32 batchId;
        bytes32 rootHash;
        uint32 logCount;
        uint256 timestamp;
        address relayer;
        string metadataUri; // Optional URI or reference to batch summary
    }

    mapping(bytes32 => AuditBatch) private _batches;
    mapping(address => bool) private _authorizedRelayers;

    // Events
    event AuditBatchAnchored(
        bytes32 indexed batchId,
        bytes32 indexed rootHash,
        uint32 logCount,
        address indexed relayer,
        uint256 timestamp,
        string metadataUri
    );

    event RelayerAuthorized(address indexed relayer);
    event RelayerRevoked(address indexed relayer);

    // Custom Errors
    error UnauthorizedRelayer();
    error InvalidBatchId();
    error InvalidRootHash();
    error InvalidLogCount();
    error InvalidRelayerAddress();
    error BatchAlreadyAnchored();
    error BatchNotFound();

    modifier onlyAuthorizedRelayer() {
        if (!_authorizedRelayers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedRelayer();
        }
        _;
    }

    constructor() Ownable(msg.sender) {
        // Automatically authorize the contract deployer as an initial relayer
        _authorizedRelayers[msg.sender] = true;
        emit RelayerAuthorized(msg.sender);
    }

    /**
     * @notice Grants or revokes relayer authorization to anchor audit batches.
     */
    function setRelayerAuthorization(address relayer, bool isAuthorized) external onlyOwner {
        if (relayer == address(0)) revert InvalidRelayerAddress();
        _authorizedRelayers[relayer] = isAuthorized;
        if (isAuthorized) {
            emit RelayerAuthorized(relayer);
        } else {
            emit RelayerRevoked(relayer);
        }
    }

    /**
     * @notice Checks whether an address is an authorized audit relayer.
     */
    function isAuthorizedRelayer(address relayer) external view returns (bool) {
        return _authorizedRelayers[relayer] || relayer == owner();
    }

    /**
     * @notice Anchors a batch of off-chain audit logs on-chain.
     * @param batchId Unique identifier for the audit log batch (e.g. UUID v4 formatted as bytes32).
     * @param rootHash SHA-256 or Keccak-256 root hash of the combined audit log entries.
     * @param logCount Number of log records included in this anchored batch.
     * @param metadataUri Optional off-chain storage pointer or batch descriptor.
     */
    function anchorBatch(
        bytes32 batchId,
        bytes32 rootHash,
        uint32 logCount,
        string calldata metadataUri
    ) external onlyAuthorizedRelayer {
        if (batchId == bytes32(0)) revert InvalidBatchId();
        if (rootHash == bytes32(0)) revert InvalidRootHash();
        if (logCount == 0) revert InvalidLogCount();
        if (_batches[batchId].timestamp != 0) revert BatchAlreadyAnchored();

        _batches[batchId] = AuditBatch({
            batchId: batchId,
            rootHash: rootHash,
            logCount: logCount,
            timestamp: block.timestamp,
            relayer: msg.sender,
            metadataUri: metadataUri
        });

        emit AuditBatchAnchored(
            batchId,
            rootHash,
            logCount,
            msg.sender,
            block.timestamp,
            metadataUri
        );
    }

    /**
     * @notice Retrieves details of an anchored audit batch for verification.
     */
    function getBatch(
        bytes32 batchId
    ) external view returns (
        bytes32 rootHash,
        uint32 logCount,
        uint256 timestamp,
        address relayer,
        string memory metadataUri
    ) {
        AuditBatch memory b = _batches[batchId];
        if (b.timestamp == 0) revert BatchNotFound();

        return (
            b.rootHash,
            b.logCount,
            b.timestamp,
            b.relayer,
            b.metadataUri
        );
    }

    /**
     * @notice Helper to check if a batch has already been anchored.
     */
    function isBatchAnchored(bytes32 batchId) external view returns (bool) {
        return _batches[batchId].timestamp != 0;
    }
}
