import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Import contract ABIs
import FactoryJSON from '../contracts/StudyGroupFactory.json';
import TokenJSON from '../contracts/StudyToken.json';
import GroupJSON from '../contracts/StudyGroup.json';

export default function StudyDAOInterface({ user }) {
  // Blockchain connection state
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Contract instances
  const [factoryContract, setFactoryContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [selectedGroupContract, setSelectedGroupContract] = useState(null);
  
  // Data state
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [factoryOwner, setFactoryOwner] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [studyGroups, setStudyGroups] = useState([]);
  const [groupDetails, setGroupDetails] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupInfo, setGroupInfo] = useState({});
  const [isParticipant, setIsParticipant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studySessions, setStudySessions] = useState([]);
  
  // New state for all group sessions (for admin panel)
  const [allGroupSessions, setAllGroupSessions] = useState([]);
  
  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupStake, setNewGroupStake] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [verifySessionId, setVerifySessionId] = useState('');
  const [verifyUser, setVerifyUser] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Contract addresses - from deployment output
  const FACTORY_ADDRESS = "0xcDF1b090A182094E08bF95d1e48b0494b8F22f5f";
  const TOKEN_ADDRESS = "0xb3CDfDf974B89ff4dE922B3E25763b7B36F60F45";
  
  // Sonic chain ID in proper hexadecimal format
  const sonicChainId = '0xdede'; // 57054 in hex format
  
  // Check if MetaMask is installed and if an account is connected
  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setStatus('Please install MetaMask to use this app');
        setLoading(false);
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Check if we're on the right network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== sonicChainId) {
          setStatus('Please switch to Sonic Testnet');
          setLoading(false);
          return;
        }
        
        // Initialize provider and contracts
        await initializeProviderAndContracts(accounts[0]);
      } else {
        setStatus('Connect your MetaMask wallet to use this app');
        setLoading(false);
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      setStatus('Error connecting to wallet: ' + error.message);
      setLoading(false);
    }
  };
  
  // Initialize provider and contract instances
  const initializeProviderAndContracts = async (currentAccount) => {
    try {
      // Create provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      setProvider(provider);
      setSigner(signer);
      
      // Initialize factory contract
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        FactoryJSON.abi,
        signer
      );
      setFactoryContract(factory);
      
      // Initialize token contract
      const token = new ethers.Contract(
        TOKEN_ADDRESS,
        TokenJSON.abi,
        signer
      );
      setTokenContract(token);
      
      // Get token symbol and balance
      try {
        const symbol = await token.symbol();
        setTokenSymbol(symbol);
        
        const balance = await token.balanceOf(currentAccount);
        setTokenBalance(ethers.utils.formatUnits(balance, 18));
      } catch (err) {
        console.error("Error fetching token data:", err);
        setStatus('Error retrieving token information. Make sure you are on the Sonic network.');
      }
      
      // Check if user is factory owner
      try {
        const owner = await factory.owner();
        setFactoryOwner(owner);
        setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase());
        
        // Load study groups
        await loadStudyGroups(factory);
      } catch (err) {
        console.error("Error accessing factory contract:", err);
        setStatus('Error accessing factory contract. Make sure you are on the Sonic network.');
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error initializing contracts:", err);
      setStatus('Error initializing contracts: ' + err.message);
      setLoading(false);
    }
  };
  
  // Connect to MetaMask and switch to Sonic network if needed
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        setStatus('Please install MetaMask to use this app');
        setIsLoading(false);
        return;
      }

      setStatus('Connecting wallet...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Check if we're on the right network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== sonicChainId) {
        setStatus('Please switch to Sonic Testnet');
        await addSonicNetwork();
        setIsLoading(false);
        return;
      }
      
      // Initialize provider and contracts
      await initializeProviderAndContracts(accounts[0]);
      setStatus('Wallet connected successfully!');
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setStatus('Error connecting wallet: ' + error.message);
      setLoading(false);
    }
    setIsLoading(false);
  };
  
  // Add Sonic Testnet to MetaMask
  const addSonicNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: sonicChainId,
          chainName: 'Sonic Blaze Testnet',
          nativeCurrency: {
            name: 'Sonic',
            symbol: 'S',
            decimals: 18
          },
          rpcUrls: ['https://rpc.blaze.soniclabs.com'],
          blockExplorerUrls: ['https://testnet.explorer.sonic.org/']
        }]
      });
      setStatus('Sonic Testnet added to MetaMask. Please switch to this network.');
    } catch (error) {
      console.error("Error adding Sonic network:", error);
      setStatus('Error adding Sonic network: ' + error.message);
    }
  };
  
  // Load study groups
  const loadStudyGroups = useCallback(async (factory) => {
    if (!factory) {
      console.error("Factory contract is not initialized");
      return;
    }
    
    try {
      const groupAddresses = await factory.getAllStudyGroups();
      setStudyGroups(groupAddresses);
      
      if (groupAddresses.length === 0) {
        setGroupDetails([]);
        return;
      }
      
      // Load details for each group
      const details = await Promise.all(
        groupAddresses.map(async (address) => {
          try {
            const groupContract = new ethers.Contract(
              address,
              GroupJSON.abi,
              provider
            );
            
            const name = await groupContract.name();
            const description = await groupContract.description();
            const minStake = await groupContract.minStakeAmount();
            const admin = await groupContract.admin();
            
            let isParticipant = false;
            if (account) {
              try {
                const memberData = await groupContract.members(account);
                isParticipant = memberData.isActive;
              } catch (err) {
                console.error(`Error checking participation for group ${address}:`, err);
              }
            }
            
            return {
              address,
              name,
              description,
              minStake: ethers.utils.formatUnits(minStake, 18),
              admin,
              isParticipant
            };
          } catch (err) {
            console.error(`Error loading details for group ${address}:`, err);
            return {
              address,
              name: "Error loading group",
              description: "Could not load group details",
              minStake: "0",
              admin: ethers.constants.AddressZero,
              isParticipant: false
            };
          }
        })
      );
      
      setGroupDetails(details);
    } catch (err) {
      console.error("Error loading study groups:", err);
      setError(`Failed to load study groups: ${err.message}`);
    }
  }, [provider, account]);
  
  // Load user's study sessions
  const loadUserSessions = useCallback(async (groupContract) => {
    if (!groupContract || !account) return;
    
    try {
      const sessions = await groupContract.getMemberStudySessions(account);
      
      // Process the returned sessions
      const processedSessions = sessions.map((session, index) => {
        return {
          id: index.toString(),
          studyTopic: session.studyTopic,
          duration: session.duration.toString(),
          startTime: new Date(session.startTime.toNumber() * 1000).toLocaleString(),
          verified: session.verified
        };
      });
      
      setStudySessions(processedSessions);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError(`Failed to load sessions: ${err.message}`);
    }
  }, [account]);
  
  // New function to load all sessions for admin
  const loadAllSessions = useCallback(async (groupContract) => {
    if (!groupContract || !isAdmin) return;
    
    try {
      setLoading(true);
      
      // Get participants
      const participants = await groupContract.getParticipants();
      
      // For each participant, get their sessions
      const allSessions = [];
      
      for (const participant of participants) {
        const sessions = await groupContract.getMemberStudySessions(participant);
        
        sessions.forEach((session, index) => {
          allSessions.push({
            userAddress: participant,
            sessionId: index.toString(),
            studyTopic: session.studyTopic,
            duration: session.duration.toString(),
            startTime: new Date(session.startTime.toNumber() * 1000).toLocaleString(),
            verified: session.verified
          });
        });
      }
      
      // Sort by time (newest first)
      allSessions.sort((a, b) => {
        return new Date(b.startTime) - new Date(a.startTime);
      });
      
      setAllGroupSessions(allSessions);
    } catch (err) {
      console.error("Error loading all sessions:", err);
      setError(`Failed to load all sessions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Handle network and account changes
  useEffect(() => {
    // If user has a stored wallet address, use it to pre-fill
    if (user?.walletAddress) {
      setAccount(user.walletAddress);
      if (window.ethereum) {
        setIsConnected(true);
      }
    }
    
    // Initial connection check
    checkIfWalletIsConnected();
    
    // Setup event listeners
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          window.location.reload(); // Refresh the page to reset states
        } else {
          setIsConnected(false);
          setAccount('');
          setTokenBalance('0');
          setTokenSymbol('');
        }
      };
      
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [user, loadStudyGroups]);
  
  // Select a study group
  const handleSelectGroup = async (address) => {
    try {
      setLoading(true);
      
      const groupContract = new ethers.Contract(
        address,
        GroupJSON.abi,
        signer
      );
      setSelectedGroupContract(groupContract);
      setSelectedGroup(address);
      
      // Load group info
      const name = await groupContract.name();
      const description = await groupContract.description();
      const minStake = await groupContract.minStakeAmount();
      const admin = await groupContract.admin();
      
      let participants = [];
      try {
        participants = await groupContract.getParticipants();
      } catch (err) {
        console.error("Error getting participants:", err);
      }
      
      let isParticipant = false;
      try {
        const memberData = await groupContract.members(account);
        isParticipant = memberData.isActive;
      } catch (err) {
        console.error("Error checking if user is participant:", err);
      }
      setIsParticipant(isParticipant);
      
      const isUserAdmin = admin.toLowerCase() === account.toLowerCase();
      setIsAdmin(isUserAdmin);
      
      setGroupInfo({
        name,
        description,
        minStake: ethers.utils.formatUnits(minStake, 18),
        admin,
        participants,
        participantCount: participants.length
      });
      
      // If user is a participant, load their sessions
      if (isParticipant) {
        await loadUserSessions(groupContract);
      }
      
      // If user is admin, load all sessions
      if (isUserAdmin) {
        await loadAllSessions(groupContract);
      }
      
      setActiveTab('groupDetails');
    } catch (err) {
      console.error("Error selecting group:", err);
      setError(`Failed to select group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new study group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!newGroupName || !newGroupDesc || !newGroupStake) {
      setError("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      setNotification("Creating study group...");
      
      const minStake = ethers.utils.parseUnits(newGroupStake, 18);
      
      const tx = await factoryContract.createStudyGroup(
        newGroupName,
        newGroupDesc,
        minStake
      );
      
      await tx.wait();
      
      setNotification(`Study group "${newGroupName}" created successfully!`);
      
      // Reload study groups
      await loadStudyGroups(factoryContract);
      
      // Reset form
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupStake('');
      
      setActiveTab('groups');
    } catch (err) {
      console.error("Error creating group:", err);
      setError(`Failed to create group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Join a study group
  const handleJoinGroup = async () => {
    if (!selectedGroup || !stakeAmount) {
      setError("Please select a group and enter stake amount");
      return;
    }
    
    try {
      setLoading(true);
      setNotification("Joining study group...");
      
      const stake = ethers.utils.parseUnits(stakeAmount, 18);
      
      // Check allowance
      const allowance = await tokenContract.allowance(account, selectedGroup);
      
      // If allowance is less than stake, approve tokens
      if (allowance.lt(stake)) {
        const approveTx = await tokenContract.approve(selectedGroup, stake);
        await approveTx.wait();
        setNotification("Token approval successful");
      }
      
      // Join the group
      const joinTx = await selectedGroupContract.joinGroup(stake);
      await joinTx.wait();
      
      setNotification("Successfully joined the study group!");
      setIsParticipant(true);
      
      // Reload token balance
      const balance = await tokenContract.balanceOf(account);
      setTokenBalance(ethers.utils.formatUnits(balance, 18));
      
      // Reset form
      setStakeAmount('');
    } catch (err) {
      console.error("Error joining group:", err);
      setError(`Failed to join group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Log a study session
  const handleLogSession = async (e) => {
    e.preventDefault();
    
    if (!sessionNotes || !sessionDuration) {
      setError("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      setNotification("Logging study session...");
      
      // Make sure duration is a number
      const durationInMinutes = Number(sessionDuration);
      
      // Pass duration first, then notes (check your contract to confirm proper order)
      const tx = await selectedGroupContract.logStudySession(
        durationInMinutes,  // Make sure this is a number
        sessionNotes
      );
      
      await tx.wait();
      
      setNotification("Study session logged successfully!");
      
      // Reload user sessions
      await loadUserSessions(selectedGroupContract);
      
      // If user is admin, also reload all sessions
      if (isAdmin) {
        await loadAllSessions(selectedGroupContract);
      }
      
      // Reset form
      setSessionNotes('');
      setSessionDuration('');
    } catch (err) {
      console.error("Error logging session:", err);
      setError(`Failed to log session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Verify a study session (admin only)
  const handleVerifySession = async (e) => {
    e.preventDefault();
    
    if (!verifyUser || !verifySessionId) {
      setError("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      setNotification("Verifying study session...");
      
      const tx = await selectedGroupContract.verifyStudySession(
        verifyUser,
        verifySessionId
      );
      
      await tx.wait();
      
      setNotification("Study session verified successfully!");
      
      // Reset form
      setVerifyUser('');
      setVerifySessionId('');
      
      // Reload user sessions if current user is being verified
      if (verifyUser.toLowerCase() === account.toLowerCase()) {
        await loadUserSessions(selectedGroupContract);
      }
      
      // Reload all sessions for admin
      if (isAdmin) {
        await loadAllSessions(selectedGroupContract);
      }
    } catch (err) {
      console.error("Error verifying session:", err);
      setError(`Failed to verify session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // New function to verify session directly from the pending sessions list
  const handleApproveSession = async (userAddress, sessionId) => {
    try {
      setLoading(true);
      setNotification("Verifying study session...");
      
      const tx = await selectedGroupContract.verifyStudySession(
        userAddress,
        sessionId
      );
      
      await tx.wait();
      
      setNotification("Study session verified successfully!");
      
      // Reload all sessions for admin
      await loadAllSessions(selectedGroupContract);
      
      // If the verified session belongs to the current user, reload user sessions
      if (userAddress.toLowerCase() === account.toLowerCase()) {
        await loadUserSessions(selectedGroupContract);
      }
    } catch (err) {
      console.error("Error verifying session:", err);
      setError(`Failed to verify session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // UI Components
  const renderHeader = () => (
    <header className="mb-8 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {/* Logo Hexagon */}
            <div className="w-12 h-12 bg-opacity-20 bg-blue-500 rounded-xl relative overflow-hidden mr-4 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin-slow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* App Name */}
            <h1 className="text-3xl font-bold tracking-tighter">
              <span className="text-blue-400">STUDY</span>
              <span className="text-purple-500">DAO</span>
            </h1>
          </div>
          
          {/* User Info */}
          <div>
            {isOwner && (
              <div className="bg-gradient-to-r from-blue-800 to-purple-800 p-1 rounded mb-2 text-center">
                <p className="text-white text-xs">Factory Owner</p>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-gray-300">{account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'Not connected'}</p>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded font-medium transition duration-200"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
        
        {status && (
          <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg backdrop-blur-sm border border-gray-700 mt-4">
            <p className="text-gray-300">{status}</p>
          </div>
        )}
        
        {isConnected && (
          <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg backdrop-blur-sm border border-gray-700 mt-4">
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12.5C15.3137 12.5 18 11.6046 18 10.5C18 9.39543 15.3137 8.5 12 8.5C8.68629 8.5 6 9.39543 6 10.5C6 11.6046 8.68629 12.5 12 12.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 10.5V13.5C6 14.6 8.7 15.5 12 15.5C15.3 15.5 18 14.6 18 13.5V10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 13.5V16.5C6 17.6 8.7 18.5 12 18.5C15.3 18.5 18 17.6 18 16.5V13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Balance</p>
                  <p className="text-white font-medium">{tokenBalance} <span className="text-blue-400">{tokenSymbol}</span></p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 3V4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 19.5V21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 12H4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19.5 12H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Study Groups</p>
                  <p className="text-white font-medium">{groupDetails.filter(g => g.isParticipant).length} <span className="text-gray-400">/ {groupDetails.length}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900 bg-opacity-60 border border-red-700 text-red-200 p-4 mt-4 rounded-lg backdrop-blur-sm">
            <p>{error}</p>
          </div>
        )}
        

{notification && (
  <div className="bg-blue-900 bg-opacity-60 border border-blue-700 text-blue-200 p-4 mt-4 rounded-lg backdrop-blur-sm">
    <p>{notification}</p>
  </div>
)}
      </div>
      
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <NodeAnimation size="100px" delay={0} speed={20} />
        <NodeAnimation size="120px" delay={2} speed={15} />
        <NodeAnimation size="80px" delay={5} speed={25} />
        <NodeAnimation size="150px" delay={8} speed={30} />
      </div>
    </header>
  );
  
  // Navigation
  const renderNavigation = () => (
    <nav className="mb-8">
      <div className="flex space-x-4 overflow-x-auto pb-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 transition-colors duration-200 ${
            activeTab === 'dashboard' 
              ? 'text-white font-semibold border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 transition-colors duration-200 ${
            activeTab === 'groups' 
              ? 'text-white font-semibold border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Study Groups
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 transition-colors duration-200 ${
              activeTab === 'create' 
                ? 'text-white font-semibold border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Create Group
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('adminPanel')}
            className={`px-4 py-2 transition-colors duration-200 ${
              activeTab === 'adminPanel' 
                ? 'text-white font-semibold border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Admin Panel
          </button>
        )}
        {selectedGroup && (
          <button
            onClick={() => setActiveTab('groupDetails')}
            className={`px-4 py-2 transition-colors duration-200 ${
              activeTab === 'groupDetails' 
                ? 'text-white font-semibold border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Group Details
          </button>
        )}
      </div>
    </nav>
  );
  
  // Dashboard View
  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Welcome Card */}
      <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Welcome to StudyDAO</h2>
        <p className="text-gray-300 mb-6">
        StudyDAO is a decentralized platform where you can create and join study groups.
        Stake tokens, track your study sessions, and earn rewards for consistent learning.
        Earn 1 token for every 10 minutes of focused study time.
        </p>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19.5L3.5 14L9 8.5" stroke="#90CAF9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.5 14H3.5" stroke="#90CAF9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-300">Join existing study groups</p>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12H19" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-300">Create your own study group</p>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#86EFAC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-300">Log your study sessions</p>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 17V17.01" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 13.5C14.4853 13.5 16.5 11.4853 16.5 9C16.5 6.51472 14.4853 4.5 12 4.5C9.51472 4.5 7.5 6.51472 7.5 9C7.5 11.4853 9.51472 13.5 12 13.5Z" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-300">Earn rewards for consistency</p>
          </div>
        </div>
      </div>
      
      {/* Stats Card */}
      <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
        {isConnected ? (
          <>
            <div className="space-y-6">
              <div>
                <p className="text-gray-400 mb-2">Token Balance</p>
                <div className="text-3xl font-bold text-white">{tokenBalance} <span className="text-blue-400 text-lg">{tokenSymbol}</span></div>
              </div>
              <div>
                <p className="text-gray-400 mb-2">Study Groups</p>
                <div className="flex items-center space-x-2">
                  <div className="text-3xl font-bold text-white">{groupDetails.filter(g => g.isParticipant).length}</div>
                  <span className="text-gray-400">/ {groupDetails.length} available</span>
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-2">Recent Activity</p>
                {studySessions.length > 0 ? (
                  <div className="space-y-2">
                    {studySessions.slice(0, 2).map((session, index) => (
                      <div key={index} className="bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-300">{session.studyTopic}</p>
                          <div className={`text-xs ${session.verified ? 'text-green-500' : 'text-yellow-500'}`}>
                            {session.verified ? 'Verified' : 'Pending'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          <span>{session.duration} mins</span>
                          <span className="mx-2">•</span>
                          <span>{session.startTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No recent activity</p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setActiveTab('groups')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded-lg font-medium transition duration-200"
              >
                Browse Study Groups
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Connect your wallet to view your stats</p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded-lg font-medium transition duration-200"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
  
  // Groups View
  const renderGroups = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Available Study Groups</h2>
      
      {groupDetails.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupDetails.map((group, index) => (
            <div 
              key={index} 
              className="bg-gray-800 bg-opacity-50 rounded-xl backdrop-blur-sm border border-gray-700 overflow-hidden group hover:border-blue-500 transition-colors duration-200"
            >
              <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-4">
                <h3 className="text-xl font-semibold text-white">{group.name}</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-300 mb-4 line-clamp-2">{group.description}</p>
                <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                  <div className="flex items-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                      <path d="M12 12.5C15.3137 12.5 18 11.6046 18 10.5C18 9.39543 15.3137 8.5 12 8.5C8.68629 8.5 6 9.39543 6 10.5C6 11.6046 8.68629 12.5 12 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 10.5V13.5C6 14.6 8.7 15.5 12 15.5C15.3 15.5 18 14.6 18 13.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Min Stake: {group.minStake} {tokenSymbol}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${group.isParticipant ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                    {group.isParticipant ? 'Joined' : 'Not Joined'}
                  </div>
                </div>
                <button
                  onClick={() => handleSelectGroup(group.address)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 rounded font-medium transition duration-200"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 text-center">
          <p className="text-gray-300 mb-4">No study groups available yet.</p>
          {isOwner && (
            <button
              onClick={() => setActiveTab('create')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded font-medium transition duration-200"
            >
              Create the First Group
            </button>
          )}
        </div>
      )}
    </div>
  );
  
  // Create Group View
  const renderCreateGroup = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Create a New Study Group</h2>
      
      <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
        <form onSubmit={handleCreateGroup}>
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-gray-300 mb-2">Group Name</label>
            <input
              id="groupName"
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="groupDesc" className="block text-gray-300 mb-2">Description</label>
            <textarea
              id="groupDesc"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="What will your group study?"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="minStake" className="block text-gray-300 mb-2">Minimum Stake Amount ({tokenSymbol})</label>
            <input
              id="minStake"
              type="text"
              value={newGroupStake}
              onChange={(e) => setNewGroupStake(e.target.value)}
              placeholder="Enter minimum stake amount"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded-lg font-medium transition duration-200"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Study Group'}
          </button>
        </form>
      </div>
    </div>
  );
  
  // Group Details View
  const renderGroupDetails = () => (
    <div>
      {selectedGroup && groupInfo && (
        <div className="space-y-8">
          {/* Group Header */}
          <div className="bg-gray-800 bg-opacity-50 rounded-xl backdrop-blur-sm border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6">
              <h2 className="text-2xl font-bold text-white">{groupInfo.name}</h2>
              <p className="text-blue-200 mt-2">{groupInfo.description}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Min Stake</p>
                  <p className="text-xl font-semibold text-white">{groupInfo.minStake} {tokenSymbol}</p>
                </div>
                <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Participants</p>
                  <p className="text-xl font-semibold text-white">{groupInfo.participantCount}</p>
                </div>
                <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="text-xl font-semibold text-white">
                    {isParticipant ? (
                      <span className="text-green-400">Joined</span>
                    ) : (
                      <span className="text-yellow-400">Not Joined</span>
                    )}
                  </p>
                </div>
              </div>
              
              {!isParticipant && (
                <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Join This Group</h3>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder={`Enter stake amount (min: ${groupInfo.minStake})`}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleJoinGroup}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-6 rounded-lg font-medium transition duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Joining...' : 'Join Group'}
                    </button>
                  </div>
                </div>
              )}
              
              {isParticipant && (
                <div className="space-y-6">
                  {/* Log Study Session */}
                  <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-3">Log Study Session</h3>
                    <form onSubmit={handleLogSession} className="space-y-4">
                      <div>
                        <label htmlFor="sessionNotes" className="block text-gray-300 mb-2">Study Topic</label>
                        <input
                          id="sessionNotes"
                          type="text"
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                          placeholder="What did you study?"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="sessionDuration" className="block text-gray-300 mb-2">Duration (minutes)</label>
                        <input
                          id="sessionDuration"
                          type="number"
                          value={sessionDuration}
                          onChange={(e) => setSessionDuration(e.target.value)}
                          placeholder="How long did you study?"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          min="1"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded-lg font-medium transition duration-200"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Logging...' : 'Log Session'}
                      </button>
                    </form>
                  </div>
                  
                  {/* Your Study Sessions */}
                  <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-3">Your Study Sessions</h3>
                    {studySessions.length > 0 ? (
                      <div className="space-y-3">
                        {studySessions.map((session, index) => (
                          <div key={index} className="bg-gray-800 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium text-white">{session.studyTopic}</h4>
                              <div className={`text-xs rounded-full px-2 py-1 ${session.verified ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                {session.verified ? 'Verified' : 'Pending'}
                              </div>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              <span>{session.duration} minutes</span>
                              <span className="mx-2">•</span>
                              <span>{session.startTime}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">You haven't logged any study sessions yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Admin Panel View
  const renderAdminPanel = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
      
      {selectedGroup && isAdmin && (
        <div className="space-y-8">
          {/* Group Stats */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Group Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Min Stake</p>
                <p className="text-xl font-semibold text-white">{groupInfo.minStake} {tokenSymbol}</p>
              </div>
              <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Participants</p>
                <p className="text-xl font-semibold text-white">{groupInfo.participantCount}</p>
              </div>
              <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Total Sessions</p>
                <p className="text-xl font-semibold text-white">{allGroupSessions.length}</p>
              </div>
            </div>
          </div>
          
          {/* Verify Session Form */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Verify Session</h3>
            <form onSubmit={handleVerifySession} className="space-y-4">
              <div>
                <label htmlFor="verifyUser" className="block text-gray-300 mb-2">User Address</label>
                <input
                  id="verifyUser"
                  type="text"
                  value={verifyUser}
                  onChange={(e) => setVerifyUser(e.target.value)}
                  placeholder="Enter user address"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="verifySessionId" className="block text-gray-300 mb-2">Session ID</label>
                <input
                  id="verifySessionId"
                  type="text"
                  value={verifySessionId}
                  onChange={(e) => setVerifySessionId(e.target.value)}
                  placeholder="Enter session ID"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 px-4 rounded-lg font-medium transition duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify Session'}
              </button>
            </form>
          </div>
          
          {/* Pending Sessions */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Pending Sessions</h3>
            {allGroupSessions.filter(session => !session.verified).length > 0 ? (
              <div className="space-y-3">
                {allGroupSessions
                  .filter(session => !session.verified)
                  .map((session, index) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <h4 className="font-medium text-white">{session.studyTopic}</h4>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          <span>{session.duration} minutes</span>
                          <span className="mx-2">•</span>
                          <span>{session.startTime}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          User: {session.userAddress.substring(0, 6)}...{session.userAddress.substring(session.userAddress.length - 4)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleApproveSession(session.userAddress, session.sessionId)}
                        className="bg-green-600 hover:bg-green-500 text-white py-1 px-3 rounded text-sm font-medium transition duration-200"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-400">No pending sessions to verify.</p>
            )}
          </div>
          
          {/* Verified Sessions */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Verified Sessions</h3>
            {allGroupSessions.filter(session => session.verified).length > 0 ? (
              <div className="space-y-3">
                {allGroupSessions
                  .filter(session => session.verified)
                  .map((session, index) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <h4 className="font-medium text-white">{session.studyTopic}</h4>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        <span>{session.duration} minutes</span>
                        <span className="mx-2">•</span>
                        <span>{session.startTime}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        User: {session.userAddress.substring(0, 6)}...{session.userAddress.substring(session.userAddress.length - 4)}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-400">No verified sessions yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
  // NodeAnimation Component for the animated background
  const NodeAnimation = ({ size, delay, speed }) => {
    const [position, setPosition] = useState({
      left: Math.random() * 100,
      top: Math.random() * 100
    });
    
    useEffect(() => {
      const timeout = setTimeout(() => {
        const animate = () => {
          setPosition({
            left: Math.random() * 100,
            top: Math.random() * 100
          });
          
          setTimeout(animate, (Math.random() * 5000) + speed * 100);
        };
        
        animate();
      }, delay * 1000);
      
      return () => clearTimeout(timeout);
    }, [delay, speed]);
    
    return (
      <div 
        className="absolute rounded-full bg-blue-500 opacity-5"
        style={{
          width: size,
          height: size,
          left: `${position.left}%`,
          top: `${position.top}%`,
          transition: `all ${speed}s cubic-bezier(0.34, 1.56, 0.64, 1)`
        }}
      />
    );
  };

  // Render the main content based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'groups':
        return renderGroups();
      case 'create':
        return isOwner ? renderCreateGroup() : renderDashboard();
      case 'groupDetails':
        return selectedGroup ? renderGroupDetails() : renderGroups();
      case 'adminPanel':
        return isAdmin ? renderAdminPanel() : renderDashboard();
      default:
        return renderDashboard();
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {renderHeader()}
        {renderNavigation()}
        {renderContent()}
      </div>
      
      {/* Footer */}
      <footer className="max-w-5xl mx-auto mt-16 border-t border-gray-800 pt-6 pb-8 text-center text-gray-500 text-sm">
        <p>StudyDAO © 2025 | Learn Grow Earn</p>
        <p className="mt-2">Powered by Arktech</p>
      </footer>
    </div>
  );
}


