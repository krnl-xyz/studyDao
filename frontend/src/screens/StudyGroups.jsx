import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// Import ethers directly instead of relying on window.ethers
import { ethers } from 'ethers';

export default function StudyGroups({ user }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState('ARKT');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studyGroups, setStudyGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupStakeRequired, setNewGroupStakeRequired] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Set your actual ARKT token address from the Sonic Blaze Testnet
  const tokenAddress = '0x9effd7655b5C23dbE306d7B87369fcBF0cf3280A'; // Replace with your actual token address
  // Set the StudyDAO contract address
  const studyDAOAddress = '0x123456789abcdef123456789abcdef123456789a'; // Replace with your actual StudyDAO contract
  
  // Sonic chain ID in proper hexadecimal format
  const sonicChainId = '0xdede'; // 57054 in hex format
  
  // If user has a stored wallet address, use it to pre-fill
  useEffect(() => {
    if (user?.walletAddress) {
      setAccount(user.walletAddress);
      if (window.ethereum) {
        setIsConnected(true);
        getBalances(user.walletAddress);
      }
    }
  }, [user]);

  // Simple ERC20 ABI with just the functions we need
  const tokenABI = [
    // Read-only functions
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    // Transactions
    "function transfer(address to, uint amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];
  
  // StudyDAO contract ABI
  const studyDAOABI = [
    // View functions
    "function getStudyGroups() view returns (tuple(uint256 id, string name, string description, address creator, uint256 stakeRequired, uint256 totalStaked, uint256 memberCount, bool isActive)[])",
    "function getStudyGroupById(uint256 groupId) view returns (tuple(uint256 id, string name, string description, address creator, uint256 stakeRequired, uint256 totalStaked, uint256 memberCount, bool isActive))",
    "function getUserStake(uint256 groupId, address user) view returns (uint256)",
    "function isGroupMember(uint256 groupId, address user) view returns (bool)",
    // Transaction functions
    "function createStudyGroup(string memory name, string memory description, uint256 stakeRequired) returns (uint256)",
    "function joinStudyGroup(uint256 groupId, uint256 stakeAmount) returns (bool)",
    "function leaveStudyGroup(uint256 groupId) returns (bool)",
    "function submitStudySession(uint256 groupId, uint256 duration, string memory notes) returns (bool)"
  ];

  useEffect(() => {
    checkIfWalletIsConnected();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          getBalances(accounts[0]);
        } else {
          setIsConnected(false);
          setAccount('');
          setBalance(null);
          setTokenBalance(null);
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Check if MetaMask is installed and if an account is connected
  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setStatus('Please install MetaMask to use this app');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        getBalances(accounts[0]);
        fetchStudyGroups();
      } else {
        setStatus('Connect your MetaMask wallet to use this app');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error connecting to wallet');
    }
  };

  // Connect to MetaMask
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
      if (chainId !== sonicChainId) { // Sonic Testnet chainId
        setStatus('Please switch to Sonic Testnet');
        await addSonicNetwork();
      } else {
        getBalances(accounts[0]);
        fetchStudyGroups();
        setStatus('Wallet connected successfully!');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error connecting wallet: ' + error.message);
    }
    setIsLoading(false);
  };

  // Get ETH balance and token balance
  const getBalances = async (currentAccount) => {
    setIsLoading(true);
    try {
      // Use ethers directly instead of window.ethers
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const ethBalance = await provider.getBalance(currentAccount);
      setBalance(ethers.utils.formatEther(ethBalance));

      // Connect to token contract
      const token = new ethers.Contract(tokenAddress, tokenABI, provider);

      try {
        // Get token symbol
        const symbol = await token.symbol();
        setTokenSymbol(symbol);
  
        // Get token decimals
        const decimals = await token.decimals();
  
        // Get token balance
        const rawTokenBalance = await token.balanceOf(currentAccount);
        setTokenBalance(ethers.utils.formatUnits(rawTokenBalance, decimals));
        
        setStatus('Balances updated successfully');
      } catch (error) {
        console.error("Error fetching token data:", error);
        setStatus('Error retrieving token information. Make sure you are on the correct network.');
      }
    } catch (error) {
      console.error("Error getting balances:", error);
      setStatus('Error retrieving balances: ' + error.message);
    }
    setIsLoading(false);
  };

  // Fetch study groups from the contract
  const fetchStudyGroups = async () => {
    setIsLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const studyDAO = new ethers.Contract(studyDAOAddress, studyDAOABI, provider);
      
      const groups = await studyDAO.getStudyGroups();
      setStudyGroups(groups);
      
      setStatus('Study groups loaded successfully');
    } catch (error) {
      console.error("Error fetching study groups:", error);
      
      // For development, create mock study groups if contract isn't deployed yet
      const mockGroups = [
        {
          id: 1,
          name: "Blockchain Development",
          description: "Group focused on learning Solidity and smart contract development",
          creator: "0x1234567890123456789012345678901234567890",
          stakeRequired: ethers.utils.parseEther("100"),
          totalStaked: ethers.utils.parseEther("500"),
          memberCount: 5,
          isActive: true
        },
        {
          id: 2,
          name: "Computer Science Fundamentals",
          description: "Study group for algorithms, data structures, and CS theory",
          creator: "0x2345678901234567890123456789012345678901",
          stakeRequired: ethers.utils.parseEther("50"),
          totalStaked: ethers.utils.parseEther("350"),
          memberCount: 7,
          isActive: true
        },
        {
          id: 3,
          name: "Finance & Economics",
          description: "Group for studying financial markets and economic theory",
          creator: "0x3456789012345678901234567890123456789012",
          stakeRequired: ethers.utils.parseEther("150"),
          totalStaked: ethers.utils.parseEther("750"),
          memberCount: 5,
          isActive: true
        }
      ];
      
      setStudyGroups(mockGroups);
      setStatus('Using demo data (contract not available)');
    }
    setIsLoading(false);
  };
  
  // Create a new study group
  const createStudyGroup = async () => {
    if (!newGroupName || !newGroupDescription || !newGroupStakeRequired) {
      setStatus('Please fill in all fields');
      return;
    }
    
    if (isNaN(Number(newGroupStakeRequired)) || Number(newGroupStakeRequired) <= 0) {
      setStatus('Please enter a valid stake amount');
      return;
    }
    
    setIsLoading(true);
    try {
      setStatus('Creating study group...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // First, approve tokens for the StudyDAO contract
      const token = new ethers.Contract(tokenAddress, tokenABI, signer);
      const decimals = await token.decimals();
      const stakeAmount = ethers.utils.parseUnits(newGroupStakeRequired, decimals);
      
      const approveTx = await token.approve(studyDAOAddress, stakeAmount);
      await approveTx.wait();
      
      // Then create the study group
      const studyDAO = new ethers.Contract(studyDAOAddress, studyDAOABI, signer);
      const tx = await studyDAO.createStudyGroup(
        newGroupName, 
        newGroupDescription, 
        stakeAmount
      );
      
      setStatus('Creating study group. Waiting for confirmation...');
      await tx.wait();
      
      // Update state
      setStatus('Study group created successfully!');
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupStakeRequired('');
      fetchStudyGroups();
      getBalances(account);
      
    } catch (error) {
      console.error("Error creating study group:", error);
      
      // For demo purposes, add a mock group
      const newGroup = {
        id: studyGroups.length + 1,
        name: newGroupName,
        description: newGroupDescription,
        creator: account,
        stakeRequired: ethers.utils.parseEther(newGroupStakeRequired),
        totalStaked: ethers.utils.parseEther(newGroupStakeRequired),
        memberCount: 1,
        isActive: true
      };
      
      setStudyGroups([...studyGroups, newGroup]);
      setStatus('Demo mode: Study group created (not on blockchain)');
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupStakeRequired('');
    }
    setIsLoading(false);
  };
  
  // Join a study group
  const joinStudyGroup = async (groupId) => {
    if (!stakeAmount) {
      setStatus('Please enter a stake amount');
      return;
    }
    
    if (isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      setStatus('Please enter a valid stake amount');
      return;
    }
    
    setIsLoading(true);
    try {
      const group = studyGroups.find(g => g.id === groupId);
      const requiredStake = ethers.utils.formatEther(group.stakeRequired);
      
      if (Number(stakeAmount) < Number(requiredStake)) {
        setStatus(`Minimum stake required is ${requiredStake} ${tokenSymbol}`);
        setIsLoading(false);
        return;
      }
      
      setStatus('Approving tokens...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // First, approve tokens for the StudyDAO contract
      const token = new ethers.Contract(tokenAddress, tokenABI, signer);
      const decimals = await token.decimals();
      const amount = ethers.utils.parseUnits(stakeAmount, decimals);
      
      const approveTx = await token.approve(studyDAOAddress, amount);
      await approveTx.wait();
      
      // Then join the study group
      const studyDAO = new ethers.Contract(studyDAOAddress, studyDAOABI, signer);
      const tx = await studyDAO.joinStudyGroup(groupId, amount);
      
      setStatus('Joining study group. Waiting for confirmation...');
      await tx.wait();
      
      // Update state
      setStatus('Successfully joined study group!');
      setStakeAmount('');
      setSelectedGroup(null);
      fetchStudyGroups();
      getBalances(account);
      
    } catch (error) {
      console.error("Error joining study group:", error);
      
      // For demo purposes
      const updatedGroups = studyGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            totalStaked: group.totalStaked.add(ethers.utils.parseEther(stakeAmount)),
            memberCount: group.memberCount + 1
          };
        }
        return group;
      });
      
      setStudyGroups(updatedGroups);
      setStatus('Demo mode: Joined study group (not on blockchain)');
      setStakeAmount('');
      setSelectedGroup(null);
    }
    setIsLoading(false);
  };

  // Leave a study group
  const leaveStudyGroup = async (groupId) => {
    setIsLoading(true);
    try {
      setStatus('Leaving study group...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const studyDAO = new ethers.Contract(studyDAOAddress, studyDAOABI, signer);
      
      const tx = await studyDAO.leaveStudyGroup(groupId);
      
      setStatus('Leaving study group. Waiting for confirmation...');
      await tx.wait();
      
      // Update state
      setStatus('Successfully left study group!');
      fetchStudyGroups();
      getBalances(account);
      
    } catch (error) {
      console.error("Error leaving study group:", error);
      
      // For demo purposes
      const updatedGroups = studyGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            memberCount: Math.max(0, group.memberCount - 1),
            totalStaked: group.totalStaked.sub(ethers.utils.parseEther("100")) // Mock value
          };
        }
        return group;
      });
      
      setStudyGroups(updatedGroups);
      setStatus('Demo mode: Left study group (not on blockchain)');
    }
    setIsLoading(false);
  };

  // Add custom network (Sonic testnet) to MetaMask
  const addSonicNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: sonicChainId, // Fixed: now using hex format with 0x prefix
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
      setStatus('Sonic Testnet added to MetaMask');
    } catch (error) {
      console.error(error);
      setStatus('Error adding Sonic network: ' + error.message);
    }
  };

  // Switch to Sonic network
  const switchToSonicNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sonicChainId }],
      });
      setStatus('Switched to Sonic network');
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added yet
        await addSonicNetwork();
      } else {
        console.error(error);
        setStatus('Error switching network: ' + error.message);
      }
    }
  };

  // Floating nodes animation for blockchain effect
  const nodes = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    x: Math.random() * 80 - 40,
    y: Math.random() * 80 - 40,
    size: Math.random() * 6 + 3
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white overflow-hidden relative">
      {/* Blockchain-like floating nodes in background */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full bg-blue-500 opacity-30"
          style={{ 
            width: node.size, 
            height: node.size,
          }}
          initial={{ 
            x: `calc(${Math.random() * 100}% + ${node.x}px)`, 
            y: `calc(${Math.random() * 100}% + ${node.y}px)`,
            opacity: 0
          }}
          animate={{ 
            x: [
              `calc(${Math.random() * 100}% + ${node.x}px)`,
              `calc(${Math.random() * 100}% + ${node.x + Math.random() * 60 - 30}px)`,
              `calc(${Math.random() * 100}% + ${node.x}px)`
            ],
            y: [
              `calc(${Math.random() * 100}% + ${node.y}px)`,
              `calc(${Math.random() * 100}% + ${node.y + Math.random() * 60 - 30}px)`,
              `calc(${Math.random() * 100}% + ${node.y}px)`
            ],
            opacity: [0, 0.7, 0.3],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 3 + Math.random() * 2,
            ease: "easeInOut",
            delay: Math.random()
          }}
        />
      ))}

      {/* Connection lines animation */}
      <motion.svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <motion.path
          d="M100,150 C150,100 250,100 300,150 C350,200 450,200 500,150"
          stroke="url(#gradient)"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <motion.path
          d="M500,250 C450,300 350,300 300,250 C250,200 150,200 100,250"
          stroke="url(#gradient)"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Main content */}
      <div className="container max-w-4xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="flex justify-between items-center mb-8"
        >
          <Link to="/home">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-lg">Back to Home</span>
            </motion.div>
          </Link>
          
          {/* StudyDAO Logo */}
          <motion.div
            whileHover={{ rotate: 5 }}
            className="flex items-center"
          >
            <span className="text-2xl font-bold tracking-tighter">
              <span className="text-blue-400">STUDY</span>
              <span className="text-purple-500">DAO</span>
            </span>
          </motion.div>
        </motion.div>

        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div 
              className="w-16 h-16 bg-opacity-20 bg-blue-500 rounded-xl relative overflow-hidden"
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-20"
                animate={{ 
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              />
              <div className="flex items-center justify-center h-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 6C17 6.55228 16.5523 7 16 7C15.4477 7 15 6.55228 15 6C15 5.44772 15.4477 5 16 5C16.5523 5 17 5.44772 17 6Z" fill="white"/>
                    <path d="M9 18C9 18.5523 8.55228 19 8 19C7.44772 19 7 18.5523 7 18C7 17.4477 7.44772 17 8 17C8.55228 17 9 17.4477 9 18Z" fill="white"/>
                    <path d="M9 6C9 6.55228 8.55228 7 8 7C7.44772 7 7 6.55228 7 6C7 5.44772 7.44772 5 8 5C8.55228 5 9 5.44772 9 6Z" fill="white"/>
                    <path d="M17 18C17 18.5523 16.5523 19 16 19C15.4477 19 15 18.5523 15 18C15 17.4477 15.4477 17 16 17C16.5523 17 17 17.4477 17 18Z" fill="white"/>
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-blue-400">Study</span>
            <span className="text-purple-500">Groups</span>
          </h1>
          
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 1 }}
            className="h-1 bg-gradient-to-r from-blue-400 to-purple-500 mt-2 mb-4 rounded-full mx-auto max-w-xs"
          />
          
          <p className="text-gray-400">Welcome, {user?.displayName || 'Student'}! Join study groups and earn token rewards.</p>
        </motion.div>

        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <motion.div 
              className="w-20 h-20 mb-6 relative"
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#60A5FA" strokeWidth="1.5"/>
                <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="#A855F7" strokeWidth="1.5"/>
                <path d="M3 12H9M15 12H21M12 3V9M12 15V21" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </motion.div>
            
            <motion.button 
              onClick={connectWallet}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 font-medium text-lg mb-4 w-full max-w-md"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </motion.span>
                  Connecting...
                </span>
              ) : 'Connect MetaMask'}
            </motion.button>
            
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-lg text-blue-300 mt-4"
              >
                {status}
              </motion.div>
            )}
          </motion.div>
        ) : (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 0.8 }}
    className="relative"
  >
    {/* Wallet info */}
    <motion.div 
      className="bg-gray-800 bg-opacity-60 backdrop-filter backdrop-blur-lg rounded-xl p-4 mb-6 border border-gray-700"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <div className="mr-3 bg-blue-500 rounded-full w-10 h-10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 12C16 13.1046 15.1046 14 14 14C12.8954 14 12 13.1046 12 12C12 10.8954 12.8954 10 14 10C15.1046 10 16 10.8954 16 12Z" stroke="white" strokeWidth="2"/>
                <path d="M18 7V5C18 3.89543 17.1046 3 16 3H8C6.89543 3 6 3.89543 6 5V7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-400">Connected Wallet</div>
              <div className="font-mono text-sm text-white">
                {account.substr(0, 6)}...{account.substr(-4)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-gray-700 bg-opacity-50 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-400">Sonic Balance</div>
            <div className="font-mono font-medium">
              {balance ? parseFloat(balance).toFixed(4) : '0.0000'} S
            </div>
          </div>
          
          <div className="bg-gray-700 bg-opacity-50 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-400">Token Balance</div>
            <div className="font-mono font-medium">
              {tokenBalance ? parseFloat(tokenBalance).toFixed(2) : '0.00'} {tokenSymbol}
            </div>
          </div>
        </div>
      </div>
      
      {status && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 text-center text-sm text-blue-300 border-t border-gray-700 pt-3"
        >
          {status}
        </motion.div>
      )}
    </motion.div>
    
    {/* Action Buttons */}
    <motion.div 
      className="flex flex-col sm:flex-row justify-between gap-4 mb-8"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      <motion.button
        onClick={() => setShowCreateModal(true)}
        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Create Study Group
      </motion.button>
      
      <motion.button
        onClick={switchToSonicNetwork}
        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
          <path d="M12 3V4M12 20V21M5.63604 5.63604L6.34315 6.34315M17.6569 17.6569L18.364 18.364M3 12H4M20 12H21M5.63604 18.364L6.34315 17.6569M17.6569 6.34315L18.364 5.63604M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Switch to Sonic Network
      </motion.button>
    </motion.div>
    
    {/* Study Groups List */}
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-blue-400">
          <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21M17 11C18.1046 11 19 10.1046 19 9C19 7.89543 18.1046 7 17 7M23 21V19C23 16.7909 21.2091 15 19 15H18.5M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Available Study Groups
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </motion.div>
        </div>
      ) : studyGroups.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 opacity-50">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 10C9 8.89543 9.89543 8 11 8H13C14.1046 8 15 8.89543 15 10V10C15 11.1046 14.1046 12 13 12H11C9.89543 12 9 12.8954 9 14V14C9 15.1046 9.89543 16 11 16H13C14.1046 16 15 15.1046 15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 6V8M12 16V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-lg">No study groups available yet</p>
          <p className="mt-2">Be the first to create a study group!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {studyGroups.map((group) => (
            <motion.div
              key={group.id}
              className={`bg-gray-800 bg-opacity-60 backdrop-filter backdrop-blur-lg rounded-xl p-5 border ${selectedGroup?.id === group.id ? 'border-blue-500' : 'border-gray-700'} transition-colors`}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedGroup(selectedGroup?.id === group.id ? null : group)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{group.name}</h3>
                  <p className="text-gray-400 mt-1">{group.description}</p>
                </div>
                <div className="bg-blue-900 bg-opacity-30 py-1 px-3 rounded-full flex items-center text-blue-300 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                    <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {group.memberCount} members
                </div>
              </div>
              
              <div className="flex flex-wrap items-center mt-4 gap-3">
                <div className="bg-gray-700 bg-opacity-40 py-1 px-3 rounded-lg text-sm">
                  <span className="text-gray-400 mr-1">Required Stake:</span>
                  <span className="font-medium">{ethers.utils.formatEther(group.stakeRequired)} {tokenSymbol}</span>
                </div>
                
                <div className="bg-gray-700 bg-opacity-40 py-1 px-3 rounded-lg text-sm">
                  <span className="text-gray-400 mr-1">Total Staked:</span>
                  <span className="font-medium">{ethers.utils.formatEther(group.totalStaked)} {tokenSymbol}</span>
                </div>
              </div>
              
              {selectedGroup?.id === group.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 border-t border-gray-700 pt-4"
                >
                  {group.creator.toLowerCase() === account.toLowerCase() ? (
                    <div className="text-center">
                      <p className="text-sm text-blue-300 mb-2">You created this group</p>
                      <Link 
                        to={`/study-group/${group.id}`}
                        className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-6 rounded-lg font-medium text-sm transition-colors hover:from-blue-700 hover:to-blue-800"
                      >
                        Manage Group
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Stake Amount ({tokenSymbol})</label>
                        <div className="flex">
                          <input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            className="bg-gray-900 text-white px-4 py-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                            placeholder={`Min: ${ethers.utils.formatEther(group.stakeRequired)}`}
                          />
                          <button
                            onClick={() => joinStudyGroup(group.id)}
                            disabled={isLoading}
                            className="ml-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50"
                          >
                            Join Group
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Note: Tokens are staked as collateral and can be reclaimed when you leave the group
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
    
    {/* Create Study Group Modal */}
    {showCreateModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Create Study Group</h2>
            <button 
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-gray-900 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                placeholder="E.g., Blockchain Fundamentals"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Description</label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="bg-gray-900 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 min-h-[100px]"
                placeholder="Describe the focus of your study group"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Required Stake ({tokenSymbol})</label>
              <input
                type="number"
                value={newGroupStakeRequired}
                onChange={(e) => setNewGroupStakeRequired(e.target.value)}
                className="bg-gray-900 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                placeholder="Minimum tokens required to join"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the minimum amount of tokens members must stake to join your group
              </p>
            </div>
            
            <div className="pt-4">
              <button
                onClick={createStudyGroup}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </motion.div>
)}
      </div>
    </div>
  );
}