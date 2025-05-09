import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// Import ethers directly instead of relying on window.ethers
import { ethers } from 'ethers';

export default function ArktechTokenApp({ user }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState('ARKT');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set your actual ARKT token address from the Sonic Blaze Testnet
  const tokenAddress = '0x9effd7655b5C23dbE306d7B87369fcBF0cf3280A'; // Replace with your actual token address
  
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
    "function transfer(address to, uint amount) returns (bool)"
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

  // Transfer tokens
  const sendTokens = async () => {
    if (!transferTo || !transferAmount) {
      setStatus('Please enter a recipient address and amount');
      return;
    }

    if (!ethers.utils.isAddress(transferTo)) {
      setStatus('Please enter a valid Ethereum address');
      return;
    }

    // Check if amount is valid number
    if (isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) {
      setStatus('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      setStatus('Preparing transaction...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const token = new ethers.Contract(tokenAddress, tokenABI, provider);
      const tokenWithSigner = token.connect(signer);
      
      // Get token decimals
      const decimals = await token.decimals();
      
      // Convert amount to token units
      const amount = ethers.utils.parseUnits(transferAmount, decimals);
      
      setStatus('Sending transaction...');
      const tx = await tokenWithSigner.transfer(transferTo, amount);
      
      setStatus('Transaction sent! Waiting for confirmation...');
      await tx.wait();
      
      setStatus('Transaction confirmed!');
      getBalances(account);
      
      // Reset form fields
      setTransferTo('');
      setTransferAmount('');
    } catch (error) {
      console.error("Error sending tokens:", error);
      setStatus(`Transaction failed: ${error.message}`);
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
        params: [{ chainId: sonicChainId }], // Fixed: now using hex format with 0x prefix
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
      <div className="container max-w-2xl mx-auto px-4 py-8 relative z-10">
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
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-blue-400">ARKT</span>
            <span className="text-purple-500">Token</span>
          </h1>
          
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 1 }}
            className="h-1 bg-gradient-to-r from-blue-400 to-purple-500 mt-2 mb-4 rounded-full mx-auto max-w-xs"
          />
          
          <p className="text-gray-400">Welcome, {user?.displayName || 'Student'}! Manage your tokens and earn rewards.</p>
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
          >
            {/* Connected wallet info */}
            <motion.div 
              className="bg-gray-800 bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-blue-900 border-opacity-50 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Connected Account</p>
                    <p className="font-medium">{account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => getBalances(account)}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12C2 16.9706 6.02944 21 11 21C15.9706 21 20 16.9706 20 12C20 7.02944 15.9706 3 11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14 3L11 6L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 6L6 3L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden"/>
                  </svg>
                </motion.button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-2">
                <motion.div 
                  className="bg-gray-800 bg-opacity-50 rounded-xl p-4 backdrop-blur-sm border border-blue-900 border-opacity-30"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm text-gray-400 mb-1">S Balance</p>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center mr-2">
                      <span className="text-blue-300 text-xs font-bold">S</span>
                    </div>
                    <p className="text-xl font-bold text-blue-300">
                      {balance !== null ? parseFloat(balance).toFixed(4) : 
                        <motion.span 
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ...
                        </motion.span>
                      }
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-gray-800 bg-opacity-50 rounded-xl p-4 backdrop-blur-sm border border-blue-900 border-opacity-30"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm text-gray-400 mb-1">{tokenSymbol} Balance</p>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center mr-2">
                      <span className="text-purple-300 text-xs font-bold">A</span>
                    </div>
                    <p className="text-xl font-bold text-purple-300">
                      {tokenBalance !== null ? parseFloat(tokenBalance).toLocaleString() : 
                        <motion.span 
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ...
                        </motion.span>
                      }
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Transfer form */}
            <motion.div 
              className="bg-gray-800 bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-blue-900 border-opacity-50 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Transfer Tokens
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">Recipient Address</label>
                <input
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                  placeholder="0x..."
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-300">Amount</label>
                <div className="relative">
                  <input
                    type="text"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                    placeholder="0.0"
                  />
                  <span className="absolute right-3 top-3 text-gray-500">{tokenSymbol}</span>
                </div>
              </div>
              
              <motion.button
                onClick={sendTokens}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 font-medium w-full"
                whileHover={{ scale: 1.02 }}
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
                        // Continuing from where the code was cut off

                        <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </motion.span>
                    Processing...
                  </span>
                ) : 'Send Tokens'}
              </motion.button>
            </motion.div>

            {/* Network section */}
            <motion.div 
              className="bg-gray-800 bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-blue-900 border-opacity-50"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Network
              </h2>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mr-3">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  <div>
                    <p className="font-medium">Sonic Blaze Testnet</p>
                    <p className="text-sm text-gray-400">Chain ID: 57054</p>
                  </div>
                </div>
                
                <motion.button 
                  onClick={switchToSonicNetwork}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm bg-blue-900 bg-opacity-30 hover:bg-opacity-50 border border-blue-800 border-opacity-50 py-2 px-4 rounded-lg transition-colors"
                >
                  Switch Network
                </motion.button>
              </div>
            </motion.div>

            {/* Status message */}
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center py-2 px-4 rounded-lg bg-gray-800 bg-opacity-50 backdrop-blur-sm"
              >
                <p className={`text-lg ${
                  status.includes('Error') || status.includes('failed') 
                    ? 'text-red-400' 
                    : status.includes('success') || status.includes('confirmed')
                    ? 'text-green-400'
                    : 'text-blue-300'
                }`}>
                  {status}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div 
          className="text-center mt-10 text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <p>© 2025 StudyDAO | ARKT Token</p>
          <p className="mt-1">Powered by Sonic Blaze Testnet</p>
        </motion.div>
      </div>
    </div>
  );
}