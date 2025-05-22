// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";
import "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";

// ===============================
// Token Authority Contract for Kernel 1593
// This contract is specifically configured for Kernel ID 1593
// which provides token allocation recommendations via getRecommendedTokenAllocation()
// returning uint8 values representing allocation percentages
// ===============================

contract TokenAuthority is Ownable {
    Keypair private signingKeypair;
    Keypair private accessKeypair;
    bytes32 private signingKeypairRetrievalPassword;
    
    // Threshold for token allocation recommendation (0-100)
    uint8 public allocationThreshold = 50; // Default: require allocation >= 50%
    
    struct Keypair {
        bytes pubKey;
        bytes privKey;
    }
    
    struct Execution {
        uint256 kernelId;
        bytes result;
        bytes proof;
        bool isValidated;
        bool opinion;
        string opinionDetails;
        string err;
    }

    mapping(address => bool) private whitelist; // krnlNodePubKey to bool
    mapping(bytes32 => bool) private runtimeDigests; // runtimeDigest to bool
    mapping(uint256 => bool) private kernels; // kernelId to bool

    event AllocationThresholdUpdated(uint8 oldThreshold, uint8 newThreshold);
    event KernelValidated(uint256 kernelId, uint8 allocation, bool passed);

    constructor(address initialOwner) Ownable(initialOwner) {
        signingKeypair = _generateKey();
        accessKeypair = _generateKey();
        
        // Set allowed kernel - Kernel 1593 for token allocation recommendations
        kernels[1593] = true;

        // Set node whitelist (update with actual node addresses as provided by KRNL platform)
        whitelist[address(0xc770EAc29244C1F88E14a61a6B99d184bfAe93f5)] = true;
        
        // Set runtime digest (update with actual runtime digest from KRNL platform)
        runtimeDigests[
            0x876924e18dd46dd3cbcad570a87137bbd828a7d0f3cad309f78ad2c9402eeeb7
        ] = true;
    }

    modifier onlyAuthorized(bytes calldata auth) {
        (
            bytes32 entryId,
            bytes memory accessToken,
            bytes32 runtimeDigest,
            bytes memory runtimeDigestSignature,
            uint256 nonce,
            uint256 blockTimeStamp,
            bytes memory authSignature
        ) = abi.decode(
                auth,
                (bytes32, bytes, bytes32, bytes, uint256, uint256, bytes)
            );
        require(_verifyAccessToken(entryId, accessToken), "Invalid access token");
        require(_verifyRuntimeDigest(runtimeDigest, runtimeDigestSignature), "Invalid runtime digest");
        _;
    }
    
    modifier onlyValidated(bytes calldata executionPlan) {
        require(_verifyExecutionPlan(executionPlan), "Execution plan not validated");
        _;
    }
    
    modifier onlyAllowedKernel(uint256 kernelId) {
        require(kernels[kernelId], "Kernel not allowed");
        _;
    }

    /**
     * @dev Set the minimum allocation threshold required for validation
     * @param _threshold The minimum allocation percentage (0-100)
     */
    function setAllocationThreshold(uint8 _threshold) external onlyOwner {
        require(_threshold <= 100, "Threshold must be <= 100");
        uint8 oldThreshold = allocationThreshold;
        allocationThreshold = _threshold;
        emit AllocationThresholdUpdated(oldThreshold, _threshold);
    }

    /**
     * @dev Validate execution results from Kernel 1593
     * @param executionPlan The execution plan containing kernel results
     * @return Encoded validated execution results
     */
    function _validateExecution(
        bytes calldata executionPlan
    ) external returns (bytes memory) {
        Execution[] memory _executions = abi.decode(
            executionPlan,
            (Execution[])
        );

        for (uint256 i = 0; i < _executions.length; i++) {
            // Process Kernel 1593 - Token Allocation Recommendation
            if (_executions[i].kernelId == 1593) {
                // Decode the uint8 allocation result from the kernel
                uint8 recommendedAllocation = abi.decode(_executions[i].result, (uint8));
                
                // Validate against threshold
                if (recommendedAllocation >= allocationThreshold) {
                    _executions[i].isValidated = true;
                    _executions[i].opinion = true;
                    _executions[i].opinionDetails = string(abi.encodePacked(
                        "Allocation recommendation: ", 
                        _uint8ToString(recommendedAllocation),
                        "% (meets threshold: ",
                        _uint8ToString(allocationThreshold),
                        "%)"
                    ));
                } else {
                    _executions[i].isValidated = false;
                    _executions[i].opinion = false;
                    _executions[i].opinionDetails = string(abi.encodePacked(
                        "Allocation recommendation: ", 
                        _uint8ToString(recommendedAllocation),
                        "% (below threshold: ",
                        _uint8ToString(allocationThreshold),
                        "%)"
                    ));
                }
                
                emit KernelValidated(1593, recommendedAllocation, _executions[i].opinion);
            }
            
            // Add support for additional kernels if needed
            // Example for another kernel:
            /*
            else if (_executions[i].kernelId == ANOTHER_KERNEL_ID) {
                // Handle different return type as needed
                bool result = abi.decode(_executions[i].result, (bool));
                _executions[i].isValidated = true;
                _executions[i].opinion = result;
                _executions[i].opinionDetails = result ? "Condition met" : "Condition not met";
            }
            */
        }
        
        return abi.encode(_executions);
    }

    /**
     * @dev Convert uint8 to string for logging purposes
     */
    function _uint8ToString(uint8 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint8 temp = value;
        uint8 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint8(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    function _generateKey() private view returns (Keypair memory) {
        bytes memory seed = Sapphire.randomBytes(32, "");
        (bytes memory pubKey, bytes memory privKey) = Sapphire
            .generateSigningKeyPair(
                Sapphire.SigningAlg.Secp256k1PrehashedKeccak256,
                seed
            );
        return Keypair(pubKey, privKey);
    }

    function _verifyAccessToken(
        bytes32 entryId,
        bytes memory accessToken
    ) private view returns (bool) {
        bytes memory digest = abi.encodePacked(keccak256(abi.encode(entryId)));
        return
            Sapphire.verify(
                Sapphire.SigningAlg.Secp256k1PrehashedKeccak256,
                accessKeypair.pubKey,
                digest,
                "",
                accessToken
            );
    }

    function _verifyRuntimeDigest(
        bytes32 runtimeDigest,
        bytes memory runtimeDigestSignature
    ) private view returns (bool) {
        require(runtimeDigests[runtimeDigest], "Runtime digest not whitelisted");
        address recoverPubKeyAddr = ECDSA.recover(
            runtimeDigest,
            runtimeDigestSignature
        );
        return whitelist[recoverPubKeyAddr];
    }

    function _verifyExecutionPlan(
        bytes calldata executionPlan
    ) private pure returns (bool) {
        Execution[] memory executions = abi.decode(
            executionPlan,
            (Execution[])
        );
        for (uint256 i = 0; i < executions.length; i++) {
            if (!executions[i].isValidated) {
                return false;
            }
        }
        return true;
    }

    function _getFinalOpinion(
        bytes calldata executionPlan
    ) private pure returns (bool) {
        Execution[] memory executions = abi.decode(
            executionPlan,
            (Execution[])
        );
        for (uint256 i = 0; i < executions.length; i++) {
            if (!executions[i].opinion) {
                return false;
            }
        }
        return true;
    }

    // Setter functions for contract configuration
    function setSigningKeypair(
        bytes calldata pubKey,
        bytes calldata privKey
    ) external onlyOwner {
        signingKeypair = Keypair(pubKey, privKey);
    }

    function setSigningKeypairRetrievalPassword(
        string calldata _password
    ) external onlyOwner {
        signingKeypairRetrievalPassword = keccak256(
            abi.encodePacked(_password)
        );
    }

    function setWhitelist(
        address krnlNodePubKey,
        bool allowed
    ) external onlyOwner {
        whitelist[krnlNodePubKey] = allowed;
    }

    function setRuntimeDigest(
        bytes32 runtimeDigest,
        bool allowed
    ) external onlyOwner {
        runtimeDigests[runtimeDigest] = allowed;
    }

    function setKernel(uint256 kernelId, bool allowed) external onlyOwner {
        kernels[kernelId] = allowed;
    }

    // Getter functions
    function getSigningKeypairPublicKey()
        external
        view
        returns (bytes memory, address)
    {
        address signingKeypairAddress = EthereumUtils
            .k256PubkeyToEthereumAddress(signingKeypair.pubKey);
        return (signingKeypair.pubKey, signingKeypairAddress);
    }

    function getSigningKeypairPrivateKey(
        string calldata _password
    ) external view onlyOwner returns (bytes memory) {
        require(
            signingKeypairRetrievalPassword ==
                keccak256(abi.encodePacked(_password)),
            "Invalid password"
        );
        return signingKeypair.privKey;
    }

    function getAllocationThreshold() external view returns (uint8) {
        return allocationThreshold;
    }

    // Core functionality functions
    function registerdApp(
        bytes32 entryId
    ) external view returns (bytes memory) {
        bytes memory digest = abi.encodePacked(keccak256(abi.encode(entryId)));
        bytes memory accessToken = Sapphire.sign(
            Sapphire.SigningAlg.Secp256k1PrehashedKeccak256,
            accessKeypair.privKey,
            digest,
            ""
        );
        return accessToken;
    }

    function isKernelAllowed(
        bytes calldata auth,
        uint256 kernelId
    ) external view onlyAuthorized(auth) returns (bool) {
        return kernels[kernelId];
    }

    function getOpinion(
        bytes calldata auth,
        bytes calldata executionPlan
    ) external onlyAuthorized(auth) returns (bytes memory) {
        try this._validateExecution(executionPlan) returns (
            bytes memory result
        ) {
            return result;
        } catch {
            return executionPlan;
        }
    }

    function sign(
        bytes calldata auth,
        address senderAddress,
        bytes calldata executionPlan,
        bytes calldata functionParams,
        bytes calldata kernelParams,
        bytes calldata kernelResponses
    )
        external
        onlyValidated(executionPlan)
        onlyAuthorized(auth)
        returns (bytes memory, bytes32, bytes memory, bool)
    {
        // Only decode the nonce value that we actually use
        (,,,, uint256 nonce,,) = abi.decode(
                auth,
                (bytes32, bytes, bytes32, bytes, uint256, uint256, bytes)
            );
            
        // Compute kernelResponsesDigest
        bytes32 kernelResponsesDigest = keccak256(
            abi.encodePacked(kernelResponses, senderAddress)
        );
        bytes memory kernelResponsesSignature = Sapphire.sign(
            Sapphire.SigningAlg.Secp256k1PrehashedKeccak256,
            signingKeypair.privKey,
            abi.encodePacked(kernelResponsesDigest),
            ""
        );
        (, SignatureRSV memory kernelResponsesRSV) = EthereumUtils
            .toEthereumSignature(
                signingKeypair.pubKey,
                kernelResponsesDigest,
                kernelResponsesSignature
            );
        bytes memory kernelResponsesSignatureEth = abi.encodePacked(
            kernelResponsesRSV.r,
            kernelResponsesRSV.s,
            uint8(kernelResponsesRSV.v)
        );
        
        bytes32 functionParamsDigest = keccak256(functionParams);
        bytes32 kernelParamsDigest = keccak256(
            abi.encodePacked(kernelParams, senderAddress)
        );
        bool finalOpinion = _getFinalOpinion(executionPlan);
        
        // Compute dataDigest
        bytes32 dataDigest = keccak256(
            abi.encodePacked(
                functionParamsDigest,
                kernelParamsDigest,
                senderAddress,
                nonce,
                finalOpinion
            )
        );
        
        bytes memory signature = Sapphire.sign(
            Sapphire.SigningAlg.Secp256k1PrehashedKeccak256,
            signingKeypair.privKey,
            abi.encodePacked(dataDigest),
            ""
        );
        (, SignatureRSV memory rsv) = EthereumUtils.toEthereumSignature(
            signingKeypair.pubKey,
            dataDigest,
            signature
        );
        bytes memory signatureToken = abi.encodePacked(
            rsv.r,
            rsv.s,
            uint8(rsv.v)
        );
        
        return (
            kernelResponsesSignatureEth,
            kernelParamsDigest,
            signatureToken,
            finalOpinion
        );
    }
}