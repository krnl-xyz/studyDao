// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./StudyToken.sol";
import "./StudyGroup.sol";
import {KRNL, KrnlPayload, KernelParameter, KernelResponse} from "./KRNL.sol";

/**
 * @title StudyGroupFactory
 * @dev Contract for creating and managing study groups with KRNL integration
 */
contract StudyGroupFactory is KRNL {
    // StudyToken contract reference
    StudyToken public studyToken;
    
    // Address of the contract owner
    address public owner;
    
    // Array to store all created study groups
    address[] public studyGroups;
    
    // Mapping to track group creators
    mapping(address => address[]) public creatorGroups;
    
    // Group metadata
    struct GroupMetadata {
        string name;
        string description;
        address creator;
        uint256 createdAt;
        uint256 minStakeAmount;
        bool isActive;
    }
    
    mapping(address => GroupMetadata) public groupMetadata;
    
    // Events
    event StudyGroupCreated(
        address indexed groupAddress, 
        string name, 
        address indexed creator,
        uint256 minStakeAmount
    );
    event StudyGroupDeactivated(address indexed groupAddress);
    event StudyGroupReactivated(address indexed groupAddress);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Constructor to create the factory with KRNL integration
     * @param _studyTokenAddress Address of the StudyToken contract
     * @param _tokenAuthorityPublicKey KRNL token authority public key
     */
    constructor(
        address _studyTokenAddress,
        address _tokenAuthorityPublicKey
    ) KRNL(_tokenAuthorityPublicKey) {
        owner = msg.sender;
        studyToken = StudyToken(_studyTokenAddress);
    }
    
    /**
     * @dev Create a new study group with KRNL integration
     * @param name Name of the study group
     * @param description Description of the study group
     * @param minStakeAmount Minimum amount required to join the group
     * @return The address of the newly created study group
     */
    function createStudyGroup(
        string memory name,
        string memory description,
        uint256 minStakeAmount
    ) external returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(minStakeAmount > 0, "Minimum stake must be greater than 0");
        
        // Create new study group with KRNL integration
        StudyGroup newGroup = new StudyGroup(
            name,
            description,
            minStakeAmount,
            address(studyToken),
            tokenAuthorityPublicKey
        );
        
        address groupAddress = address(newGroup);
        studyGroups.push(groupAddress);
        creatorGroups[msg.sender].push(groupAddress);
        
        // Store group metadata
        groupMetadata[groupAddress] = GroupMetadata({
            name: name,
            description: description,
            creator: msg.sender,
            createdAt: block.timestamp,
            minStakeAmount: minStakeAmount,
            isActive: true
        });
        
        emit StudyGroupCreated(groupAddress, name, msg.sender, minStakeAmount);
        
        return groupAddress;
    }
    
    /**
     * @dev Create a study group with kernel recommendation for parameters
     * @param krnlPayload KRNL payload containing kernel responses
     * @param name Name of the study group
     * @param description Description of the study group
     * @param baseMinStakeAmount Base minimum stake amount (will be adjusted by kernel)
     * @return The address of the newly created study group
     */
    function createStudyGroupWithKernel(
        KrnlPayload memory krnlPayload,
        string memory name,
        string memory description,
        uint256 baseMinStakeAmount
    ) 
        external 
        onlyAuthorized(krnlPayload, abi.encode(name, description, baseMinStakeAmount))
        returns (address) 
    {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(baseMinStakeAmount > 0, "Base minimum stake must be greater than 0");
        
        // Decode response from kernel 1593
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        uint8 recommendedAllocation = 100; // Default allocation
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            if (kernelResponses[i].kernelId == 1593) {
                recommendedAllocation = abi.decode(kernelResponses[i].result, (uint8));
                break;
            }
        }
        
        // Adjust minimum stake based on kernel recommendation
        uint256 adjustedMinStake = (baseMinStakeAmount * recommendedAllocation) / 100;
        if (adjustedMinStake == 0) adjustedMinStake = baseMinStakeAmount; // Ensure non-zero
        
        // Create new study group with kernel-adjusted parameters
        StudyGroup newGroup = new StudyGroup(
            name,
            description,
            adjustedMinStake,
            address(studyToken),
            tokenAuthorityPublicKey
        );
        
        address groupAddress = address(newGroup);
        studyGroups.push(groupAddress);
        creatorGroups[msg.sender].push(groupAddress);
        
        // Store group metadata
        groupMetadata[groupAddress] = GroupMetadata({
            name: name,
            description: description,
            creator: msg.sender,
            createdAt: block.timestamp,
            minStakeAmount: adjustedMinStake,
            isActive: true
        });
        
        emit StudyGroupCreated(groupAddress, name, msg.sender, adjustedMinStake);
        
        return groupAddress;
    }
    
    /**
     * @dev Deactivate a study group (only owner or creator)
     * @param groupAddress Address of the study group to deactivate
     */
    function deactivateStudyGroup(address groupAddress) external {
        require(
            msg.sender == owner || msg.sender == groupMetadata[groupAddress].creator,
            "Only owner or creator can deactivate"
        );
        require(groupMetadata[groupAddress].isActive, "Group already inactive");
        
        groupMetadata[groupAddress].isActive = false;
        emit StudyGroupDeactivated(groupAddress);
    }
    
    /**
     * @dev Reactivate a study group (only owner)
     * @param groupAddress Address of the study group to reactivate
     */
    function reactivateStudyGroup(address groupAddress) external onlyOwner {
        require(!groupMetadata[groupAddress].isActive, "Group already active");
        
        groupMetadata[groupAddress].isActive = true;
        emit StudyGroupReactivated(groupAddress);
    }
    
    /**
     * @dev Get all study groups
     * @return Array of study group addresses
     */
    function getAllStudyGroups() external view returns (address[] memory) {
        return studyGroups;
    }
    
    /**
     * @dev Get active study groups only
     * @return Array of active study group addresses
     */
    function getActiveStudyGroups() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active groups
        for (uint256 i = 0; i < studyGroups.length; i++) {
            if (groupMetadata[studyGroups[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active groups
        address[] memory activeGroups = new address[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < studyGroups.length; i++) {
            if (groupMetadata[studyGroups[i]].isActive) {
                activeGroups[currentIndex] = studyGroups[i];
                currentIndex++;
            }
        }
        
        return activeGroups;
    }
    
    /**
     * @dev Get study groups created by a specific creator
     * @param creator Address of the creator
     * @return Array of study group addresses created by the creator
     */
    function getGroupsByCreator(address creator) external view returns (address[] memory) {
        return creatorGroups[creator];
    }
    
    /**
     * @dev Get study group at specific index
     * @param index Index in the array
     * @return Address of the study group
     */
    function getStudyGroupAt(uint256 index) external view returns (address) {
        require(index < studyGroups.length, "Index out of bounds");
        return studyGroups[index];
    }
    
    /**
     * @dev Get the total number of study groups
     * @return Number of study groups
     */
    function getStudyGroupCount() external view returns (uint256) {
        return studyGroups.length;
    }
    
    /**
     * @dev Get detailed information about a study group
     * @param groupAddress Address of the study group
     */
    function getGroupDetails(address groupAddress) external view returns (
        string memory name,
        string memory description,
        address creator,
        uint256 createdAt,
        uint256 minStakeAmount,
        bool isActive,
        uint256 memberCount
    ) {
        GroupMetadata memory metadata = groupMetadata[groupAddress];
        uint256 members = 0;
        
        // Try to get member count from the group contract
        try StudyGroup(groupAddress).getMemberCount() returns (uint256 count) {
            members = count;
        } catch {
            members = 0;
        }
        
        return (
            metadata.name,
            metadata.description,
            metadata.creator,
            metadata.createdAt,
            metadata.minStakeAmount,
            metadata.isActive,
            members
        );
    }
    
    /**
     * @dev Get factory statistics
     */
    function getFactoryStats() external view returns (
        uint256 totalGroups,
        uint256 activeGroups,
        uint256 totalCreators
    ) {
        totalGroups = studyGroups.length;
        
        // Count active groups
        for (uint256 i = 0; i < studyGroups.length; i++) {
            if (groupMetadata[studyGroups[i]].isActive) {
                activeGroups++;
            }
        }
        
        // Count unique creators (this is an approximation)
        // In a real implementation, you might want to track this more efficiently
        totalCreators = 0;
        address[] memory uniqueCreators = new address[](studyGroups.length);
        
        for (uint256 i = 0; i < studyGroups.length; i++) {
            address creator = groupMetadata[studyGroups[i]].creator;
            bool isUnique = true;
            
            for (uint256 j = 0; j < totalCreators; j++) {
                if (uniqueCreators[j] == creator) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                uniqueCreators[totalCreators] = creator;
                totalCreators++;
            }
        }
        
        return (totalGroups, activeGroups, totalCreators);
    }
    
    /**
     * @dev Update token authority public key (only owner)
     * @param _tokenAuthorityPublicKey New token authority public key
     */
    function updateTokenAuthorityPublicKey(address _tokenAuthorityPublicKey) external onlyOwner {
        setTokenAuthorityPublicKey(_tokenAuthorityPublicKey);
    }
}