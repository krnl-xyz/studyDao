// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TokenAllocationKernel
 * @dev Kernel contract that recommends token allocation percentages based on user engagement
 */
contract TokenAllocationKernel {
    address public owner;
    address public studyDAOAuthority;
    
    // User metrics
    mapping(address => UserMetrics) private userMetrics;
    
    // Authorized updaters (StudyDAO contracts that can update metrics)
    mapping(address => bool) public authorizedUpdaters;
    
    struct UserMetrics {
        // Engagement metrics (0-100 each)
        uint8 participationScore;    // How actively user participates
        uint8 contributionScore;     // Quality of user's contributions
        uint8 consistencyScore;      // How consistently user engages
        uint8 tokenUtilizationScore; // How effectively user utilizes tokens
        
        // Last update timestamp
        uint32 lastUpdateTimestamp;
    }
    
    // Events
    event MetricsUpdated(address indexed user);
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRemoved(address indexed updater);
    event AuthorityUpdated(address indexed newAuthority);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || 
            msg.sender == studyDAOAuthority || 
            authorizedUpdaters[msg.sender], 
            "Not authorized"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedUpdaters[msg.sender] = true;
    }
    
    /**
     * @dev Set the StudyDAO Authority address
     * @param _authority The address of the StudyDAO Authority contract
     */
    function setStudyDAOAuthority(address _authority) external onlyOwner {
        require(_authority != address(0), "Invalid authority address");
        studyDAOAuthority = _authority;
        emit AuthorityUpdated(_authority);
    }
    
    /**
     * @dev Add an authorized updater
     * @param updater Address to authorize for metric updates
     */
    function addAuthorizedUpdater(address updater) external onlyOwner {
        require(updater != address(0), "Invalid updater address");
        authorizedUpdaters[updater] = true;
        emit UpdaterAuthorized(updater);
    }
    
    /**
     * @dev Remove an authorized updater
     * @param updater Address to remove authorization from
     */
    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit UpdaterRemoved(updater);
    }
    
    /**
     * @dev Update a user's metrics
     * @param user Address of the user
     * @param participation Participation score (0-100)
     * @param contribution Contribution score (0-100)
     * @param consistency Consistency score (0-100)
     * @param tokenUtilization Token utilization score (0-100)
     */
    function updateUserMetrics(
        address user,
        uint8 participation,
        uint8 contribution,
        uint8 consistency,
        uint8 tokenUtilization
    ) external onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(
            participation <= 100 &&
            contribution <= 100 &&
            consistency <= 100 &&
            tokenUtilization <= 100,
            "Scores must be between 0-100"
        );
        
        UserMetrics storage metrics = userMetrics[user];
        
        metrics.participationScore = participation;
        metrics.contributionScore = contribution;
        metrics.consistencyScore = consistency;
        metrics.tokenUtilizationScore = tokenUtilization;
        metrics.lastUpdateTimestamp = uint32(block.timestamp);
        
        emit MetricsUpdated(user);
    }
    
    /**
     * @dev Update individual metric
     * @param user Address of the user
     * @param metricType Type of metric to update (1=participation, 2=contribution, 3=consistency, 4=tokenUtilization)
     * @param value New value for the metric (0-100)
     */
    function updateSingleMetric(
        address user,
        uint8 metricType,
        uint8 value
    ) external onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(value <= 100, "Score must be between 0-100");
        require(metricType >= 1 && metricType <= 4, "Invalid metric type");
        
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
        emit MetricsUpdated(user);
    }
    
    /**
     * @dev KERNEL FUNCTION: Get recommended token allocation for a user
     * @param user Address of the user
     * @return allocation Recommended allocation percentage (0-100)
     */
    function getRecommendedTokenAllocation(address user) external view returns (uint8) {
        UserMetrics memory metrics = userMetrics[user];
        
        // If no metrics exist yet, return a default recommendation
        if (metrics.lastUpdateTimestamp == 0) {
            return 30; // Default 30% allocation for new users
        }
        
        // Calculate freshness factor - reduce allocation if metrics are stale
        uint256 daysSinceUpdate = (block.timestamp - metrics.lastUpdateTimestamp) / 1 days;
        uint256 freshnessFactor = daysSinceUpdate > 30 ? 70 : 100 - daysSinceUpdate;
        
        // Calculate base allocation from metrics with specific weights
        uint256 baseAllocation = 
            (uint256(metrics.participationScore) * 30 +     // 30% weight for participation
             uint256(metrics.contributionScore) * 25 +      // 25% weight for contribution quality
             uint256(metrics.consistencyScore) * 25 +       // 25% weight for consistency
             uint256(metrics.tokenUtilizationScore) * 20)   // 20% weight for token utilization
            / 100;
        
        // Apply freshness factor (if metrics are old, reduce allocation)
        uint256 finalAllocation = (baseAllocation * freshnessFactor) / 100;
        
        // Ensure result is 0-100
        return finalAllocation > 100 ? 100 : uint8(finalAllocation);
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
     * @dev KERNEL FUNCTION: Check if a user's metrics are fresh enough to be reliable
     * @param user Address of the user
     * @return isFresh Whether the metrics are fresh (updated within 14 days)
     */
    function areMetricsFresh(address user) external view returns (bool) {
        UserMetrics memory metrics = userMetrics[user];
        
        if (metrics.lastUpdateTimestamp == 0) {
            return false; // No metrics exist
        }
        
        // Consider metrics fresh if updated within 14 days
        return (block.timestamp - metrics.lastUpdateTimestamp) <= 14 days;
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
    }
}