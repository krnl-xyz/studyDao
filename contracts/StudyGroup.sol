// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StudyToken.sol";

/**
 * @title StudyGroup
 * @dev Contract for managing study groups and rewarding study sessions
 */
contract StudyGroup {
    // StudyToken contract reference
    StudyToken public studyToken;
    
    // Group information
    string public name;
    string public description;
    uint256 public minStakeAmount;
    address public admin;
    
    // Member structure
    struct Member {
        bool isActive;
        uint256 totalStudyMinutes;
        uint256 stakeAmount;
        uint256 lastStudyTimestamp;
    }
    
    // Study session structure
    struct StudySession {
        uint256 startTime;
        uint256 duration; // in minutes
        string studyTopic;
        bool verified;
    }
    
    // Mappings
    mapping(address => Member) public members;
    mapping(address => StudySession[]) public memberStudySessions;
    address[] public memberList;
    
    // Events
    event GroupCreated(string name, address admin);
    event MemberJoined(address indexed member, uint256 stakeAmount);
    event MemberLeft(address indexed member, uint256 returnedStake);
    event StudySessionLogged(address indexed member, uint256 duration, string studyTopic);
    event StudySessionVerified(address indexed member, uint256 sessionIndex, uint256 rewardAmount);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlyMember() {
        require(members[msg.sender].isActive, "Only active members can call this function");
        _;
    }
    
    /**
     * @dev Constructor to create a new study group
     * @param _name Name of the study group
     * @param _description Description of the study group
     * @param _minStakeAmount Minimum amount required to join the group
     * @param _studyTokenAddress Address of the StudyToken contract
     */
    constructor(
        string memory _name,
        string memory _description,
        uint256 _minStakeAmount,
        address _studyTokenAddress
    ) {
        name = _name;
        description = _description;
        minStakeAmount = _minStakeAmount;
        admin = msg.sender;
        studyToken = StudyToken(_studyTokenAddress);
        
        emit GroupCreated(_name, msg.sender);
    }
    
    /**
     * @dev Join a study group by staking tokens
     * @param stakeAmount Amount of tokens to stake (must be >= minStakeAmount)
     */
    function joinGroup(uint256 stakeAmount) external {
        require(!members[msg.sender].isActive, "Already a member");
        require(stakeAmount >= minStakeAmount, "Stake amount too low");
        
        // Transfer tokens from member to contract
        require(studyToken.transferFrom(msg.sender, address(this), stakeAmount), "Token transfer failed");
        
        // Add member
        members[msg.sender] = Member({
            isActive: true,
            totalStudyMinutes: 0,
            stakeAmount: stakeAmount,
            lastStudyTimestamp: 0
        });
        
        memberList.push(msg.sender);
        emit MemberJoined(msg.sender, stakeAmount);
    }
    
    /**
     * @dev Leave the study group and receive staked tokens back
     */
    function leaveGroup() external onlyMember {
        Member storage member = members[msg.sender];
        uint256 stakeToReturn = member.stakeAmount;
        
        // Update member status
        member.isActive = false;
        member.stakeAmount = 0;
        
        // Return staked tokens
        require(studyToken.transfer(msg.sender, stakeToReturn), "Token transfer failed");
        
        emit MemberLeft(msg.sender, stakeToReturn);
    }
    
    /**
     * @dev Log a new study session
     * @param duration Duration of study in minutes
     * @param studyTopic Topic that was studied
     */
    function logStudySession(uint256 duration, string calldata studyTopic) external onlyMember {
        Member storage member = members[msg.sender];
        
        // Ensure reasonable duration (max 12 hours)
        require(duration > 0 && duration <= 720, "Invalid duration");
        
        // Ensure some time has passed since last study session
        require(block.timestamp > member.lastStudyTimestamp + 15 minutes, "Too soon for new session");
        
        // Create and store the study session
        StudySession memory newSession = StudySession({
            startTime: block.timestamp,
            duration: duration,
            studyTopic: studyTopic,
            verified: false
        });
        
        memberStudySessions[msg.sender].push(newSession);
        member.lastStudyTimestamp = block.timestamp;
        
        emit StudySessionLogged(msg.sender, duration, studyTopic);
    }
    
    /**
     * @dev Verify a study session and reward the member
     * @param member Address of the member
     * @param sessionIndex Index of the session to verify
     */
    function verifyStudySession(address member, uint256 sessionIndex) external onlyAdmin {
        require(members[member].isActive, "Not an active member");
        require(sessionIndex < memberStudySessions[member].length, "Invalid session index");
        
        StudySession storage session = memberStudySessions[member][sessionIndex];
        require(!session.verified, "Session already verified");
        
        // Mark session as verified
        session.verified = true;
        
        // Update member's total study minutes
        members[member].totalStudyMinutes += session.duration;
        
        // Calculate reward (1 token per 10 minutes of study)
        uint256 rewardAmount = (session.duration * 10**18) / 10;
        
        // Request token contract to mint rewards
        studyToken.mintReward(member, rewardAmount);
        
        emit StudySessionVerified(member, sessionIndex, rewardAmount);
    }
    
    /**
     * @dev Get total number of members in the group
     */
    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }
    
    /**
     * @dev Get study sessions for a specific member
     * @param member Address of the member
     */
    function getMemberStudySessions(address member) external view returns (StudySession[] memory) {
        return memberStudySessions[member];
    }
    
    /**
     * @dev Check if a member can receive verification for recent study session
     * @param member Address of the member
     * @return canVerify Whether the member can be verified
     * @return sessionIndex Index of the session to verify
     */
    function canVerifyRecentSession(address member) external view returns (bool canVerify, uint256 sessionIndex) {
        if (!members[member].isActive || memberStudySessions[member].length == 0) {
            return (false, 0);
        }
        
        sessionIndex = memberStudySessions[member].length - 1;
        StudySession memory session = memberStudySessions[member][sessionIndex];
        
        // Check if the session is recent (within last 24 hours) and not verified
        if (!session.verified && (block.timestamp - session.startTime < 1 days)) {
            return (true, sessionIndex);
        }
        
        return (false, 0);
    }
}