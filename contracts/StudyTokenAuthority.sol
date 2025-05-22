// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IStudyToken
 * @dev Interface for StudyToken contract
 */
interface IStudyToken {
    function mintReward(address to, uint256 amount) external returns (bool);
}

/**
 * @title ITokenAllocationKernel
 * @dev Interface for Kernel 1593 - Token Allocation Kernel
 */
interface ITokenAllocationKernel {
    function getRecommendedTokenAllocation(
        address user,
        uint256 requestedAmount,
        bytes calldata additionalData
    ) external view returns (uint8);
}

/**
 * @title StudyTokenAuthority
 * @dev Refined Token Authority for StudyDAO with direct kernel integration
 * Works with Kernel ID 1593 for token allocation recommendations
 */
contract StudyTokenAuthority is Ownable {
    
    // ============ STATE VARIABLES ============
    
    // StudyToken contract reference
    IStudyToken public studyToken;
    
    // Kernel contract reference
    ITokenAllocationKernel public kernel;
    address public kernelAddress;
    
    // Mapping to track authorized contracts
    mapping(address => bool) public authorizedContracts;
    
    // Mapping to track user token limits
    mapping(address => uint256) public userDailyLimits;
    
    // Default daily limit
    uint256 public defaultDailyLimit;
    
    // Mapping to track user daily usage
    mapping(address => mapping(uint256 => uint256)) public userDailyUsage;
    
    // Minimum allocation threshold (out of 255)
    uint8 public minimumAllocationThreshold = 50;
    
    // Emergency pause functionality
    bool public isPaused = false;
    
    // ============ EVENTS ============
    
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);
    event UserLimitSet(address indexed user, uint256 limit);
    event TokenOperationApproved(address indexed user, uint256 amount, string operation);
    event TokenOperationDenied(address indexed user, uint256 amount, string reason);
    event KernelAllocationResult(address indexed user, uint256 requestedAmount, uint8 allocation);
    event MinimumThresholdUpdated(uint8 oldThreshold, uint8 newThreshold);
    event KernelAddressUpdated(address indexed oldKernel, address indexed newKernel);
    event PauseStatusChanged(bool isPaused);
    
    // ============ MODIFIERS ============
    
    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized contract");
        _;
    }
    
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Constructor initializing StudyDAO token authority
     * @param initialOwner Owner of the contract
     * @param _studyTokenAddress Address of the StudyToken contract
     * @param _kernelAddress Address of the Token Allocation Kernel (1593)
     * @param _defaultDailyLimit Default daily limit for users
     */
    constructor(
        address initialOwner,
        address _studyTokenAddress, 
        address _kernelAddress,
        uint256 _defaultDailyLimit
    ) 
        Ownable(initialOwner) 
    {
        require(_studyTokenAddress != address(0), "Invalid token address");
        require(_kernelAddress != address(0), "Invalid kernel address");
        require(initialOwner != address(0), "Invalid owner address");
        
        studyToken = IStudyToken(_studyTokenAddress);
        kernelAddress = _kernelAddress;
        kernel = ITokenAllocationKernel(_kernelAddress);
        defaultDailyLimit = _defaultDailyLimit;
        
        // Automatically authorize the deployer
        authorizedContracts[initialOwner] = true;
        emit ContractAuthorized(initialOwner);
    }

    // ============ KERNEL INTEGRATION FUNCTIONS ============
    
    /**
     * @dev Get recommendation from kernel with error handling
     * @param user Address requesting tokens
     * @param amount Requested token amount
     * @param additionalData Any additional data for the kernel
     * @return allocation Recommended allocation (0-255), 0 if error
     */
    function getKernelRecommendation(
        address user,
        uint256 amount,
        bytes memory additionalData
    ) public view returns (uint8) {
        try kernel.getRecommendedTokenAllocation(user, amount, additionalData) returns (uint8 allocation) {
            return allocation;
        } catch Error(string memory) {
            // Log error but don't revert - return 0 for safety
            return 0;
        } catch {
            // Unknown error - return 0 for safety
            return 0;
        }
    }
    
    /**
     * @dev Check if allocation meets minimum threshold
     * @param allocation The allocation score from kernel (0-255)
     * @return bool True if allocation is acceptable
     */
    function isAllocationAcceptable(uint8 allocation) public view returns (bool) {
        return allocation >= minimumAllocationThreshold;
    }

    // ============ AUTHORIZATION FUNCTIONS ============
    
    /**
     * @dev Authorize a token mint operation with kernel verification
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param additionalData Additional data for kernel decision
     * @return success True if operation is authorized
     * @return adjustedAmount The adjusted amount based on kernel recommendation
     */
    function authorizeMint(
        address to,
        uint256 amount,
        bytes memory additionalData
    ) external onlyAuthorizedContract() whenNotPaused() returns (bool success, uint256 adjustedAmount) {
        
        // Get kernel recommendation
        uint8 allocation = getKernelRecommendation(to, amount, additionalData);
        emit KernelAllocationResult(to, amount, allocation);
        
        // Check if allocation meets minimum threshold
        if (!isAllocationAcceptable(allocation)) {
            emit TokenOperationDenied(to, amount, "Allocation below minimum threshold");
            return (false, 0);
        }
        
        // Calculate adjusted amount based on allocation
        adjustedAmount = (amount * allocation) / 255;
        
        // Check daily limits
        uint256 dayNumber = getCurrentDay();
        uint256 userLimit = getUserDailyLimit(to);
        uint256 usedToday = userDailyUsage[to][dayNumber];
        
        if (usedToday + adjustedAmount > userLimit) {
            emit TokenOperationDenied(to, adjustedAmount, "Daily limit exceeded");
            return (false, 0);
        }
        
        // Update daily usage
        userDailyUsage[to][dayNumber] = usedToday + adjustedAmount;
        
        emit TokenOperationApproved(to, adjustedAmount, "mint");
        return (true, adjustedAmount);
    }
    
    /**
     * @dev Authorize a token transfer operation with kernel verification
     * @param from Address sending tokens
     * @param to Address receiving tokens
     * @param amount Amount of tokens to transfer
     * @param additionalData Additional data for kernel decision
     * @return bool True if transfer is authorized
     */
    function authorizeTransfer(
        address from,
        address to,
        uint256 amount,
        bytes memory additionalData
    ) external onlyAuthorizedContract() whenNotPaused() returns (bool) {
        
        // Get kernel recommendation for the sender
        uint8 allocation = getKernelRecommendation(from, amount, additionalData);
        emit KernelAllocationResult(from, amount, allocation);
        
        // Check if allocation meets minimum threshold
        if (!isAllocationAcceptable(allocation)) {
            emit TokenOperationDenied(from, amount, "Transfer allocation below minimum threshold");
            return false;
        }
        
        emit TokenOperationApproved(from, amount, "transfer");
        return true;
    }
    
    /**
     * @dev Direct mint function with kernel verification (owner only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param additionalData Additional data for kernel decision
     * @return bool True if mint was successful
     */
    function mintWithKernel(
        address to,
        uint256 amount,
        bytes memory additionalData
    ) external onlyOwner whenNotPaused() returns (bool) {
        
        // Get kernel recommendation
        uint8 allocation = getKernelRecommendation(to, amount, additionalData);
        emit KernelAllocationResult(to, amount, allocation);
        
        // Check if allocation meets minimum threshold
        if (!isAllocationAcceptable(allocation)) {
            emit TokenOperationDenied(to, amount, "Mint allocation below minimum threshold");
            return false;
        }
        
        // Calculate adjusted amount
        uint256 adjustedAmount = (amount * allocation) / 255;
        
        // Attempt to mint tokens
        try studyToken.mintReward(to, adjustedAmount) returns (bool result) {
            if (result) {
                emit TokenOperationApproved(to, adjustedAmount, "directMint");
                return true;
            } else {
                emit TokenOperationDenied(to, adjustedAmount, "Mint failed: returned false");
                return false;
            }
        } catch Error(string memory reason) {
            emit TokenOperationDenied(to, adjustedAmount, string(abi.encodePacked("Mint failed: ", reason)));
            return false;
        } catch {
            emit TokenOperationDenied(to, adjustedAmount, "Mint failed: Unknown error");
            return false;
        }
    }

    // ============ SIMPLIFIED AUTHORIZATION (FALLBACK) ============
    
    /**
     * @dev Simple authorization without kernel (for compatibility/emergency)
     * @param to Address to authorize for
     * @param amount Amount to authorize
     * @return bool True if authorized
     */
    function authorizeSimple(address to, uint256 amount) external onlyAuthorizedContract() returns (bool) {
        uint256 dayNumber = getCurrentDay();
        uint256 userLimit = getUserDailyLimit(to);
        uint256 usedToday = userDailyUsage[to][dayNumber];
        
        if (usedToday + amount <= userLimit) {
            userDailyUsage[to][dayNumber] = usedToday + amount;
            emit TokenOperationApproved(to, amount, "simpleAuth");
            return true;
        } else {
            emit TokenOperationDenied(to, amount, "Daily limit exceeded");
            return false;
        }
    }

    // ============ DAILY LIMITS FUNCTIONS ============
    
    /**
     * @dev Get the current day number
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }
    
    /**
     * @dev Get a user's effective daily limit
     */
    function getUserDailyLimit(address user) public view returns (uint256) {
        uint256 userLimit = userDailyLimits[user];
        return userLimit > 0 ? userLimit : defaultDailyLimit;
    }
    
    /**
     * @dev Get a user's remaining daily limit
     */
    function getRemainingDailyLimit(address user) public view returns (uint256) {
        uint256 dayNumber = getCurrentDay();
        uint256 usedToday = userDailyUsage[user][dayNumber];
        uint256 limit = getUserDailyLimit(user);
        
        return usedToday >= limit ? 0 : limit - usedToday;
    }
    
    /**
     * @dev Get a user's used amount for today
     */
    function getTodayUsage(address user) public view returns (uint256) {
        uint256 dayNumber = getCurrentDay();
        return userDailyUsage[user][dayNumber];
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Set the minimum allocation threshold
     */
    function setMinimumAllocationThreshold(uint8 _threshold) external onlyOwner {
        require(_threshold <= 255, "Threshold must be <= 255");
        uint8 oldThreshold = minimumAllocationThreshold;
        minimumAllocationThreshold = _threshold;
        emit MinimumThresholdUpdated(oldThreshold, _threshold);
    }
    
    /**
     * @dev Update kernel address
     */
    function setKernelAddress(address _kernelAddress) external onlyOwner {
        require(_kernelAddress != address(0), "Invalid address");
        address oldKernel = kernelAddress;
        kernelAddress = _kernelAddress;
        kernel = ITokenAllocationKernel(_kernelAddress);
        emit KernelAddressUpdated(oldKernel, _kernelAddress);
    }
    
    /**
     * @dev Authorize a contract
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        require(!authorizedContracts[contractAddress], "Contract already authorized");
        
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    /**
     * @dev Deauthorize a contract
     */
    function deauthorizeContract(address contractAddress) external onlyOwner {
        require(authorizedContracts[contractAddress], "Contract not authorized");
        
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }
    
    /**
     * @dev Set daily token limit for a specific user
     */
    function setUserDailyLimit(address user, uint256 limit) external onlyOwner {
        require(user != address(0), "Invalid address");
        userDailyLimits[user] = limit;
        emit UserLimitSet(user, limit);
    }
    
    /**
     * @dev Set default daily limit for all users
     */
    function setDefaultDailyLimit(uint256 limit) external onlyOwner {
        defaultDailyLimit = limit;
    }
    
    /**
     * @dev Set StudyToken contract address
     */
    function setStudyToken(address _studyTokenAddress) external onlyOwner {
        require(_studyTokenAddress != address(0), "Invalid address");
        studyToken = IStudyToken(_studyTokenAddress);
    }
    
    /**
     * @dev Emergency pause/unpause
     */
    function setPause(bool _isPaused) external onlyOwner {
        isPaused = _isPaused;
        emit PauseStatusChanged(_isPaused);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Check if user can perform operation with given amount
     */
    function canUserOperate(address user, uint256 amount) external view returns (bool canOperate, string memory reason) {
        if (isPaused) {
            return (false, "Contract is paused");
        }
        
        uint256 remaining = getRemainingDailyLimit(user);
        if (remaining < amount) {
            return (false, "Insufficient daily limit");
        }
        
        return (true, "Operation allowed");
    }
    
    /**
     * @dev Get user's complete status
     */
    function getUserStatus(address user) external view returns (
        uint256 dailyLimit,
        uint256 usedToday,
        uint256 remainingToday,
        bool canOperate
    ) {
        dailyLimit = getUserDailyLimit(user);
        usedToday = getTodayUsage(user);
        remainingToday = getRemainingDailyLimit(user);
        canOperate = !isPaused && remainingToday > 0;
    }
    
    /**
     * @dev Preview what would happen with a kernel call (without executing)
     */
    function previewKernelRecommendation(
        address user,
        uint256 amount,
        bytes memory additionalData
    ) external view returns (
        uint8 allocation,
        bool meetsThreshold,
        uint256 adjustedAmount,
        bool withinDailyLimit
    ) {
        allocation = getKernelRecommendation(user, amount, additionalData);
        meetsThreshold = isAllocationAcceptable(allocation);
        adjustedAmount = (amount * allocation) / 255;
        
        uint256 remaining = getRemainingDailyLimit(user);
        withinDailyLimit = adjustedAmount <= remaining;
    }
}