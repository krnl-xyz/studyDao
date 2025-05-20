// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KRNL, KrnlPayload, KernelParameter, KernelResponse} from "./KRNL.sol";
import "./TokenAllocationKernel.sol";
import "./StudyTokenAuthority.sol";

/**
 * @title StudyDAOKernelManager
 * @dev Contract that coordinates between TokenAllocationKernel and StudyTokenAuthority
 *      to utilize kernel-informed decisions for token management
 */
contract StudyDAOKernelManager is KRNL {
    // The kernel ID for TokenAllocationKernel
    uint256 public constant TOKEN_ALLOCATION_KERNEL_ID = 1593;
    
    // Contract references
    TokenAllocationKernel public tokenAllocationKernel;
    StudyTokenAuthority public tokenAuthority;
    
    // Contract admin
    address public admin;
    
    // Allocation strategy configurations
    struct AllocationStrategy {
        uint8 minAllocation;  // Minimum allocation percentage
        uint8 maxAllocation;  // Maximum allocation percentage
        bool active;          // Whether this strategy is active
    }
    
    // Strategy for each user
    mapping(address => AllocationStrategy) public userStrategies;
    
    // Default strategy settings
    AllocationStrategy public defaultStrategy;
    
    // User allocation history tracking
    struct AllocationHistory {
        uint8 allocation;     // Allocation percentage that was used
        uint256 amount;       // Token amount involved
        uint256 timestamp;    // When the allocation was applied
    }
    
    // Record of all allocations applied (per user)
    mapping(address => AllocationHistory[]) public allocationHistory;
    
    // Events
    event KernelAllocated(address indexed user, uint8 allocation, uint256 timestamp);
    event StrategyConfigured(address indexed user, uint8 minAllocation, uint8 maxAllocation);
    event DefaultStrategyUpdated(uint8 minAllocation, uint8 maxAllocation);
    event TokensDistributed(address indexed user, uint256 amount, uint8 allocation);
    event KernelResponseReceived(address indexed user, uint256 kernelId, uint8 allocation);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _tokenAllocationKernel Address of TokenAllocationKernel contract
     * @param _tokenAuthority Address of StudyTokenAuthority contract
     * @param _krnlPublicKey Address of the KRNL public key for verification
     */
    constructor(
        address _tokenAllocationKernel,
        address _tokenAuthority,
        address _krnlPublicKey
    ) KRNL(_krnlPublicKey) {
        require(_tokenAllocationKernel != address(0), "Invalid kernel address");
        require(_tokenAuthority != address(0), "Invalid authority address");
        
        admin = msg.sender;
        tokenAllocationKernel = TokenAllocationKernel(_tokenAllocationKernel);
        tokenAuthority = StudyTokenAuthority(_tokenAuthority);
        
        // Set default strategy
        defaultStrategy = AllocationStrategy({
            minAllocation: 10,   // Default minimum 10%
            maxAllocation: 80,   // Default maximum 80%
            active: true
        });
        
        emit DefaultStrategyUpdated(defaultStrategy.minAllocation, defaultStrategy.maxAllocation);
    }
    
    /**
     * @dev Set the TokenAllocationKernel contract
     * @param _tokenAllocationKernel Address of the new kernel contract
     */
    function setTokenAllocationKernel(address _tokenAllocationKernel) external onlyAdmin {
        require(_tokenAllocationKernel != address(0), "Invalid kernel address");
        tokenAllocationKernel = TokenAllocationKernel(_tokenAllocationKernel);
    }
    
    /**
     * @dev Set the StudyTokenAuthority contract
     * @param _tokenAuthority Address of the new authority contract
     */
    function setTokenAuthority(address _tokenAuthority) external onlyAdmin {
        require(_tokenAuthority != address(0), "Invalid authority address");
        tokenAuthority = StudyTokenAuthority(_tokenAuthority);
    }
    
    /**
     * @dev Configure allocation strategy for a specific user
     * @param user Address of the user
     * @param minAllocation Minimum allocation percentage (0-100)
     * @param maxAllocation Maximum allocation percentage (0-100)
     * @param active Whether this strategy is active
     */
    function configureUserStrategy(
        address user,
        uint8 minAllocation,
        uint8 maxAllocation,
        bool active
    ) external onlyAdmin {
        require(user != address(0), "Invalid user address");
        require(minAllocation <= maxAllocation, "Min must be <= max");
        require(maxAllocation <= 100, "Max must be <= 100");
        
        userStrategies[user] = AllocationStrategy({
            minAllocation: minAllocation,
            maxAllocation: maxAllocation,
            active: active
        });
        
        emit StrategyConfigured(user, minAllocation, maxAllocation);
    }
    
    /**
     * @dev Update default allocation strategy
     * @param minAllocation Minimum allocation percentage (0-100)
     * @param maxAllocation Maximum allocation percentage (0-100)
     */
    function updateDefaultStrategy(uint8 minAllocation, uint8 maxAllocation) external onlyAdmin {
        require(minAllocation <= maxAllocation, "Min must be <= max");
        require(maxAllocation <= 100, "Max must be <= 100");
        
        defaultStrategy.minAllocation = minAllocation;
        defaultStrategy.maxAllocation = maxAllocation;
        
        emit DefaultStrategyUpdated(minAllocation, maxAllocation);
    }
    /**
 * @dev Get allocation strategy for a user
 *
 * Returns the minimum, maximum allocation percentages,
 * and whether this strategy is currently active.
 */
function getUserStrategy(address user) public view returns (
    uint8 minAllocation,
    uint8 maxAllocation,
    bool active
) {
        AllocationStrategy memory strategy = userStrategies[user];
        
        // If user has no specific strategy, return default
        if (!strategy.active) {
            return (
                defaultStrategy.minAllocation,
                defaultStrategy.maxAllocation,
                defaultStrategy.active
            );
        }
        
        return (
            strategy.minAllocation,
            strategy.maxAllocation,
            strategy.active
        );
    }
    
    /**
     * @dev Get user's latest allocation percentage directly from the kernel
     * @param user Address of the user
     * @return allocation Recommended allocation from kernel (bounded by strategy)
     */
    function getUserAllocation(address user) public view returns (uint8 allocation) {
        // Get raw allocation from kernel
        uint8 rawAllocation = tokenAllocationKernel.getRecommendedTokenAllocation(user);
        
        // Apply strategy limits
        (uint8 minAllocation, uint8 maxAllocation, bool active) = getUserStrategy(user);
        
        if (!active) {
            return defaultStrategy.minAllocation; // Fall back to minimum if strategy not active
        }
        
        // Bound allocation within strategy limits
        if (rawAllocation < minAllocation) {
            return minAllocation;
        } else if (rawAllocation > maxAllocation) {
            return maxAllocation;
        } else {
            return rawAllocation;
        }
    }
    
    /**
     * @dev Apply kernel allocation recommendation via KRNL payload
     * @param krnlPayload The KRNL payload containing kernel response
     * @param user Address of the user
     * @return allocation The applied allocation percentage
     */
    function applyKernelAllocation(
        KrnlPayload memory krnlPayload,
        address user
    ) public onlyAuthorized(krnlPayload, abi.encode(user)) returns (uint8 allocation) {
        require(user != address(0), "Invalid user address");
        
        // Decode kernel responses
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        
        // Find our specific kernel response
        uint8 kernelAllocation = 0;
        bool kernelFound = false;
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            if (kernelResponses[i].kernelId == TOKEN_ALLOCATION_KERNEL_ID) {
                // The TokenAllocationKernel returns a uint8 allocation percentage
                kernelAllocation = abi.decode(kernelResponses[i].result, (uint8));
                kernelFound = true;
                emit KernelResponseReceived(user, TOKEN_ALLOCATION_KERNEL_ID, kernelAllocation);
                break;
            }
        }
        
        require(kernelFound, "Token allocation kernel response not found");
        
        // Apply strategy limits
        (uint8 minAllocation, uint8 maxAllocation, bool active) = getUserStrategy(user);
        
        if (!active) {
            allocation = defaultStrategy.minAllocation;
        } else if (kernelAllocation < minAllocation) {
            allocation = minAllocation;
        } else if (kernelAllocation > maxAllocation) {
            allocation = maxAllocation;
        } else {
            allocation = kernelAllocation;
        }
        
        // Record the kernel-provided allocation
        emit KernelAllocated(user, allocation, block.timestamp);
        
        return allocation;
    }
    
    /**
     * @dev Distribute tokens based on kernel allocation with KRNL verification
     * @param krnlPayload The KRNL payload for verification
     * @param user Address of the user to receive tokens
     * @param totalAmount Total amount of tokens available for distribution
     * @return distributedAmount The actual amount of tokens distributed
     */
    function distributeTokensWithKernel(
        KrnlPayload memory krnlPayload,
        address user,
        uint256 totalAmount
    ) external onlyAdmin onlyAuthorized(krnlPayload, abi.encode(user, totalAmount)) returns (uint256 distributedAmount) {
        // Get allocation from kernel
        uint8 allocation = applyKernelAllocation(krnlPayload, user);
        
        // Calculate tokens to distribute based on allocation percentage
        distributedAmount = (totalAmount * allocation) / 100;
        
        // Use the token authority to mint tokens with kernel verification
        bool success = tokenAuthority.mintTokensWithKRNL(krnlPayload, user, distributedAmount);
        require(success, "Token distribution failed");
        
        // Record allocation history
        allocationHistory[user].push(AllocationHistory({
            allocation: allocation,
            amount: distributedAmount,
            timestamp: block.timestamp
        }));
        
        emit TokensDistributed(user, distributedAmount, allocation);
        
        return distributedAmount;
    }
    
    /**
     * @dev Alternative method to distribute tokens based on direct kernel call (no KRNL verification)
     * @param user Address of the user to receive tokens
     * @param totalAmount Total amount of tokens available for distribution
     * @return distributedAmount The actual amount of tokens distributed
     */
    function distributeTokens(
        address user,
        uint256 totalAmount
    ) external onlyAdmin returns (uint256 distributedAmount) {
        // Get allocation directly from kernel
        uint8 allocation = getUserAllocation(user);
        
        // Calculate tokens to distribute based on allocation percentage
        distributedAmount = (totalAmount * allocation) / 100;
        
        // Use the token authority to mint tokens
        bool success = tokenAuthority.mintTokens(user, distributedAmount);
        require(success, "Token distribution failed");
        
        // Record allocation history
        allocationHistory[user].push(AllocationHistory({
            allocation: allocation,
            amount: distributedAmount,
            timestamp: block.timestamp
        }));
        
        emit TokensDistributed(user, distributedAmount, allocation);
        
        return distributedAmount;
    }
    
    /**
     * @dev Get user's allocation history count
     * @param user Address of the user
     * @return count Number of allocation history entries
     */
    function getUserAllocationHistoryCount(address user) external view returns (uint256 count) {
        return allocationHistory[user].length;
    }
    
    /**
     * @dev Get specific allocation history entry for a user
     * @param user Address of the user
     * @param index Index of the history entry
     * @return allocation Allocation percentage used
     * @return amount Token amount distributed
     * @return timestamp When the allocation happened
     */
    function getUserAllocationHistory(
        address user,
        uint256 index
    ) external view returns (
        uint8 allocation,
        uint256 amount,
        uint256 timestamp
    ) {
        require(index < allocationHistory[user].length, "Index out of bounds");
        
        AllocationHistory memory history = allocationHistory[user][index];
        return (
            history.allocation,
            history.amount,
            history.timestamp
        );
    }
    
    /**
     * @dev Transfer admin rights to another address
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }
}