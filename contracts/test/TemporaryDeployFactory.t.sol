// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "../src/TemporaryDeployFactory.sol";
import "../src/EduProofCertificate.sol";
import "../src/InstitutionRegistry.sol";

/// @title TemporaryDeployFactoryTest
/// @notice Comprehensive test suite for EduProof system
contract TemporaryDeployFactoryTest is Test {
    EduProofCertificate public certificate;
    InstitutionRegistry public registry;
    
    address public admin;
    address public institution1;
    address public institution2;
    address public student1;
    address public student2;
    address public unauthorized;

    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Copy event declarations for testing
    event Minted(uint256 indexed tokenId, address indexed institution, bytes32 studentHash, bytes32 certificateHash);
    event Revoked(uint256 indexed tokenId, string reason);
    event InstitutionRegistered(address indexed institutionAddress, string name);
    event InstitutionRevoked(address indexed institutionAddress);
    event ContractsDeployed(
        address indexed deployer,
        string[] contractNames,
        address[] contractAddresses
    );

    function setUp() public {
        // Initialize test addresses
        admin = address(this);
        institution1 = makeAddr("institution1");
        institution2 = makeAddr("institution2");
        student1 = makeAddr("student1");
        student2 = makeAddr("student2");
        unauthorized = makeAddr("unauthorized");

        // Fund addresses
        vm.deal(admin, 100 ether);
        vm.deal(institution1, 10 ether);
        vm.deal(institution2, 10 ether);

        // Deploy contracts using factory
        vm.recordLogs();
        TemporaryDeployFactory factory = new TemporaryDeployFactory();

        // Parse ContractsDeployed event
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");

        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature && logs[i].emitter == address(factory)) {
                (string[] memory contractNames, address[] memory contractAddresses) =
                    abi.decode(logs[i].data, (string[], address[]));

                // Assign contracts based on names
                for (uint256 j = 0; j < contractNames.length; j++) {
                    if (keccak256(bytes(contractNames[j])) == keccak256(bytes("InstitutionRegistry"))) {
                        registry = InstitutionRegistry(contractAddresses[j]);
                    } else if (keccak256(bytes(contractNames[j])) == keccak256(bytes("EduProofCertificate"))) {
                        certificate = EduProofCertificate(contractAddresses[j]);
                    }
                }
                break;
            }
        }

        // Verify contracts were deployed
        assertTrue(address(registry) != address(0), "Registry not deployed");
        assertTrue(address(certificate) != address(0), "Certificate not deployed");
    }

    // ============ Factory Deployment Tests ============

    function testFactoryDeployment() public {
        // Verify factory emits correct event
        vm.recordLogs();
        TemporaryDeployFactory factory = new TemporaryDeployFactory();

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSignature = keccak256("ContractsDeployed(address,string[],address[])");

        bool eventFound = false;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSignature) {
                eventFound = true;
                address deployer = address(uint160(uint256(logs[i].topics[1])));
                assertEq(deployer, address(this), "Deployer mismatch");

                (string[] memory contractNames, address[] memory contractAddresses) =
                    abi.decode(logs[i].data, (string[], address[]));

                assertEq(contractNames.length, 2, "Should deploy 2 contracts");
                assertEq(contractAddresses.length, 2, "Should have 2 addresses");
                assertTrue(contractAddresses[0] != address(0), "Registry address is zero");
                assertTrue(contractAddresses[1] != address(0), "Certificate address is zero");
            }
        }
        assertTrue(eventFound, "ContractsDeployed event not emitted");
    }

    // ============ InstitutionRegistry Tests ============

    function testRegisterInstitution() public {
        vm.expectEmit(true, false, false, true);
        emit InstitutionRegistered(institution1, "MIT");

        registry.registerInstitution(institution1, "MIT", "did:example:mit123");

        assertTrue(registry.isActive(institution1), "Institution should be active");

        InstitutionRegistry.Institution memory inst = registry.getInstitution(institution1);
        assertEq(inst.name, "MIT", "Name mismatch");
        assertEq(inst.didURI, "did:example:mit123", "DID URI mismatch");
        assertTrue(inst.isActive, "Should be active");
        assertGt(inst.registeredAt, 0, "Registration timestamp should be set");
    }

    function testRegisterMultipleInstitutions() public {
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
        registry.registerInstitution(institution2, "Stanford", "did:example:stanford456");

        assertTrue(registry.isActive(institution1), "Institution1 should be active");
        assertTrue(registry.isActive(institution2), "Institution2 should be active");

        assertEq(registry.getInstitutionCount(), 2, "Should have 2 institutions");
    }

    function testRevokeInstitution() public {
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");

        vm.expectEmit(true, false, false, false);
        emit InstitutionRevoked(institution1);

        registry.revokeInstitution(institution1);

        assertFalse(registry.isActive(institution1), "Institution should be inactive");
    }

    function testReRegisterRevokedInstitution() public {
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
        registry.revokeInstitution(institution1);

        // Re-register with new information
        registry.registerInstitution(institution1, "MIT Updated", "did:example:mit789");

        assertTrue(registry.isActive(institution1), "Institution should be active again");
        InstitutionRegistry.Institution memory inst = registry.getInstitution(institution1);
        assertEq(inst.name, "MIT Updated", "Name should be updated");
    }

    function testGetAllInstitutions() public {
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
        registry.registerInstitution(institution2, "Stanford", "did:example:stanford456");

        address[] memory institutions = registry.getAllInstitutions();
        assertEq(institutions.length, 2, "Should return 2 institutions");
        assertEq(institutions[0], institution1, "First institution mismatch");
        assertEq(institutions[1], institution2, "Second institution mismatch");
    }

    // ============ InstitutionRegistry Access Control Tests ============

    function testRegisterInstitutionUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
    }

    function testRevokeInstitutionUnauthorized() public {
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");

        vm.prank(unauthorized);
        vm.expectRevert();
        registry.revokeInstitution(institution1);
    }

    // ============ InstitutionRegistry Edge Cases ============

    function testRegisterInstitutionZeroAddress() public {
        vm.expectRevert("InstitutionRegistry: zero address");
        registry.registerInstitution(address(0), "MIT", "did:example:mit123");
    }

    function testRegisterInstitutionEmptyName() public {
        vm.expectRevert("InstitutionRegistry: empty name");
        registry.registerInstitution(institution1, "", "did:example:mit123");
    }

    function testRegisterInstitutionEmptyDID() public {
        vm.expectRevert("InstitutionRegistry: empty DID URI");
        registry.registerInstitution(institution1, "MIT", "");
    }

    function testRegisterInstitutionAlreadyActive() public {
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");

        vm.expectRevert("InstitutionRegistry: institution already active");
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
    }

    function testRevokeInstitutionNotActive() public {
        vm.expectRevert("InstitutionRegistry: institution not active");
        registry.revokeInstitution(institution1);
    }

    function testGetInstitutionNotFound() public {
        vm.expectRevert("InstitutionRegistry: institution not found");
        registry.getInstitution(institution1);
    }

    // ============ EduProofCertificate Minting Tests ============

    function testMintCertificate() public {
        // Grant institution role
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        assertEq(certificate.ownerOf(0), student1, "Owner mismatch");
        assertEq(certificate.tokenURI(0), "ipfs://certificate1", "Token URI mismatch");
        assertEq(certificate.getStudentHash(0), studentHash, "Student hash mismatch");
        assertEq(certificate.totalSupply(), 1, "Total supply should be 1");
    }

    function testMintMultipleCertificates() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash1 = keccak256(abi.encodePacked("John Doe"));
        bytes32 studentHash2 = keccak256(abi.encodePacked("Jane Smith"));

        vm.startPrank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash1,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );
        certificate.safeMint(
            student2,
            "ipfs://certificate2",
            studentHash2,
            "Jane Smith",
            "Data Science 201",
            "MIT",
            "2024-01-16"
        );
        vm.stopPrank();

        assertEq(certificate.totalSupply(), 2, "Total supply should be 2");
        assertEq(certificate.ownerOf(0), student1, "Owner 0 mismatch");
        assertEq(certificate.ownerOf(1), student2, "Owner 1 mismatch");
    }

    // ============ EduProofCertificate Status Tests ============

    function testCertificateStatusActive() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        assertEq(certificate.status(0), "Active", "Status should be Active");
    }

    function testCertificateStatusRevoked() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(institution1);
        certificate.revoke(0, "Fraudulent certificate");

        assertEq(certificate.status(0), "Revoked", "Status should be Revoked");
    }

    // ============ EduProofCertificate Revocation Tests ============

    function testRevokeCertificateByInstitution() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.expectEmit(true, false, false, true);
        emit Revoked(0, "Fraudulent certificate");

        vm.prank(institution1);
        certificate.revoke(0, "Fraudulent certificate");

        (bool isRevoked, string memory reason, uint256 timestamp) = certificate.getRevocationInfo(0);
        assertTrue(isRevoked, "Should be revoked");
        assertEq(reason, "Fraudulent certificate", "Reason mismatch");
        assertGt(timestamp, 0, "Timestamp should be set");
    }

    function testRevokeCertificateByOwner() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(student1);
        certificate.revoke(0, "Lost certificate");

        (bool isRevoked, string memory reason,) = certificate.getRevocationInfo(0);
        assertTrue(isRevoked, "Should be revoked");
        assertEq(reason, "Lost certificate", "Reason mismatch");
    }

    // ============ EduProofCertificate Access Control Tests ============

    function testMintCertificateUnauthorized() public {
        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(unauthorized);
        vm.expectRevert();
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );
    }

    function testRevokeCertificateUnauthorized() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(unauthorized);
        vm.expectRevert("EduProofCertificate: caller is not institution or owner");
        certificate.revoke(0, "Unauthorized revocation");
    }

    // ============ EduProofCertificate Edge Cases ============

    function testMintToZeroAddress() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: mint to zero address");
        certificate.safeMint(
            address(0),
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );
    }

    function testMintEmptyTokenURI() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: empty tokenURI");
        certificate.safeMint(
            student1,
            "",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );
    }

    function testMintInvalidStudentHash() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: invalid student hash");
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            bytes32(0),
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );
    }

    function testRevokeNonexistentToken() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: token does not exist");
        certificate.revoke(999, "Does not exist");
    }

    function testRevokeAlreadyRevoked() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(institution1);
        certificate.revoke(0, "First revocation");

        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: already revoked");
        certificate.revoke(0, "Second revocation");
    }

    function testRevokeEmptyReason() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: empty reason");
        certificate.revoke(0, "");
    }

    function testStatusNonexistentToken() public {
        vm.expectRevert("EduProofCertificate: token does not exist");
        certificate.status(999);
    }

    function testGetRevocationInfoNonexistentToken() public {
        vm.expectRevert("EduProofCertificate: token does not exist");
        certificate.getRevocationInfo(999);
    }

    function testGetStudentHashNonexistentToken() public {
        vm.expectRevert("EduProofCertificate: token does not exist");
        certificate.getStudentHash(999);
    }

    // ============ Integration Tests ============

    function testFullWorkflow() public {
        // 1. Register institution
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
        assertTrue(registry.isActive(institution1), "Institution should be active");

        // 2. Grant institution role in certificate contract
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        // 3. Mint certificate
        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        assertEq(certificate.ownerOf(0), student1, "Owner mismatch");
        assertEq(certificate.status(0), "Active", "Status should be Active");

        // 4. Revoke certificate
        vm.prank(institution1);
        certificate.revoke(0, "Fraudulent certificate");

        assertEq(certificate.status(0), "Revoked", "Status should be Revoked");

        // 5. Revoke institution
        registry.revokeInstitution(institution1);
        assertFalse(registry.isActive(institution1), "Institution should be inactive");
    }

    function testMultipleInstitutionsWorkflow() public {
        // Register two institutions
        registry.registerInstitution(institution1, "MIT", "did:example:mit123");
        registry.registerInstitution(institution2, "Stanford", "did:example:stanford456");

        // Grant roles
        certificate.grantRole(INSTITUTION_ROLE, institution1);
        certificate.grantRole(INSTITUTION_ROLE, institution2);

        // Each institution mints certificates
        bytes32 studentHash1 = keccak256(abi.encodePacked("John Doe"));
        bytes32 studentHash2 = keccak256(abi.encodePacked("Jane Smith"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash1,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(institution2);
        certificate.safeMint(
            student2,
            "ipfs://certificate2",
            studentHash2,
            "Jane Smith",
            "Data Science 201",
            "Stanford",
            "2024-01-16"
        );

        assertEq(certificate.totalSupply(), 2, "Should have 2 certificates");
        assertEq(certificate.ownerOf(0), student1, "Owner 0 mismatch");
        assertEq(certificate.ownerOf(1), student2, "Owner 1 mismatch");
    }

    // ============ Fuzz Tests ============

    function testFuzzMintCertificate(address to, string memory tokenURI) public {
        vm.assume(to != address(0));
        vm.assume(bytes(tokenURI).length > 0);
        // Assume address has code size 0 (EOA) to avoid ERC721Receiver issues
        vm.assume(to.code.length == 0);

        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("Fuzz Student"));

        vm.prank(institution1);
        certificate.safeMint(
            to,
            tokenURI,
            studentHash,
            "Fuzz Student",
            "Fuzz Course",
            "Fuzz Institution",
            "2024-01-01"
        );

        assertEq(certificate.ownerOf(0), to, "Owner mismatch");
        assertEq(certificate.tokenURI(0), tokenURI, "Token URI mismatch");
    }

    function testFuzzRegisterInstitution(string memory name, string memory didURI) public {
        vm.assume(bytes(name).length > 0);
        vm.assume(bytes(didURI).length > 0);

        registry.registerInstitution(institution1, name, didURI);

        InstitutionRegistry.Institution memory inst = registry.getInstitution(institution1);
        assertEq(inst.name, name, "Name mismatch");
        assertEq(inst.didURI, didURI, "DID URI mismatch");
    }

    function testFuzzRevokeCertificate(string memory reason) public {
        vm.assume(bytes(reason).length > 0);

        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(institution1);
        certificate.revoke(0, reason);

        (bool isRevoked, string memory storedReason,) = certificate.getRevocationInfo(0);
        assertTrue(isRevoked, "Should be revoked");
        assertEq(storedReason, reason, "Reason mismatch");
    }

    // ============ Anti-Duplication Tests ============

    function testPreventDuplicateCertificate() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        // Mint first certificate
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        // Try to mint duplicate certificate with same data
        vm.prank(institution1);
        vm.expectRevert("EduProofCertificate: certificate already exists");
        certificate.safeMint(
            student2,  // Different recipient
            "ipfs://certificate2",  // Different URI
            studentHash,
            "John Doe",  // Same student
            "Computer Science 101",  // Same course
            "MIT",  // Same institution
            "2024-01-15"  // Same date
        );
    }

    function testAllowDifferentCertificatesForSameStudent() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        // Mint first certificate
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        // Mint second certificate for same student but different course
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate2",
            studentHash,
            "John Doe",  // Same student
            "Data Science 201",  // Different course
            "MIT",
            "2024-01-16"
        );

        assertEq(certificate.totalSupply(), 2, "Should have 2 certificates");
        assertEq(certificate.ownerOf(0), student1, "Owner 0 mismatch");
        assertEq(certificate.ownerOf(1), student1, "Owner 1 mismatch");
    }

    function testCertificateExistsFunction() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        // Check certificate doesn't exist before minting
        assertFalse(
            certificate.certificateExists(
                "John Doe",
                "Computer Science 101",
                "MIT",
                "2024-01-15"
            ),
            "Certificate should not exist yet"
        );

        // Mint certificate
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        // Check certificate exists after minting
        assertTrue(
            certificate.certificateExists(
                "John Doe",
                "Computer Science 101",
                "MIT",
                "2024-01-15"
            ),
            "Certificate should exist now"
        );
    }

    function testDifferentDateAllowsDuplicate() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        // Mint first certificate
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        // Mint certificate with different date (should succeed)
        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate2",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-16"  // Different date
        );

        assertEq(certificate.totalSupply(), 2, "Should have 2 certificates");
    }

    // ============ Gas Optimization Tests ============

    function testGasMintCertificate() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        uint256 gasBefore = gasleft();
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );
        uint256 gasUsed = gasBefore - gasleft();

        // Ensure gas usage is reasonable (adjust threshold as needed)
        assertLt(gasUsed, 300000, "Minting uses too much gas");
    }

    function testGasRevokeCertificate() public {
        certificate.grantRole(INSTITUTION_ROLE, institution1);

        bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

        vm.prank(institution1);
        certificate.safeMint(
            student1,
            "ipfs://certificate1",
            studentHash,
            "John Doe",
            "Computer Science 101",
            "MIT",
            "2024-01-15"
        );

        vm.prank(institution1);
        uint256 gasBefore = gasleft();
        certificate.revoke(0, "Fraudulent certificate");
        uint256 gasUsed = gasBefore - gasleft();

        // Ensure gas usage is reasonable
        assertLt(gasUsed, 100000, "Revocation uses too much gas");
    }
}
