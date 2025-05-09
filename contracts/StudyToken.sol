// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StudyToken
 * @dev ERC20 token for the StudyDAO platform
 */
contract StudyToken is ERC20, Ownable {
    // Mapping to track minters (can be StudyGroup contracts or other authorized entities)
    mapping(address => bool) public minters;
    
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    /**
     * @dev Constructor that initializes the token with name and symbol
     * @param initialSupply The initial token supply to mint to the contract deployer
     */
    constructor(uint256 initialSupply) ERC20("StudyToken", "STUDY") Ownable(msg.sender) {
        // Mint initial supply to the deployer
        _mint(msg.sender, initialSupply * 10**decimals());
    }
    
    /**
     * @dev Add a new minter address
     * @param minter The address to add as a minter
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove a minter address
     * @param minter The address to remove as a minter
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Mint new tokens to a recipient (only callable by minters)
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mintReward(address to, uint256 amount) external {
        require(minters[msg.sender], "Only minters can mint rewards");
        require(to != address(0), "Cannot mint to zero address");
        
        _mint(to, amount);
    }
}