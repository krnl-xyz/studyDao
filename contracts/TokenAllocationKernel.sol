// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KRNL, KrnlPayload, KernelParameter, KernelResponse} from "./KRNL.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenAllocationKernel
 * @dev Kernel contract that recommends token allocation percentages based on user engagement
 * @notice This contract integrates with the KRNL operating system for enhanced functionality
 */
contract TokenAllocationKernel is KRNL, AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    
    // Correct kernel ID from the KRNL system (1593)
    uint256 public constant ALLOCATION_KERNEL_ID = 1593;
    
    // User metrics - packed for gas optimization
    struct UserMetrics {
        // Engagement metrics (0-100 each)
        uint8 participationScore;    // How actively user participates
        uint8 contributionScore;     // Quality of user's contributions
        uint8 consistencyScore;      // How consistently user engages
        uint8 tokenUtilizationScore; // How effectively user utilizes tokens
        
        // Last update timestamp
        uint32 lastUpdateTimestamp;
    }
    
    // Storage
    mapping(address => UserMetrics) private userMetrics;
    address public studyDAOAuthority;
    uint16 public staleDaysThreshold = 14; // Days after which metrics are considered stale
    
    // Events
    event MetricsUpdated(address indexed user, uint8 metricType, uint8 newValue);
    event FullMetricsUpdated(
        address indexed user, 
        uint8 participation, 
        uint8 contribution, 
        uint8 consistency, 
        uint8 tokenUtilization
    );
    event RoleUpdated(address indexed account, bytes32 indexed role, bool hasRole);
    event AuthorityUpdated(address indexed newAuthority);
    event AllocationRecommended(address indexed user, uint8 allocation);
    event StaleThresholdUpdated(uint16 newDaysThreshold);
    
    /**
     * @dev Contract constructor
     * @param _tokenAuthorityPublicKey The public key of the token authority
     */
    constructor(address _tokenAuthorityPublicKey) KRNL(_tokenAuthorityPublicKey) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OWNER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }
    
    /**
     * @dev Set the StudyDAO Authority address
     * @param _authority The address of the StudyDAO Authority contract
     */
    function setStudyDAOAuthority(address _authority) external onlyRole(OWNER_ROLE) {
        require(_authority != address(0), "Invalid authority address");
        
        // Revoke role from old authority if exists
        if (studyDAOAuthority != address(0)) {
            _revokeRole(AUTHORITY_ROLE, studyDAOAuthority);
        }
        
        studyDAOAuthority = _authority;
        _grantRole(AUTHORITY_ROLE, _authority);
        
        emit AuthorityUpdated(_authority);
    }
    
    /**
     * @dev Add an authorized updater
     * @param updater Address to authorize for metric updates
     */
    function addAuthorizedUpdater(address updater) external onlyRole(OWNER_ROLE) {
        require(updater != address(0), "Invalid updater address");
        _grantRole(UPDATER_ROLE, updater);
        emit RoleUpdated(updater, UPDATER_ROLE, true);
    }
    
    /**
     * @dev Remove an authorized updater
     * @param updater Address to remove authorization from
     */
    function removeAuthorizedUpdater(address updater) external onlyRole(OWNER_ROLE) {
        _revokeRole(UPDATER_ROLE, updater);
        emit RoleUpdated(updater, UPDATER_ROLE, false);
    }
    
    /**
     * @dev Set the threshold for considering metrics stale
     * @param _days Number of days after which metrics are considered stale
     */
    function setStaleThreshold(uint16 _days) external onlyRole(OWNER_ROLE) {
        require(_days > 0, "Threshold must be greater than zero");
        staleDaysThreshold = _days;
        emit StaleThresholdUpdated(_days);
    }
    
    /**
     * @dev Protected function to update a user's metrics using KRNL
     * @param krnlPayload The payload from the KRNL system
     * @param user Address of the user
     * @param participation Participation score (0-100)
     * @param contribution Contribution score (0-100)
     * @param consistency Consistency score (0-100)
     * @param tokenUtilization Token utilization score (0-100)
     */
    function updateUserMetricsProtected(
        KrnlPayload calldata krnlPayload,
        address user,
        uint8 participation,
        uint8 contribution,
        uint8 consistency,
        uint8 tokenUtilization
    ) external nonReentrant onlyRole(UPDATER_ROLE) onlyAuthorized(krnlPayload, abi.encode(user, participation, contribution, consistency, tokenUtilization)) {
        require(user != address(0), "Invalid user address");
        require(
            participation <= 100 &&
            contribution <= 100 &&
            consistency <= 100 &&
            tokenUtilization <= 100,
            "Scores must be between 0-100"
        );
        
        // Decode the kernel responses
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        bool isApproved = false;
        
        // Process kernel responses to verify the update is valid
        for (uint i = 0; i < kernelResponses.length; i++) {
            // Check for approval from the allocation kernel
            if (kernelResponses[i].kernelId == ALLOCATION_KERNEL_ID) {
                isApproved = abi.decode(kernelResponses[i].result, (bool));
                
                if (!isApproved) {
                    revert("Update not approved by kernel");
                }
                break;
            }
        }
        
        // If we didn't find our kernel ID in the responses, revert
        if (!isApproved) {
            revert("Required kernel response not found");
        }
        
        UserMetrics storage metrics = userMetrics[user];
        
        metrics.participationScore = participation;
        metrics.contributionScore = contribution;
        metrics.consistencyScore = consistency;
        metrics.tokenUtilizationScore = tokenUtilization;
        metrics.lastUpdateTimestamp = uint32(block.timestamp);
        
        emit FullMetricsUpdated(user, participation, contribution, consistency, tokenUtilization);
    }
    
    /**
     * @dev Protected function to update individual metric using KRNL
     * @param krnlPayload The payload from the KRNL system
     * @param user Address of the user
     * @param metricType Type of metric to update (1=participation, 2=contribution, 3=consistency, 4=tokenUtilization)
     * @param value New value for the metric (0-100)
     */
    function updateSingleMetricProtected(
        KrnlPayload calldata krnlPayload,
        address user,
        uint8 metricType,
        uint8 value
    ) external nonReentrant onlyRole(UPDATER_ROLE) onlyAuthorized(krnlPayload, abi.encode(user, metricType, value)) {
        require(user != address(0), "Invalid user address");
        require(value <= 100, "Score must be between 0-100");
        require(metricType >= 1 && metricType <= 4, "Invalid metric type");
        
        // Decode the kernel responses
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        bool isApproved = false;
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            if (kernelResponses[i].kernelId == ALLOCATION_KERNEL_ID) {
                isApproved = abi.decode(kernelResponses[i].result, (bool));
                
                if (!isApproved) {
                    revert("Update not approved by kernel");
                }
                break;
            }
        }
        
        // If we didn't find our kernel ID in the responses, revert
        if (!isApproved) {
            revert("Required kernel response not found");
        }
        
        UserMetrics storage metrics = userMetrics[user];
        
        if (metricType == 1) {
            metrics.participationScore = value;
        } else if (metricType == 2) {
            metrics.contributionScore = value;
        } else if (metricType == 3) {
            metrics.consistencyScore = value;
        } else {
            metrics.tokenUtilizationScore = value;
        }
        
        metrics.lastUpdateTimestamp = uint32(block.timestamp);
        emit MetricsUpdated(user, metricType, value);
    }
    
    /**
     * @dev KERNEL FUNCTION: Get recommended token allocation for a user
     * This function integrates with the KRNL system for enhanced protection
     * @param krnlPayload The payload from the KRNL system
     * @param user Address of the user
     * @return allocation Recommended allocation percentage (0-100)
     */
    function getRecommendedTokenAllocation(
        KrnlPayload calldata krnlPayload,
        address user
    ) external view onlyAuthorized(krnlPayload, abi.encode(user)) returns (uint8) {
        UserMetrics memory metrics = userMetrics[user];
        
        // Decode the kernel responses
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        int16 kernelAdjustment = 0;
        
        // Process kernel responses
        for (uint i = 0; i < kernelResponses.length; i++) {
            if (kernelResponses[i].kernelId == ALLOCATION_KERNEL_ID) {
                kernelAdjustment = abi.decode(kernelResponses[i].result, (int16));
                break;
            }
        }
        
        // If no metrics exist yet, return a default recommendation with kernel adjustment
        if (metrics.lastUpdateTimestamp == 0) {
            uint8 defaultAllocation = 30; // Default 30% allocation for new users
            uint8 finalAllocation = applyAdjustment(defaultAllocation, kernelAdjustment);
            return finalAllocation;
        }
        
        // Calculate freshness factor - reduce allocation if metrics are stale
        uint256 daysSinceUpdate = (block.timestamp - metrics.lastUpdateTimestamp) / 1 days;
        uint256 freshnessFactor = daysSinceUpdate > uint256(staleDaysThreshold) 
            ? 70 // Minimum 70% if stale
            : 100 - (daysSinceUpdate * 30 / uint256(staleDaysThreshold)); // Linear decrease
        
        // Calculate base allocation from metrics with specific weights
        uint256 baseAllocation = 
            (uint256(metrics.participationScore) * 30 +     // 30% weight for participation
             uint256(metrics.contributionScore) * 25 +      // 25% weight for contribution quality
             uint256(metrics.consistencyScore) * 25 +       // 25% weight for consistency
             uint256(metrics.tokenUtilizationScore) * 20)   // 20% weight for token utilization
            / 100;
        
        // Apply freshness factor (if metrics are old, reduce allocation)
        uint256 adjustedAllocation = (baseAllocation * freshnessFactor) / 100;
        
        // Apply kernel adjustment and ensure result is 0-100
        uint8 result = adjustedAllocation > 100 ? 100 : uint8(adjustedAllocation);
        result = applyAdjustment(result, kernelAdjustment);
        
        return result;
    }
    
    /**
     * @dev Helper function to apply kernel adjustment to allocation
     * @param allocation Original allocation
     * @param adjustment Adjustment from kernel (-100 to 100)
     * @return Final allocation value (0-100)
     */
    function applyAdjustment(uint8 allocation, int16 adjustment) internal pure returns (uint8) {
        // Convert to signed integers first for the calculation
        int256 signedAllocation = int256(uint256(allocation));
        int256 result = signedAllocation + int256(adjustment);
        
        // Apply bounds checks
        if (result < 0) return 0;
        if (result > 100) return 100;
        
        // Safe conversion back to uint8
        return uint8(uint256(result));
    }
    
    /**
     * @dev Get detailed user metrics (for admin/UI use)
     * @param user Address of the user
     * @return participation Participation score
     * @return contribution Contribution score
     * @return consistency Consistency score
     * @return tokenUtilization Token utilization score
     * @return lastUpdateTime Last update timestamp
     */
    function getUserDetailedMetrics(address user) external view returns (
        uint8 participation,
        uint8 contribution,
        uint8 consistency,
        uint8 tokenUtilization,
        uint32 lastUpdateTime
    ) {
        UserMetrics memory metrics = userMetrics[user];
        return (
            metrics.participationScore,
            metrics.contributionScore,
            metrics.consistencyScore,
            metrics.tokenUtilizationScore,
            metrics.lastUpdateTimestamp
        );
    }
    
    /**
     * @dev Check if a user's metrics are fresh enough to be reliable
     * @param user Address of the user
     * @return isFresh Whether the metrics are fresh (updated within staleDaysThreshold days)
     */
    function areMetricsFresh(address user) external view returns (bool) {
        UserMetrics memory metrics = userMetrics[user];
        
        if (metrics.lastUpdateTimestamp == 0) {
            return false; // No metrics exist
        }
        
        // Consider metrics fresh if updated within staleDaysThreshold days
        return (block.timestamp - metrics.lastUpdateTimestamp) <= uint256(staleDaysThreshold) * 1 days;
    }
    
    /**
     * @dev Emergency function to handle any stuck funds
     * @param recipient Address to receive the funds
     */
    function emergencyWithdraw(address payable recipient) external onlyRole(OWNER_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "Transfer failed");
    }
}