import { ethers } from "krnl-sdk";
import StudyDAOJSON from '../contracts/StudyDAO.json';

export class ContractService {
  constructor(signer) {
    this.contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    // Use ethers v5 Contract constructor
    this.contract = new ethers.Contract(
      this.contractAddress, 
      StudyDAOJSON.abi, 
      signer
    );
  }

  async createStudyGroup(name, description, minStakeAmount) {
    try {
      // Convert minStakeAmount to proper format if it's a number
      const stakeAmount = typeof minStakeAmount === 'number' 
        ? ethers.utils.parseEther(minStakeAmount.toString()) // v5 syntax
        : minStakeAmount;
        
      const tx = await this.contract.createStudyGroup(name, description, stakeAmount);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error creating study group:", error);
      throw error;
    }
  }

  async joinGroup(groupId, stakeAmount) {
    try {
      // Convert stakeAmount to proper format and send as value
      const value = typeof stakeAmount === 'number' 
        ? ethers.utils.parseEther(stakeAmount.toString()) // v5 syntax
        : stakeAmount;
        
      const tx = await this.contract.joinGroup(groupId, { value });
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error joining group:", error);
      throw error;
    }
  }

  async logStudySession(duration, studyTopic) {
    try {
      const tx = await this.contract.logStudySession(duration, studyTopic);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error logging study session:", error);
      throw error;
    }
  }

  async verifyStudySessionWithKRNL(krnlPayload, member, sessionIndex) {
    try {
      const tx = await this.contract.verifyStudySessionWithKRNL(
        krnlPayload,
        member,
        sessionIndex
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error verifying study session with KRNL:", error);
      throw error;
    }
  }

  // View functions
  async getStudyGroup(groupId) {
    try {
      return await this.contract.getStudyGroup(groupId);
    } catch (error) {
      console.error("Error getting study group:", error);
      throw error;
    }
  }

  async getMember(memberAddress) {
    try {
      return await this.contract.members(memberAddress);
    } catch (error) {
      console.error("Error getting member:", error);
      throw error;
    }
  }

  async getMemberStudySessions(member) {
    try {
      return await this.contract.getMemberStudySessions(member);
    } catch (error) {
      console.error("Error getting member study sessions:", error);
      throw error;
    }
  }

  async canVerifyRecentSession(member) {
    try {
      return await this.contract.canVerifyRecentSession(member);
    } catch (error) {
      console.error("Error checking if can verify recent session:", error);
      throw error;
    }
  }

  // Additional utility methods
  async getGroupCount() {
    try {
      return await this.contract.groupCount();
    } catch (error) {
      console.error("Error getting group count:", error);
      throw error;
    }
  }

  // Helper method to format ether amounts for display (v5 syntax)
  formatEther(amount) {
    return ethers.utils.formatEther(amount);
  }

  // Helper method to parse ether amounts from user input (v5 syntax)
  parseEther(amount) {
    return ethers.utils.parseEther(amount.toString());
  }
}