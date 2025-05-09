// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StudyToken.sol";

/**
 * @title StudyTokenAuthority
 * @dev Contract for managing token authority operations for StudyDAO
 */
contract StudyTokenAuthority {
    // StudyToken contract reference
    StudyToken public studyToken;
    
    // Address of the contract owner
    address public owner;
    
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
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }
    
    /**
     * @dev Constructor to initialize the token authority
     * @param _studyTokenAddress Address of the StudyToken contract
     * @param _defaultDailyLimit Default daily limit for users
     */
    constructor(address _studyTokenAddress, uint256 _defaultDailyLimit) {
        require(_studyTokenAddress != address(0), "Invalid token address");
        owner = msg.sender;
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
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        require(!authorizedContracts[contractAddress], "Contract already authorized");
        
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    /**
     * @dev Deauthorize a contract
     * @param contractAddress Address of the contract to deauthorize
     */
    function deauthorizeContract(address contractAddress) external onlyOwner {
        require(authorizedContracts[contractAddress], "Contract not authorized");
        
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }
    
    /**
     * @dev Set daily token limit for a specific user
     * @param user Address of the user
     * @param limit Daily limit amount
     */
    function setUserDailyLimit(address user, uint256 limit) external onlyOwner {
        require(user != address(0), "Invalid user address");
        
        userDailyLimits[user] = limit;
        emit UserLimitSet(user, limit);
    }
    
    /**
     * @dev Set default daily limit for all users
     * @param limit Default daily limit amount
     */
    function setDefaultDailyLimit(uint256 limit) external onlyOwner {
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
     * @dev Authorize a token mint operation
     * @param to Recipient of the tokens
     * @param amount Amount of tokens to mint
     * @return Whether the operation is authorized
     */
    function authorizeMint(address to, uint256 amount) external onlyAuthorized returns (bool) {
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
     * @dev Authorize a token transfer operation
     * @param from Sender of the tokens
     * @param to Recipient of the tokens
     * @param amount Amount of tokens to transfer
     * @return Whether the operation is authorized
     */
    function authorizeTransfer(address from, address to, uint256 amount) external onlyAuthorized returns (bool) {
        // For this simple implementation, we'll always authorize transfers
        // More complex logic could be added here
        emit TokenOperationApproved(from, amount, "transfer");
        return true;
    }
    
    /**
     * @dev Connect to an existing StudyToken contract
     * @param _studyTokenAddress Address of the StudyToken contract
     */
    function setStudyToken(address _studyTokenAddress) external onlyOwner {
        require(_studyTokenAddress != address(0), "Invalid token address");
        studyToken = StudyToken(_studyTokenAddress);
    }
    
    /**
     * @dev Request the token contract to add this authority as a minter
     * @return Whether the operation was successful
     */
    function requestMinterRole() external onlyOwner returns (bool) {
        try studyToken.addMinter(address(this)) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Mint tokens through the authority (if it's a minter)
     * @param to Recipient of the tokens
     * @param amount Amount of tokens to mint
     * @return Whether the operation was successful
     */
    function mintTokens(address to, uint256 amount) external onlyOwner returns (bool) {
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
    function authorizeStudyGroupAsMinter(address studyGroupAddress) external onlyOwner returns (bool) {
        require(studyGroupAddress != address(0), "Invalid study group address");
        
        try studyToken.addMinter(studyGroupAddress) {
            emit ContractAuthorized(studyGroupAddress);
            return true;
        } catch {
            return false;
        }
    }
}