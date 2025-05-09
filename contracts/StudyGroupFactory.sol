// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StudyToken.sol";
import "./StudyGroup.sol";

/**
 * @title StudyGroupFactory
 * @dev Contract for creating and managing study groups
 */
contract StudyGroupFactory {
    // StudyToken contract reference
    StudyToken public studyToken;
    
    // Address of the contract owner
    address public owner;
    
    // Array to store all created study groups
    address[] public studyGroups;
    
    // Events
    event StudyGroupCreated(address indexed groupAddress, string name, address creator);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Constructor to create the factory
     * @param _studyTokenAddress Address of the StudyToken contract
     */
    constructor(address _studyTokenAddress) {
        owner = msg.sender;
        studyToken = StudyToken(_studyTokenAddress);
    }
    
    /**
     * @dev Create a new study group
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
        // Create new study group
        StudyGroup newGroup = new StudyGroup(
            name,
            description,
            minStakeAmount,
            address(studyToken)
        );
        
        address groupAddress = address(newGroup);
        studyGroups.push(groupAddress);
        
        emit StudyGroupCreated(groupAddress, name, msg.sender);
        
        return groupAddress;
    }
    
    /**
     * @dev Get all study groups
     * @return Array of study group addresses
     */
    function getAllStudyGroups() external view returns (address[] memory) {
        return studyGroups;
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
}