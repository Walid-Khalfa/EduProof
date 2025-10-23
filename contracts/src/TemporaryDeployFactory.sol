// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./EduProofCertificate.sol";
import "./InstitutionRegistry.sol";

/// @title TemporaryDeployFactory
/// @notice Factory contract for deploying EduProof system using EIP-6780 pattern
/// @dev Uses selfdestruct for parameter-free deployment across multiple chains
contract TemporaryDeployFactory {
    /// @notice Emitted when all contracts are deployed
    /// @dev This event enables frontend to query deployed contracts by tx hash
    event ContractsDeployed(
        address indexed deployer,
        string[] contractNames,
        address[] contractAddresses
    );

    /// @notice Constructor deploys all contracts and self-destructs
    /// @dev NO PARAMETERS - enables same bytecode on all chains
    constructor() {
        // Deploy InstitutionRegistry first
        InstitutionRegistry registry = new InstitutionRegistry();

        // Deploy EduProofCertificate
        EduProofCertificate certificate = new EduProofCertificate();

        // Transfer admin roles to deployer
        bytes32 adminRole = registry.DEFAULT_ADMIN_ROLE();
        bytes32 institutionAdminRole = keccak256("ADMIN_ROLE");
        bytes32 certificateAdminRole = certificate.DEFAULT_ADMIN_ROLE();
        bytes32 institutionRole = keccak256("INSTITUTION_ROLE");

        // Grant roles to deployer
        registry.grantRole(adminRole, msg.sender);
        registry.grantRole(institutionAdminRole, msg.sender);
        certificate.grantRole(certificateAdminRole, msg.sender);
        certificate.grantRole(institutionRole, msg.sender);

        // Build dynamic arrays for event
        string[] memory contractNames = new string[](2);
        contractNames[0] = "InstitutionRegistry";
        contractNames[1] = "EduProofCertificate";

        address[] memory contractAddresses = new address[](2);
        contractAddresses[0] = address(registry);
        contractAddresses[1] = address(certificate);

        // Emit event with all contract info
        emit ContractsDeployed(msg.sender, contractNames, contractAddresses);

        // Self-destruct to clean up
        selfdestruct(payable(msg.sender));
    }
}
