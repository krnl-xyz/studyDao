// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// KRNL Structs
struct KrnlPayload {
    bytes auth;
    bytes kernelResponses;
    bytes kernelParams;
}

struct KernelParameter {
    uint8 resolverType;
    bytes parameters;
    string err;
}

struct KernelResponse {
    uint256 kernelId;
    bytes result;
    string err;
}

/**
 * @title StudyDAO
 * @dev Combined contract for StudyDAO with KRNL integration
 * Uses Kernel ID 1593 for getRecommendedTokenAllocation
 */
contract StudyDAO is ERC20, Ownable {
    error UnauthorizedTransaction();

    // KRNL Integration
    address public tokenAuthorityPublicKey;
    mapping(bytes => bool) public executed;

    // Study Group Structures
    struct Member {
        bool isActive;
        uint256 totalStudyMinutes;
        uint256 stakeAmount;
        uint256 lastStudyTimestamp;
        uint256 groupId;
    }

    struct StudySession {
        uint256 startTime;
        uint256 duration; // in minutes
        string studyTopic;
        bool verified;
        uint256 rewardAmount;
    }

    struct StudyGroup {
        string name;
        string description;
        uint256 minStakeAmount;
        address admin;
        bool isActive;
        uint256 memberCount;
        uint256 totalStudyMinutes;
    }

    // State Variables
    mapping(address => Member) public members;
    mapping(address => StudySession[]) public memberStudySessions;
    mapping(uint256 => StudyGroup) public studyGroups;
    mapping(uint256 => address[]) public groupMembers;
    
    uint256 public nextGroupId = 1;
    uint256 public totalMembers;
    uint256 public totalStudyMinutes;

    // Events
    event StudyGroupCreated(uint256 indexed groupId, string name, address admin);
    event MemberJoined(address indexed member, uint256 indexed groupId, uint256 stakeAmount);
    event MemberLeft(address indexed member, uint256 indexed groupId, uint256 returnedStake);
    event StudySessionLogged(address indexed member, uint256 indexed groupId, uint256 duration, string studyTopic);
    event StudySessionVerified(address indexed member, uint256 sessionIndex, uint256 rewardAmount);
    event TokenAllocationRecommended(address indexed member, uint8 recommendedAllocation);

    // Modifiers
    modifier onlyAuthorized(KrnlPayload memory krnlPayload, bytes memory params) {
        if (!_isAuthorized(krnlPayload, params)) {
            revert UnauthorizedTransaction();
        }
        _;
    }

    modifier onlyGroupAdmin(uint256 groupId) {
        require(studyGroups[groupId].admin == msg.sender, "Only group admin can call this function");
        _;
    }

    modifier onlyActiveMember() {
        require(members[msg.sender].isActive, "Only active members can call this function");
        _;
    }

    /**
     * @dev Constructor
     * @param _tokenAuthorityPublicKey Address for KRNL authentication
     * @param initialSupply Initial token supply
     */
    constructor(
        address _tokenAuthorityPublicKey,
        uint256 initialSupply
    ) ERC20("StudyToken", "STUDY") Ownable(msg.sender) {
        tokenAuthorityPublicKey = _tokenAuthorityPublicKey;
        _mint(msg.sender, initialSupply * 10**decimals());
    }

    // KRNL Functions
    function setTokenAuthorityPublicKey(address _tokenAuthorityPublicKey) external onlyOwner {
        tokenAuthorityPublicKey = _tokenAuthorityPublicKey;
    }

    function _isAuthorized(
        KrnlPayload memory payload,
        bytes memory functionParams
    ) private view returns (bool) {
        (
            bytes memory kernelResponseSignature,
            bytes32 kernelParamObjectDigest,
            bytes memory signatureToken,
            uint256 nonce,
            bool finalOpinion
        ) = abi.decode(
                payload.auth,
                (bytes, bytes32, bytes, uint256, bool)
            );

        if (finalOpinion == false) {
            revert("Final opinion reverted");
        }

        bytes32 kernelResponsesDigest = keccak256(
            abi.encodePacked(payload.kernelResponses, msg.sender)
        );

        address recoveredAddress = ECDSA.recover(
            kernelResponsesDigest,
            kernelResponseSignature
        );

        if (recoveredAddress != tokenAuthorityPublicKey) {
            revert("Invalid signature for kernel responses");
        }

        bytes32 _kernelParamsDigest = keccak256(
            abi.encodePacked(payload.kernelParams, msg.sender)
        );

        bytes32 functionParamsDigest = keccak256(functionParams);

        if (_kernelParamsDigest != kernelParamObjectDigest) {
            revert("Invalid kernel params digest");
        }

        bytes32 dataDigest = keccak256(
            abi.encodePacked(
                functionParamsDigest,
                kernelParamObjectDigest,
                msg.sender,
                nonce,
                finalOpinion
            )
        );

        recoveredAddress = ECDSA.recover(dataDigest, signatureToken);
        if (recoveredAddress != tokenAuthorityPublicKey) {
            revert("Invalid signature for function call");
        }

        return true;
    }

    // Study Group Management Functions

    /**
     * @dev Create a new study group
     */
    function createStudyGroup(
        string memory name,
        string memory description,
        uint256 minStakeAmount
    ) external returns (uint256) {
        uint256 groupId = nextGroupId++;
        
        studyGroups[groupId] = StudyGroup({
            name: name,
            description: description,
            minStakeAmount: minStakeAmount,
            admin: msg.sender,
            isActive: true,
            memberCount: 0,
            totalStudyMinutes: 0
        });

        emit StudyGroupCreated(groupId, name, msg.sender);
        return groupId;
    }

    /**
     * @dev Join a study group by staking tokens
     */
    function joinGroup(uint256 groupId, uint256 stakeAmount) external {
        require(studyGroups[groupId].isActive, "Group not active");
        require(!members[msg.sender].isActive, "Already a member");
        require(stakeAmount >= studyGroups[groupId].minStakeAmount, "Stake amount too low");
        
        // Transfer tokens from member to contract
        require(transfer(address(this), stakeAmount), "Token transfer failed");
        
        // Add member
        members[msg.sender] = Member({
            isActive: true,
            totalStudyMinutes: 0,
            stakeAmount: stakeAmount,
            lastStudyTimestamp: 0,
            groupId: groupId
        });
        
        groupMembers[groupId].push(msg.sender);
        studyGroups[groupId].memberCount++;
        totalMembers++;

        emit MemberJoined(msg.sender, groupId, stakeAmount);
    }

    /**
     * @dev Leave the study group and receive staked tokens back
     */
    function leaveGroup() external onlyActiveMember {
        Member storage member = members[msg.sender];
        uint256 groupId = member.groupId;
        uint256 stakeToReturn = member.stakeAmount;
        
        // Update member status
        member.isActive = false;
        member.stakeAmount = 0;
        
        // Update group stats
        studyGroups[groupId].memberCount--;
        totalMembers--;
        
        // Return staked tokens
        _transfer(address(this), msg.sender, stakeToReturn);
        
        emit MemberLeft(msg.sender, groupId, stakeToReturn);
    }

    /**
     * @dev Log a new study session
     */
    function logStudySession(uint256 duration, string calldata studyTopic) external onlyActiveMember {
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
            verified: false,
            rewardAmount: 0
        });
        
        memberStudySessions[msg.sender].push(newSession);
        member.lastStudyTimestamp = block.timestamp;
        
        emit StudySessionLogged(msg.sender, member.groupId, duration, studyTopic);
    }

    /**
     * @dev Verify a study session and reward the member using KRNL
     */
    function verifyStudySessionWithKRNL(
        KrnlPayload memory krnlPayload,
        address member,
        uint256 sessionIndex
    ) external onlyAuthorized(krnlPayload, abi.encode(member, sessionIndex)) {
        require(members[member].isActive, "Not an active member");
        require(sessionIndex < memberStudySessions[member].length, "Invalid session index");
        
        StudySession storage session = memberStudySessions[member][sessionIndex];
        require(!session.verified, "Session already verified");
        
        // Decode response from kernel 1593 (getRecommendedTokenAllocation)
        KernelResponse[] memory kernelResponses = abi.decode(krnlPayload.kernelResponses, (KernelResponse[]));
        uint8 recommendedAllocation = 100; // Default allocation
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            if (kernelResponses[i].kernelId == 1593) {
                recommendedAllocation = abi.decode(kernelResponses[i].result, (uint8));
                break;
            }
        }
        
        // Mark session as verified
        session.verified = true;
        
        // Update member's total study minutes
        members[member].totalStudyMinutes += session.duration;
        studyGroups[members[member].groupId].totalStudyMinutes += session.duration;
        totalStudyMinutes += session.duration;
        
        // Calculate reward based on kernel recommendation
        // Base reward: 1 token per 10 minutes, adjusted by kernel recommendation
        uint256 baseReward = (session.duration * 10**decimals()) / 10;
        uint256 rewardAmount = (baseReward * recommendedAllocation) / 100;
        
        session.rewardAmount = rewardAmount;
        
        // Mint rewards to member
        _mint(member, rewardAmount);
        
        emit StudySessionVerified(member, sessionIndex, rewardAmount);
        emit TokenAllocationRecommended(member, recommendedAllocation);
    }

    /**
     * @dev Simple verify function without KRNL (for admin use)
     */
    function verifyStudySession(address member, uint256 sessionIndex) external {
        uint256 groupId = members[member].groupId;
        require(studyGroups[groupId].admin == msg.sender, "Only group admin can verify");
        require(members[member].isActive, "Not an active member");
        require(sessionIndex < memberStudySessions[member].length, "Invalid session index");
        
        StudySession storage session = memberStudySessions[member][sessionIndex];
        require(!session.verified, "Session already verified");
        
        // Mark session as verified
        session.verified = true;
        
        // Update member's total study minutes
        members[member].totalStudyMinutes += session.duration;
        studyGroups[groupId].totalStudyMinutes += session.duration;
        totalStudyMinutes += session.duration;
        
        // Calculate standard reward (1 token per 10 minutes)
        uint256 rewardAmount = (session.duration * 10**decimals()) / 10;
        session.rewardAmount = rewardAmount;
        
        // Mint rewards to member
        _mint(member, rewardAmount);
        
        emit StudySessionVerified(member, sessionIndex, rewardAmount);
    }

    // View Functions

    /**
     * @dev Get study group information
     */
    function getStudyGroup(uint256 groupId) external view returns (StudyGroup memory) {
        return studyGroups[groupId];
    }

    /**
     * @dev Get member information
     */
    function getMember(address memberAddress) external view returns (Member memory) {
        return members[memberAddress];
    }

    /**
     * @dev Get study sessions for a specific member
     */
    function getMemberStudySessions(address member) external view returns (StudySession[] memory) {
        return memberStudySessions[member];
    }

    /**
     * @dev Get group members
     */
    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        return groupMembers[groupId];
    }

    /**
     * @dev Check if a member can receive verification for recent study session
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

    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 _totalMembers,
        uint256 _totalStudyMinutes,
        uint256 _totalGroups,
        uint256 _totalSupply
    ) {
        return (totalMembers, totalStudyMinutes, nextGroupId - 1, totalSupply());
    }

    /**
     * @dev Emergency functions for owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = balanceOf(address(this));
        if (balance > 0) {
            _transfer(address(this), owner(), balance);
        }
    }

    function pauseGroup(uint256 groupId) external onlyOwner {
        studyGroups[groupId].isActive = false;
    }

    function unpauseGroup(uint256 groupId) external onlyOwner {
        studyGroups[groupId].isActive = true;
    }
}