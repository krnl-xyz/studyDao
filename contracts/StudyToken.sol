// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StudyToken
 * @dev ERC20 token for the StudyDAO platform with enhanced minting controls
 */
contract StudyToken is ERC20, Ownable {
    // Mapping to track minters (can be StudyGroup contracts or other authorized entities)
    mapping(address => bool) public minters;
    
    // Mapping to track minting limits per minter
    mapping(address => uint256) public minterLimits;
    mapping(address => uint256) public minterMinted;
    
    // Global minting controls
    uint256 public maxTotalSupply;
    uint256 public dailyMintLimit;
    uint256 public lastMintReset;
    uint256 public dailyMinted;
    
    // Events
    event MinterAdded(address indexed minter, uint256 limit);
    event MinterRemoved(address indexed minter);
    event MinterLimitUpdated(address indexed minter, uint256 newLimit);
    event MaxTotalSupplyUpdated(uint256 newMaxSupply);
    event DailyMintLimitUpdated(uint256 newDailyLimit);
    event RewardMinted(address indexed minter, address indexed to, uint256 amount);
    
    /**
     * @dev Constructor that initializes the token with name and symbol
     * @param initialSupply The initial token supply to mint to the contract deployer
     * @param _maxTotalSupply Maximum total supply allowed
     * @param _dailyMintLimit Daily minting limit
     */
    constructor(
        uint256 initialSupply,
        uint256 _maxTotalSupply,
        uint256 _dailyMintLimit
    ) ERC20("StudyToken", "STUDY") Ownable(msg.sender) {
        // Set supply controls
        maxTotalSupply = _maxTotalSupply * 10**decimals();
        dailyMintLimit = _dailyMintLimit * 10**decimals();
        lastMintReset = block.timestamp;
        dailyMinted = 0;
        
        // Mint initial supply to the deployer
        uint256 initialMint = initialSupply * 10**decimals();
        require(initialMint <= maxTotalSupply, "Initial supply exceeds max supply");
        _mint(msg.sender, initialMint);
    }
    
    /**
     * @dev Reset daily minting counter if a day has passed
     */
    function _resetDailyMintIfNeeded() internal {
        if (block.timestamp >= lastMintReset + 1 days) {
            dailyMinted = 0;
            lastMintReset = block.timestamp;
        }
    }
    
    /**
     * @dev Add a new minter address with specific minting limit
     * @param minter The address to add as a minter
     * @param mintingLimit Maximum amount this minter can mint (in tokens, not wei)
     */
    function addMinter(address minter, uint256 mintingLimit) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        require(mintingLimit > 0, "Minting limit must be greater than 0");
        
        minters[minter] = true;
        minterLimits[minter] = mintingLimit * 10**decimals();
        minterMinted[minter] = 0;
        
        emit MinterAdded(minter, mintingLimit);
    }
    
    /**
     * @dev Remove a minter address
     * @param minter The address to remove as a minter
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        
        minters[minter] = false;
        minterLimits[minter] = 0;
        
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Update minting limit for a specific minter
     * @param minter The minter address
     * @param newLimit New minting limit (in tokens, not wei)
     */
    function updateMinterLimit(address minter, uint256 newLimit) external onlyOwner {
        require(minters[minter], "Not a minter");
        require(newLimit > 0, "Limit must be greater than 0");
        
        minterLimits[minter] = newLimit * 10**decimals();
        
        emit MinterLimitUpdated(minter, newLimit);
    }
    
    /**
     * @dev Update maximum total supply
     * @param newMaxSupply New maximum supply (in tokens, not wei)
     */
    function updateMaxTotalSupply(uint256 newMaxSupply) external onlyOwner {
        uint256 newMaxSupplyWei = newMaxSupply * 10**decimals();
        require(newMaxSupplyWei >= totalSupply(), "New max supply less than current supply");
        
        maxTotalSupply = newMaxSupplyWei;
        emit MaxTotalSupplyUpdated(newMaxSupply);
    }
    
    /**
     * @dev Update daily minting limit
     * @param newDailyLimit New daily limit (in tokens, not wei)
     */
    function updateDailyMintLimit(uint256 newDailyLimit) external onlyOwner {
        dailyMintLimit = newDailyLimit * 10**decimals();
        emit DailyMintLimitUpdated(newDailyLimit);
    }
    
    /**
     * @dev Mint new tokens to a recipient (only callable by minters)
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in wei)
     */
    function mintReward(address to, uint256 amount) external {
        require(minters[msg.sender], "Only minters can mint rewards");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Reset daily counter if needed
        _resetDailyMintIfNeeded();
        
        // Check various limits
        require(totalSupply() + amount <= maxTotalSupply, "Would exceed max total supply");
        require(dailyMinted + amount <= dailyMintLimit, "Would exceed daily mint limit");
        require(minterMinted[msg.sender] + amount <= minterLimits[msg.sender], "Would exceed minter limit");
        
        // Update counters
        dailyMinted += amount;
        minterMinted[msg.sender] += amount;
        
        // Mint tokens
        _mint(to, amount);
        
        emit RewardMinted(msg.sender, to, amount);
    }
    
    /**
     * @dev Get minter information
     * @param minter Address of the minter
     * @return isMinter Whether the address is a minter
     * @return limit Minting limit for this minter
     * @return minted Amount already minted by this minter
     * @return remaining Remaining minting capacity
     */
    function getMinterInfo(address minter) external view returns (
        bool isMinter,
        uint256 limit,
        uint256 minted,
        uint256 remaining
    ) {
        isMinter = minters[minter];
        limit = minterLimits[minter] / 10**decimals();
        minted = minterMinted[minter] / 10**decimals();
        remaining = isMinter ? (minterLimits[minter] - minterMinted[minter]) / 10**decimals() : 0;
        
        return (isMinter, limit, minted, remaining);
    }
    
    /**
     * @dev Get daily minting information
     * @return dailyLimit Current daily limit
     * @return todayMinted Amount minted today
     * @return remainingToday Remaining daily capacity
     * @return resetTime When the daily counter will reset
     */
    function getDailyMintInfo() external view returns (
        uint256 dailyLimit,
        uint256 todayMinted,
        uint256 remainingToday,
        uint256 resetTime
    ) {
        dailyLimit = dailyMintLimit / 10**decimals();
        
        if (block.timestamp >= lastMintReset + 1 days) {
            todayMinted = 0;
            remainingToday = dailyLimit;
            resetTime = block.timestamp;
        } else {
            todayMinted = dailyMinted / 10**decimals();
            remainingToday = (dailyMintLimit - dailyMinted) / 10**decimals();
            resetTime = lastMintReset + 1 days;
        }
        
        return (dailyLimit, todayMinted, remainingToday, resetTime);
    }
    
    /**
     * @dev Get token supply information
     * @return currentSupply Current total supply
     * @return maxSupply Maximum allowed supply
     * @return remainingSupply Remaining mintable supply
     */
    function getSupplyInfo() external view returns (
        uint256 currentSupply,
        uint256 maxSupply,
        uint256 remainingSupply
    ) {
        currentSupply = totalSupply() / 10**decimals();
        maxSupply = maxTotalSupply / 10**decimals();
        remainingSupply = (maxTotalSupply - totalSupply()) / 10**decimals();
        
        return (currentSupply, maxSupply, remainingSupply);
    }
    
    /**
     * @dev Emergency function to pause minting (only owner)
     * Sets daily limit to 0 to effectively pause minting
     */
    function pauseMinting() external onlyOwner {
        dailyMintLimit = 0;
        emit DailyMintLimitUpdated(0);
    }
    
    /**
     * @dev Reset a minter's minted amount (only owner, for emergency use)
     * @param minter The minter to reset
     */
    function resetMinterAmount(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        minterMinted[minter] = 0;
    }