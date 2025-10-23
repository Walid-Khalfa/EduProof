// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EduProofCertificate
/// @notice ERC-721 NFT contract for educational certificates with revocation capability
/// @dev Implements role-based access control for minting and revocation
contract EduProofCertificate is ERC721URIStorage, AccessControl {
    /// @notice Role identifier for institutions that can mint certificates
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");

    /// @notice Struct to store revocation information
    struct RevocationInfo {
        bool isRevoked;
        string reason;
        uint256 timestamp;
    }

    /// @notice Counter for token IDs
    uint256 private _tokenIdCounter;

    /// @notice Mapping from token ID to revocation information
    mapping(uint256 => RevocationInfo) private _revocations;

    /// @notice Mapping from token ID to student hash (for privacy)
    mapping(uint256 => bytes32) private _studentHashes;

    /// @notice Mapping from certificate hash to existence (for duplicate prevention)
    mapping(bytes32 => bool) private _certificateExists;

    /// @notice Emitted when a certificate is minted
    /// @param tokenId The ID of the minted token
    /// @param institution The address of the institution that minted the certificate
    /// @param studentHash The hash of the student's name for privacy
    /// @param certificateHash The unique hash of the certificate data
    event Minted(uint256 indexed tokenId, address indexed institution, bytes32 studentHash, bytes32 certificateHash);

    /// @notice Emitted when a certificate is revoked
    /// @param tokenId The ID of the revoked token
    /// @param reason The reason for revocation
    event Revoked(uint256 indexed tokenId, string reason);

    /// @notice Constructor to initialize the contract
    constructor() ERC721("EduProof Certificate", "EDUPROOF") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Mints a new certificate NFT
    /// @dev Only callable by addresses with INSTITUTION_ROLE
    /// @param to The address to mint the certificate to
    /// @param tokenURI The URI containing certificate metadata
    /// @param studentHash The hash of the student's name for privacy
    /// @param studentName The student's name
    /// @param courseName The course name
    /// @param institution The institution name
    /// @param issueDate The issue date
    function safeMint(
        address to,
        string memory tokenURI,
        bytes32 studentHash,
        string memory studentName,
        string memory courseName,
        string memory institution,
        string memory issueDate
    ) external onlyRole(INSTITUTION_ROLE) {
        require(to != address(0), "EduProofCertificate: mint to zero address");
        require(bytes(tokenURI).length > 0, "EduProofCertificate: empty tokenURI");
        require(studentHash != bytes32(0), "EduProofCertificate: invalid student hash");

        // Create unique certificate hash from certificate data
        bytes32 certificateHash = keccak256(abi.encodePacked(
            studentName,
            courseName,
            institution,
            issueDate
        ));

        // Check for duplicate certificate
        require(!_certificateExists[certificateHash], "EduProofCertificate: certificate already exists");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _studentHashes[tokenId] = studentHash;
        _certificateExists[certificateHash] = true;

        emit Minted(tokenId, msg.sender, studentHash, certificateHash);
    }

    /// @notice Revokes a certificate
    /// @dev Only callable by INSTITUTION_ROLE or the token owner
    /// @param tokenId The ID of the token to revoke
    /// @param reason The reason for revocation
    function revoke(uint256 tokenId, string memory reason) external {
        require(_ownerOf(tokenId) != address(0), "EduProofCertificate: token does not exist");
        require(
            hasRole(INSTITUTION_ROLE, msg.sender) || ownerOf(tokenId) == msg.sender,
            "EduProofCertificate: caller is not institution or owner"
        );
        require(!_revocations[tokenId].isRevoked, "EduProofCertificate: already revoked");
        require(bytes(reason).length > 0, "EduProofCertificate: empty reason");

        _revocations[tokenId] = RevocationInfo({
            isRevoked: true,
            reason: reason,
            timestamp: block.timestamp
        });

        emit Revoked(tokenId, reason);
    }

    /// @notice Returns the status of a certificate
    /// @param tokenId The ID of the token to check
    /// @return The status string ("Active" or "Revoked")
    function status(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "EduProofCertificate: token does not exist");
        
        if (_revocations[tokenId].isRevoked) {
            return "Revoked";
        }
        return "Active";
    }

    /// @notice Returns the revocation information for a certificate
    /// @param tokenId The ID of the token to check
    /// @return isRevoked Whether the certificate is revoked
    /// @return reason The reason for revocation
    /// @return timestamp The timestamp of revocation
    function getRevocationInfo(uint256 tokenId) 
        external 
        view 
        returns (bool isRevoked, string memory reason, uint256 timestamp) 
    {
        require(_ownerOf(tokenId) != address(0), "EduProofCertificate: token does not exist");
        
        RevocationInfo memory info = _revocations[tokenId];
        return (info.isRevoked, info.reason, info.timestamp);
    }

    /// @notice Returns the student hash for a certificate
    /// @param tokenId The ID of the token to check
    /// @return The student hash
    function getStudentHash(uint256 tokenId) external view returns (bytes32) {
        require(_ownerOf(tokenId) != address(0), "EduProofCertificate: token does not exist");
        return _studentHashes[tokenId];
    }

    /// @notice Returns the total number of certificates minted
    /// @return The total supply
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @notice Checks if a certificate with the given data already exists
    /// @param studentName The student's name
    /// @param courseName The course name
    /// @param institution The institution name
    /// @param issueDate The issue date
    /// @return True if the certificate exists
    function certificateExists(
        string memory studentName,
        string memory courseName,
        string memory institution,
        string memory issueDate
    ) external view returns (bool) {
        bytes32 certificateHash = keccak256(abi.encodePacked(
            studentName,
            courseName,
            institution,
            issueDate
        ));
        return _certificateExists[certificateHash];
    }

    /// @notice Override supportsInterface to support AccessControl and ERC721
    /// @param interfaceId The interface identifier
    /// @return True if the interface is supported
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
