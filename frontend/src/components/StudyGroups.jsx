import React, { useState, useEffect } from 'react';
import { ethers } from "krnl-sdk";
import StudyDAOJSON from '../contracts/StudyDAO.json';

// KRNL Configuration
const KRNL_CONFIG = {
  rpcUrl: 'https://v0-0-1-rpc.node.lat',
  entryId: '',
  accessToken: '',
  contractAddress: '0x409C5d635F80bCaF790fE57cB081CD7f444a985A',
  kernelId: 1593
};

const StudyGroups = () => {
  // State Management
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [krnlProvider, setKrnlProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form States
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showLogSession, setShowLogSession] = useState(false);
  const [showVerifySession, setShowVerifySession] = useState(false);

  // Data States
  const [studyGroups, setStudyGroups] = useState([]);
  const [memberInfo, setMemberInfo] = useState(null);
  const [studySessions, setStudySessions] = useState([]);

  // Form Data
  const [formData, setFormData] = useState({
    groupName: '',
    groupDescription: '',
    minStakeAmount: '',
    groupId: '',
    stakeAmount: '',
    sessionDuration: '',
    studyTopic: '',
    sessionIndex: '',
    memberAddress: ''
  });

  // KRNL Service Class
  class KRNLService {
    constructor() {
      this.entryId = KRNL_CONFIG.entryId;
      this.accessToken = KRNL_CONFIG.accessToken;
      this.contractAddress = KRNL_CONFIG.contractAddress;
      this.provider = new ethers.JsonRpcProvider(KRNL_CONFIG.rpcUrl);
      this.abiCoder = new ethers.AbiCoder();
    }

    async executeKernel(senderAddress, functionName, functionParams) {
      try {
        const kernelParams = this.encodeKernelParams(functionName, functionParams);
        
        const kernelRequestData = {
          senderAddress: senderAddress,
          kernelPayload: {
            [KRNL_CONFIG.kernelId]: {
              functionParams: kernelParams
            }
          }
        };

        const encodedFunctionParams = this.encodeFunctionParams(functionName, functionParams);

        const result = await this.provider.executeKernels(
          this.entryId,
          this.accessToken,
          kernelRequestData,
          encodedFunctionParams
        );

        return result;
      } catch (error) {
        console.error("KRNL execution error:", error);
        throw new Error(`KRNL execution failed: ${error.message}`);
      }
    }

    encodeKernelParams(functionName, params) {
      switch (functionName) {
        case 'verifyStudySessionWithKRNL':
          return this.abiCoder.encode(
            ["address", "uint256"],
            [params.member, params.sessionIndex]
          );
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }

    encodeFunctionParams(functionName, params) {
      switch (functionName) {
        case 'verifyStudySessionWithKRNL':
          return this.abiCoder.encode(
            ["address", "uint256"],
            [params.member, params.sessionIndex]
          );
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }
  }

  // Initialize Web3 and KRNL
  useEffect(() => {
    initializeWeb3();
    initializeKRNL();
  }, []);

  // Load data when account changes
  useEffect(() => {
    if (account && contract) {
      loadStudyGroups();
      loadMemberInfo();
      loadStudySessions();
    }
  }, [account, contract]);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          KRNL_CONFIG.contractAddress,
          StudyDAOJSON.abi,
          signer
        );

        setProvider(provider);
        setSigner(signer);
        setContract(contract);
        setAccount(accounts[0]);
      } catch (error) {
        setError('Failed to connect to MetaMask: ' + error.message);
      }
    } else {
      setError('MetaMask not found. Please install MetaMask.');
    }
  };

  const initializeKRNL = () => {
    try {
      const krnlProvider = new ethers.JsonRpcProvider(KRNL_CONFIG.rpcUrl);
      setKrnlProvider(krnlProvider);
    } catch (error) {
      setError('Failed to initialize KRNL: ' + error.message);
    }
  };

  const loadStudyGroups = async () => {
    try {
      // Load multiple groups (assuming group IDs 0-9 exist)
      const groups = [];
      for (let i = 0; i < 10; i++) {
        try {
          const group = await contract.getStudyGroup(i);
          if (group.name !== '') {
            groups.push({
              id: i,
              name: group.name,
              description: group.description,
              minStakeAmount: ethers.formatEther(group.minStakeAmount),
              memberCount: group.memberCount.toString(),
              isActive: group.isActive
            });
          }
        } catch (error) {
          // Group doesn't exist, continue
          break;
        }
      }
      setStudyGroups(groups);
    } catch (error) {
      console.error('Error loading study groups:', error);
    }
  };

  const loadMemberInfo = async () => {
    try {
      const member = await contract.members(account);
      setMemberInfo({
        groupId: member.groupId.toString(),
        stakeAmount: ethers.formatEther(member.stakeAmount),
        sessionCount: member.sessionCount.toString(),
        isActive: member.isActive,
        totalTokensEarned: ethers.formatEther(member.totalTokensEarned)
      });
    } catch (error) {
      console.error('Error loading member info:', error);
    }
  };

  const loadStudySessions = async () => {
  try {
    const sessions = await contract.getMemberStudySessions(account);
    setStudySessions(sessions.map((session, index) => ({
      index,
      duration: session.duration ? session.duration.toString() : '0',
      studyTopic: session.studyTopic || 'No topic',
      timestamp: session.timestamp ? new Date(Number(session.timestamp) * 1000).toLocaleString() : 'Unknown date',
      isVerified: session.isVerified || false,
      // Fix: Check if tokensEarned exists and is not null before formatting
      tokensEarned: session.tokensEarned ? ethers.formatEther(session.tokensEarned) : '0'
    })));
  } catch (error) {
    console.error('Error loading study sessions:', error);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const createStudyGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const minStakeWei = ethers.parseEther(formData.minStakeAmount);
      const tx = await contract.createStudyGroup(
        formData.groupName,
        formData.groupDescription,
        minStakeWei
      );
      await tx.wait();
      
      setSuccess('Study group created successfully!');
      setShowCreateGroup(false);
      setFormData(prev => ({ ...prev, groupName: '', groupDescription: '', minStakeAmount: '' }));
      await loadStudyGroups();
    } catch (error) {
      setError('Error creating study group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const transferTokensToContract = async (amount) => {
    try {
      const stakeWei = ethers.parseEther(amount);
      const tx = await contract.transfer(KRNL_CONFIG.contractAddress, stakeWei);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Transfer error:', error);
      return false;
    }
  };

  const joinGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      // Convert stake amount to Wei (token units, not ETH)
      const stakeWei = ethers.parseEther(formData.stakeAmount);
      
      console.log('Stake amount (tokens):', formData.stakeAmount);
      console.log('Stake amount (Wei):', stakeWei.toString());
      
      // First, check if user has enough tokens
      const userBalance = await contract.balanceOf(account);
      console.log('User balance:', ethers.formatEther(userBalance));
      
      if (userBalance < stakeWei) {
        setError('Insufficient token balance. You need ' + formData.stakeAmount + ' STUDY tokens.');
        return;
      }
      
      // Step 1: Transfer tokens to the contract first
      setSuccess('Step 1: Transferring tokens to contract...');
      const transferSuccess = await transferTokensToContract(formData.stakeAmount);
      if (!transferSuccess) {
        setError('Failed to transfer tokens to contract');
        return;
      }
      
      // Step 2: Join the group (contract will transfer from itself to itself)
      setSuccess('Step 2: Joining the group...');
      const tx = await contract.joinGroup(
        parseInt(formData.groupId),
        stakeWei
      );
      await tx.wait();
      
      setSuccess('Successfully joined the study group!');
      setShowJoinGroup(false);
      setFormData(prev => ({ ...prev, groupId: '', stakeAmount: '' }));
      await loadMemberInfo();
      await loadStudyGroups();
    } catch (error) {
      console.error('Join group error details:', error);
      setError('Error joining group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const logStudySession = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const tx = await contract.logStudySession(
        parseInt(formData.sessionDuration),
        formData.studyTopic
      );
      await tx.wait();
      
      setSuccess('Study session logged successfully!');
      setShowLogSession(false);
      setFormData(prev => ({ ...prev, sessionDuration: '', studyTopic: '' }));
      await loadStudySessions();
      await loadMemberInfo();
    } catch (error) {
      setError('Error logging study session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyStudySessionWithKRNL = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      // Initialize KRNL service
      const krnlService = new KRNLService();
      
      // Prepare parameters
      const member = formData.memberAddress || account;
      const sessionIndex = parseInt(formData.sessionIndex);

      // Step 1: Execute KRNL kernel for AI recommendation
      setSuccess('Executing KRNL kernel for AI verification...');
      const krnlResult = await krnlService.executeKernel(
        account,
        'verifyStudySessionWithKRNL',
        { member, sessionIndex }
      );

      // Step 2: Format KRNL payload for smart contract
      const krnlPayload = {
        auth: krnlResult.auth,
        kernelResponses: krnlResult.kernel_responses,
        kernelParams: krnlResult.kernel_params
      };

      // Step 3: Call smart contract with KRNL payload
      setSuccess('Submitting KRNL verification to smart contract...');
      const tx = await contract.verifyStudySessionWithKRNL(
        krnlPayload,
        member,
        sessionIndex
      );
      await tx.wait();

      setSuccess('Study session verified successfully with KRNL AI!');
      setShowVerifySession(false);
      setFormData(prev => ({ ...prev, memberAddress: '', sessionIndex: '' }));
      await loadStudySessions();
      await loadMemberInfo();
    } catch (error) {
      console.error('KRNL verification error:', error);
      setError('Error verifying with KRNL: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkCanVerifyRecentSession = async () => {
    try {
      const canVerify = await contract.canVerifyRecentSession(account);
      if (canVerify) {
        setSuccess('You can verify your most recent session!');
      } else {
        setError('No recent session available for verification or cooldown period not met.');
      }
    } catch (error) {
      setError('Error checking verification eligibility: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="text-blue-400">STUDY</span>
                <span className="text-purple-500">DAO</span>
              </h1>
              <p className="text-gray-400 text-lg">Decentralized study groups with AI-powered verification</p>
              <div className="h-1 w-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mt-3"></div>
            </div>
            {account && (
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-gray-400 text-sm">Connected Wallet</p>
                    <p className="text-blue-400 font-mono text-sm">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setShowCreateGroup(!showCreateGroup)}
            className={`relative overflow-hidden group transition-all duration-300 ${
              showCreateGroup 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25' 
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-gray-700 hover:border-blue-500/50`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">🏗️</span>
              <span className="font-medium">Create Group</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
          
          <button
            onClick={() => setShowJoinGroup(!showJoinGroup)}
            className={`relative overflow-hidden group transition-all duration-300 ${
              showJoinGroup 
                ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/25' 
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-gray-700 hover:border-green-500/50`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">🤝</span>
              <span className="font-medium">Join Group</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
          
          <button
            onClick={() => setShowLogSession(!showLogSession)}
            className={`relative overflow-hidden group transition-all duration-300 ${
              showLogSession 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25' 
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-gray-700 hover:border-purple-500/50`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">📚</span>
              <span className="font-medium">Log Session</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
          
          <button
            onClick={() => setShowVerifySession(!showVerifySession)}
            className={`relative overflow-hidden group transition-all duration-300 ${
              showVerifySession 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/25' 
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-gray-700 hover:border-orange-500/50`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="font-medium">KRNL Verify</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
        </div>

        {/* Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Create Study Group Form */}
          {showCreateGroup && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🏗️</span>
                </div>
                <h3 className="text-xl font-semibold text-white">Create Study Group</h3>
              </div>
              <form onSubmit={createStudyGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    name="groupName"
                    value={formData.groupName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="groupDescription"
                    value={formData.groupDescription}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    rows="3"
                    placeholder="Describe your study group"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Stake (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="minStakeAmount"
                    value={formData.minStakeAmount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="0.001"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </span>
                  ) : (
                    'Create Group'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Join Group Form */}
          {showJoinGroup && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🤝</span>
                </div>
                <h3 className="text-xl font-semibold text-white">Join Study Group</h3>
              </div>
              <form onSubmit={joinGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Group ID
                  </label>
                  <input
                    type="number"
                    name="groupId"
                    value={formData.groupId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter group ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stake Amount (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="stakeAmount"
                    value={formData.stakeAmount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="0.001"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Joining...
                    </span>
                  ) : (
                    'Join Group'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Log Study Session Form */}
          {showLogSession && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">📚</span>
                </div>
                <h3 className="text-xl font-semibold text-white">Log Study Session</h3>
              </div>
              <form onSubmit={logStudySession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="sessionDuration"
                    value={formData.sessionDuration}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="e.g., 60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Study Topic
                  </label>
                  <input
                    type="text"
                    name="studyTopic"
                    value={formData.studyTopic}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="What did you study?"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Logging...
                    </span>
                  ) : (
                    'Log Session'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* KRNL Verify Session Form */}
          {showVerifySession && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <h3 className="text-xl font-semibold text-white">KRNL AI Verification</h3>
              </div>
              <form onSubmit={verifyStudySessionWithKRNL} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Member Address (optional)
                  </label>
                  <input
                    type="text"
                    name="memberAddress"
                    value={formData.memberAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Leave empty to verify your own session"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Index
                  </label>
                  <input
                    type="number"
                    name="sessionIndex"
                    value={formData.sessionIndex}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Session index to verify"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={checkCanVerifyRecentSession}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg transition duration-200 font-medium shadow-lg mb-2"
                >
                  Check Verification Eligibility
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying with AI...
                    </span>
                  ) : (
                    'Verify with KRNL AI'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Data Display Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Study Groups */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🏛️</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Available Groups</h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {studyGroups.length > 0 ? (
                studyGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      group.isActive
                        ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30 hover:border-blue-400/50'
                        : 'bg-gray-900/30 border-gray-600/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white text-lg">{group.name}</h4>
                        <p className="text-gray-400 text-sm">ID: {group.id}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        group.isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3 leading-relaxed">{group.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-blue-400 font-medium">
                          Min: {group.minStakeAmount} ETH
                        </span>
                        <span className="text-purple-400 flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                          {group.memberCount} members
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🏛️</span>
                  </div>
                  <p className="text-gray-400">No study groups available</p>
                  <p className="text-gray-500 text-sm mt-1">Create the first one!</p>
                </div>
              )}
            </div>
          </div>

          {/* Member Info */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">👤</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Your Profile</h3>
            </div>
            {memberInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-400 text-sm font-medium">Group ID</p>
                    <p className="text-white text-xl font-bold">{memberInfo.groupId}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm font-medium">Status</p>
                    <p className={`text-lg font-semibold ${memberInfo.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {memberInfo.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-purple-400 text-sm font-medium">Stake Amount</p>
                  <p className="text-white text-xl font-bold">{memberInfo.stakeAmount} ETH</p>
                </div>
                <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-4">
                  <p className="text-orange-400 text-sm font-medium">Sessions Completed</p>
                  <p className="text-white text-xl font-bold">{memberInfo.sessionCount}</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm font-medium">Tokens Earned</p>
                  <p className="text-white text-xl font-bold">{memberInfo.totalTokensEarned} STUDY</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👤</span>
                </div>
                <p className="text-gray-400">Not a member yet</p>
                <p className="text-gray-500 text-sm mt-1">Join a study group to get started!</p>
              </div>
            )}
          </div>

          {/* Study Sessions */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Study Sessions</h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {studySessions.length > 0 ? (
                studySessions.map((session, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      session.isVerified
                        ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30'
                        : 'bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">{session.studyTopic}</h4>
                        <p className="text-gray-400 text-sm">Session #{session.index}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        session.isVerified 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}>
                        {session.isVerified ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Duration</p>
                        <p className="text-blue-400 font-medium">{session.duration} min</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tokens</p>
                        <p className="text-purple-400 font-medium">{session.tokensEarned}</p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">{session.timestamp}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-gray-400">No study sessions yet</p>
                  <p className="text-gray-500 text-sm mt-1">Log your first session!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <p className="text-gray-400 mb-2">
              Powered by <span className="text-blue-400 font-semibold">KRNL</span> and <span className="text-purple-400 font-semibold">Ethereum</span>
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>🔒 Decentralized</span>
              <span>🤖 AI-Verified</span>
              <span>🏆 Token Rewards</span>
              <span>📚 Study Together</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyGroups;