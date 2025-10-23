// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title InstitutionRegistry
/// @notice Registry contract for managing educational institutions
/// @dev Implements role-based access control for institution management
contract InstitutionRegistry is AccessControl {
    /// @notice Role identifier for admins who can register/revoke institutions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Struct to store institution information
    struct Institution {
        string name;
        string didURI;
        bool isActive;
        uint256 registeredAt;
    }

    /// @notice Mapping from institution address to institution data
    mapping(address => Institution) private _institutions;

    /// @notice Array to track all registered institution addresses
    address[] private _institutionAddresses;

    /// @notice Emitted when an institution is registered
    /// @param institutionAddress The address of the registered institution
    /// @param name The name of the institution
    event InstitutionRegistered(address indexed institutionAddress, string name);

    /// @notice Emitted when an institution is revoked
    /// @param institutionAddress The address of the revoked institution
    event InstitutionRevoked(address indexed institutionAddress);

    /// @notice Constructor to initialize the contract
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /// @notice Registers a new institution
    /// @dev Only callable by addresses with ADMIN_ROLE
    /// @param institutionAddress The address of the institution to register
    /// @param name The name of the institution
    /// @param didURI The DID URI of the institution
    function registerInstitution(
        address institutionAddress,
        string memory name,
        string memory didURI
    ) external onlyRole(ADMIN_ROLE) {
        require(institutionAddress != address(0), "InstitutionRegistry: zero address");
        require(bytes(name).length > 0, "InstitutionRegistry: empty name");
        require(bytes(didURI).length > 0, "InstitutionRegistry: empty DID URI");
        require(
            !_institutions[institutionAddress].isActive,
            "InstitutionRegistry: institution already active"
        );

        // If institution was previously registered but revoked, we can re-register
        if (bytes(_institutions[institutionAddress].name).length == 0) {
            _institutionAddresses.push(institutionAddress);
        }

        _institutions[institutionAddress] = Institution({
            name: name,
            didURI: didURI,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit InstitutionRegistered(institutionAddress, name);
    }

    /// @notice Revokes an institution's active status
    /// @dev Only callable by addresses with ADMIN_ROLE
    /// @param institutionAddress The address of the institution to revoke
    function revokeInstitution(address institutionAddress) external onlyRole(ADMIN_ROLE) {
        require(institutionAddress != address(0), "InstitutionRegistry: zero address");
        require(
            _institutions[institutionAddress].isActive,
            "InstitutionRegistry: institution not active"
        );

        _institutions[institutionAddress].isActive = false;

        emit InstitutionRevoked(institutionAddress);
    }

    /// @notice Checks if an institution is active
    /// @param institutionAddress The address of the institution to check
    /// @return True if the institution is active, false otherwise
    function isActive(address institutionAddress) external view returns (bool) {
        return _institutions[institutionAddress].isActive;
    }

    /// @notice Returns the institution information
    /// @param institutionAddress The address of the institution
    /// @return The institution struct
    function getInstitution(address institutionAddress) 
        external 
        view 
        returns (Institution memory) 
    {
        require(
            bytes(_institutions[institutionAddress].name).length > 0,
            "InstitutionRegistry: institution not found"
        );
        return _institutions[institutionAddress];
    }

    /// @notice Returns all registered institution addresses
    /// @return Array of institution addresses
    function getAllInstitutions() external view returns (address[] memory) {
        return _institutionAddresses;
    }

    /// @notice Returns the total number of registered institutions
    /// @return The count of institutions
    function getInstitutionCount() external view returns (uint256) {
        return _institutionAddresses.length;
    }
}
