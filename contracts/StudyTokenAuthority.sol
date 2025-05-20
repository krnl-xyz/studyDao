// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./StudyToken.sol";
import {KRNL, KrnlPayload, KernelParameter, KernelResponse} from "./KRNL.sol";

/**
 * @title StudyTokenAuthority
 * @dev Contract for managing token authority operations for StudyDAO with KRNL integration
 */
contract StudyTokenAuthority is KRNL {
    // StudyToken contract reference
    StudyToken public studyToken;
    
    // Address of the contract admin
    address public admin;
    
    // Mapping to track authorized contracts
    mapping(address => bool) public authorizedContracts;
    
    // Mapping to track user token limits
    mapping(address => uint256) public userDailyLimits;
    
    // Default daily limit
    uint256 public defaultDailyLimit;
    
    // Mapping to track user daily usage
    mapping(address => mapping(uint256 => uint256)) public userDailyUsage;
    
    // Events
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);
    event UserLimitSet(address indexed user, uint256 limit);
    event TokenOperationApproved(address indexed user, uint256 amount, string operation);
    event TokenOperationDenied(address indexed user, uint256 amount, string operation);
    event KernelOperationResult(address indexed user, uint256 kernelId, uint256 score);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }
    
    /**
     * @dev Constructor to initialize the token authority with KRNL support
     * @param _studyTokenAddress Address of the StudyToken contract
     * @param _defaultDailyLimit Default daily limit for users
     * @param _tokenAuthorityPublicKey Address of the token authority public key for KRNL
     */
    constructor(
        address _studyTokenAddress, 
        uint256 _defaultDailyLimit,
        address _tokenAuthorityPublicKey
    ) KRNL(_tokenAuthorityPublicKey) {
        require(_studyTokenAddress != address(0), "Invalid token address");
        admin = msg.sender;
        studyToken = StudyToken(_studyTokenAddress);
        defaultDailyLimit = _defaultDailyLimit;
        
        // Automatically authorize the deployer
        authorizedContracts[msg.sender] = true;
        emit ContractAuthorized(msg.sender);
    }
    
    /**
     * @dev Authorize a contract to interact with the token authority
     * @param contractAddress Address of the contract to authorize
     */
    function authorizeContract(address contractAddress) external onlyAdmin {
        require(contractAddress != address(0), "Invalid contract address");
        require(!authorizedContracts[contractAddress], "Contract already authorized");
        
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    /**
     * @dev Deauthorize a contract
     * @param contractAddress Address of the contract to deauthorize
     */
    function deauthorizeContract(address contractAddress) external onlyAdmin {
        require(authorizedContracts[contractAddress], "Contract not authorized");
        
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }
    
    /**
     * @dev Set daily token limit for a specific user
     * @param user Address of the user
     * @param limit Daily limit amount
     */
    function setUserDailyLimit(address user, uint256 limit) external onlyAdmin {
        require(user != address(0), "Invalid user address");
        
        userDailyLimits[user] = limit;
        emit UserLimitSet(user, limit);
    }
    
    /**
     * @dev Set default daily limit for all users
     * @param limit Default daily limit amount
     */
    function setDefaultDailyLimit(uint256 limit) external onlyAdmin {
        defaultDailyLimit = limit;
    }
    
    /**
     * @dev Get the current day number (for daily limit tracking)
     * @return The current day number
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }
    
    /**
     * @dev Get a user's effective daily limit
     * @param user Address of the user
     * @return The user's daily limit
     */
    function getUserDailyLimit(address user) public view returns (uint256) {
        uint256 userLimit = userDailyLimits[user];
        return userLimit > 0 ? userLimit : defaultDailyLimit;
    }
    
    /**
     * @dev Get a user's remaining daily limit
     * @param user Address of the user
     * @return The user's remaining daily limit
     */
    function getRemainingDailyLimit(address user) public view returns (uint256) {
        uint256 dayNumber = getCurrentDay();
        uint256 usedToday = userDailyUsage[user][dayNumber];
        uint256 limit = getUserDailyLimit(user);
        
        return usedToday >= limit ? 0 : limit - usedToday;
    }
    
    /**
     * @dev Authorize a token mint operation with KRNL verification
     * @param krnlPayload The KRNL payload for verification
     * @param to Recipient of the tokens
     * @param amount Amount of tokens to mint
     * @return Whether the operation is authorized
     */
    function authorizeMintWithKRNL(
        KrnlPayload memory krnlPayload,
        address to, 
        uint256 amount
    ) external onlyAuthorized(krnlPayload, abi.encode(to, amount)) onlyAuthorizedContract() returns (bool) {
        uint256 dayNumber = getCurrentDay();
        uint256 userLimit = getUserDailyLimit(to);
        uint256 usedToday = userDailyUsage[to][dayNumber];
        
        // Decode response from kernel
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        uint256 kernelScore = 0;
        
        // Process kernel responses - adjust kernelId as needed for your use case
        for (uint i = 0; i < kernelResponses.length; i++) {
            // Check for specific kernel ID - replace 337 with your kernel ID
            if (kernelResponses[i].kernelId == 337) {
                // Decode the result based on your kernel's response format
                kernelScore = abi.decode(kernelResponses[i].result, (uint256));
                emit KernelOperationResult(to, kernelResponses[i].kernelId, kernelScore);
            }
        }
        
        // You can use kernelScore in your logic if needed
        if (usedToday + amount <= userLimit) {
            userDailyUsage[to][dayNumber] = usedToday + amount;
            emit TokenOperationApproved(to, amount, "mint");
            return true;
        } else {
            emit TokenOperationDenied(to, amount, "mint");
            return false;
        }
    }
    
    /**
     * @dev Original authorize mint function (keeping for compatibility)
     */
    function authorizeMint(address to, uint256 amount) external onlyAuthorizedContract() returns (bool) {
        uint256 dayNumber = getCurrentDay();
        uint256 userLimit = getUserDailyLimit(to);
        uint256 usedToday = userDailyUsage[to][dayNumber];
        
        if (usedToday + amount <= userLimit) {
            userDailyUsage[to][dayNumber] = usedToday + amount;
            emit TokenOperationApproved(to, amount, "mint");
            return true;
        } else {
            emit TokenOperationDenied(to, amount, "mint");
            return false;
        }
    }
    
    /**
     * @dev Authorize a token transfer operation with KRNL verification
     * @param krnlPayload The KRNL payload for verification
     * @param from Sender of the tokens
     * @param to Recipient of the tokens
     * @param amount Amount of tokens to transfer
     * @return Whether the operation is authorized
     */
    function authorizeTransferWithKRNL(
        KrnlPayload memory krnlPayload,
        address from, 
        address to, 
        uint256 amount
    ) external onlyAuthorized(krnlPayload, abi.encode(from, to, amount)) onlyAuthorizedContract() returns (bool) {
        // Decode response from kernel
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        uint256 kernelScore = 0;
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            // Check for specific kernel ID - replace 337 with your kernel ID
            if (kernelResponses[i].kernelId == 337) {
                // Decode the result based on your kernel's response format
                kernelScore = abi.decode(kernelResponses[i].result, (uint256));
                emit KernelOperationResult(from, kernelResponses[i].kernelId, kernelScore);
            }
        }
        
        // You can implement additional logic based on kernelScore here
        emit TokenOperationApproved(from, amount, "transfer");
        return true;
    }
    
    /**
     * @dev Original authorize transfer function (keeping for compatibility)
     */
    function authorizeTransfer(address from, address to, uint256 amount) external onlyAuthorizedContract() returns (bool) {
        // For this simple implementation, we'll always authorize transfers
        emit TokenOperationApproved(from, amount, "transfer");
        return true;
    }
    
    /**
     * @dev Connect to an existing StudyToken contract
     * @param _studyTokenAddress Address of the StudyToken contract
     */
    function setStudyToken(address _studyTokenAddress) external onlyAdmin {
        require(_studyTokenAddress != address(0), "Invalid token address");
        studyToken = StudyToken(_studyTokenAddress);
    }
    
    /**
     * @dev Request the token contract to add this authority as a minter
     * @return Whether the operation was successful
     */
    function requestMinterRole() external onlyAdmin returns (bool) {
        try studyToken.addMinter(address(this)) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Mint tokens through the authority with KRNL verification
     * @param krnlPayload The KRNL payload for verification
     * @param to Recipient of the tokens
     * @param amount Amount of tokens to mint
     * @return Whether the operation was successful
     */
    function mintTokensWithKRNL(
        KrnlPayload memory krnlPayload,
        address to, 
        uint256 amount
    ) external onlyAdmin onlyAuthorized(krnlPayload, abi.encode(to, amount)) returns (bool) {
        // Decode response from kernel
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        uint256 kernelScore = 0;
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            // Check for specific kernel ID - replace 337 with your kernel ID
            if (kernelResponses[i].kernelId == 337) {
                // Decode the result based on your kernel's response format
                kernelScore = abi.decode(kernelResponses[i].result, (uint256));
                emit KernelOperationResult(to, kernelResponses[i].kernelId, kernelScore);
            }
        }
        
        try studyToken.mintReward(to, amount) {
            emit TokenOperationApproved(to, amount, "authorityMint");
            return true;
        } catch {
            emit TokenOperationDenied(to, amount, "authorityMint");
            return false;
        }
    }
    
    /**
     * @dev Original mint tokens function (keeping for compatibility)
     */
    function mintTokens(address to, uint256 amount) external onlyAdmin returns (bool) {
        try studyToken.mintReward(to, amount) {
            emit TokenOperationApproved(to, amount, "authorityMint");
            return true;
        } catch {
            emit TokenOperationDenied(to, amount, "authorityMint");
            return false;
        }
    }
    
    /**
     * @dev Add a new StudyGroup contract as an authorized minter on the token
     * @param studyGroupAddress Address of the StudyGroup contract
     * @return Whether the operation was successful
     */
    function authorizeStudyGroupAsMinter(address studyGroupAddress) external onlyAdmin returns (bool) {
        require(studyGroupAddress != address(0), "Invalid study group address");
        
        try studyToken.addMinter(studyGroupAddress) {
            emit ContractAuthorized(studyGroupAddress);
            return true;
        } catch {
            return false;
        }
    }
}