// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BloodBridgeRegistry
 * @notice Maintains accreditation and authorization records for Healthcare Organizations (Hospitals and Blood Banks).
 * @dev Enforces access control so only vetted organizations can perform critical actions in the BloodBridge network.
 *
 * TRUST ASSUMPTIONS & DISCLAIMER:
 * - On-chain verification confirms an Ethereum address has been accredited by a BloodBridge administrator.
 * - It does NOT substitute for physical facility inspections, medical licensing audits, or regulatory compliance.
 * - No sensitive personal data or healthcare facility credentials are stored on-chain.
 */
contract BloodBridgeRegistry is Ownable {
    enum OrgType {
        None,
        Hospital,
        BloodBank
    }

    enum VerificationStatus {
        Unverified,
        Verified,
        Revoked
    }

    struct Organization {
        OrgType orgType;
        VerificationStatus status;
        string orgIdentifierHash; // Salted cryptographic identifier matching off-chain DB record
        uint256 verifiedAt;
        uint256 updatedAt;
    }

    mapping(address => Organization) private _organizations;

    // Events
    event OrganizationVerified(
        address indexed orgAddress,
        OrgType indexed orgType,
        string orgIdentifierHash,
        uint256 timestamp
    );

    event OrganizationRevoked(
        address indexed orgAddress,
        string reason,
        uint256 timestamp
    );

    // Custom Errors
    error InvalidAddress();
    error InvalidOrgType();
    error EmptyIdentifier();
    error OrganizationAlreadyVerified();
    error OrganizationNotVerified();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Accredits and verifies an organization address.
     * @param orgAddress The Ethereum address representing the organization's relayer or wallet.
     * @param orgType The type of organization (Hospital or BloodBank).
     * @param orgIdentifierHash Cryptographic off-chain identifier hash (e.g. SHA256 of license + salt).
     */
    function verifyOrganization(
        address orgAddress,
        OrgType orgType,
        string calldata orgIdentifierHash
    ) external onlyOwner {
        if (orgAddress == address(0)) revert InvalidAddress();
        if (orgType == OrgType.None) revert InvalidOrgType();
        if (bytes(orgIdentifierHash).length == 0) revert EmptyIdentifier();

        Organization storage org = _organizations[orgAddress];
        if (org.status == VerificationStatus.Verified) {
            revert OrganizationAlreadyVerified();
        }

        org.orgType = orgType;
        org.status = VerificationStatus.Verified;
        org.orgIdentifierHash = orgIdentifierHash;
        org.verifiedAt = block.timestamp;
        org.updatedAt = block.timestamp;

        emit OrganizationVerified(
            orgAddress,
            orgType,
            orgIdentifierHash,
            block.timestamp
        );
    }

    /**
     * @notice Revokes the verification status of an organization address.
     * @param orgAddress The Ethereum address to revoke.
     * @param reason Administrative explanation for revocation.
     */
    function revokeOrganization(
        address orgAddress,
        string calldata reason
    ) external onlyOwner {
        if (orgAddress == address(0)) revert InvalidAddress();

        Organization storage org = _organizations[orgAddress];
        if (org.status != VerificationStatus.Verified) {
            revert OrganizationNotVerified();
        }

        org.status = VerificationStatus.Revoked;
        org.updatedAt = block.timestamp;

        emit OrganizationRevoked(orgAddress, reason, block.timestamp);
    }

    /**
     * @notice Checks whether an address is a currently verified Hospital.
     */
    function isVerifiedHospital(address orgAddress) external view returns (bool) {
        Organization memory org = _organizations[orgAddress];
        return org.orgType == OrgType.Hospital && org.status == VerificationStatus.Verified;
    }

    /**
     * @notice Checks whether an address is a currently verified Blood Bank.
     */
    function isVerifiedBloodBank(address orgAddress) external view returns (bool) {
        Organization memory org = _organizations[orgAddress];
        return org.orgType == OrgType.BloodBank && org.status == VerificationStatus.Verified;
    }

    /**
     * @notice Returns complete metadata for an organization address.
     */
    function getOrganization(
        address orgAddress
    ) external view returns (
        OrgType orgType,
        VerificationStatus status,
        string memory orgIdentifierHash,
        uint256 verifiedAt,
        uint256 updatedAt
    ) {
        Organization memory org = _organizations[orgAddress];
        return (
            org.orgType,
            org.status,
            org.orgIdentifierHash,
            org.verifiedAt,
            org.updatedAt
        );
    }
}
