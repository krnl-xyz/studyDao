import { createContext, useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';

// Create the context
const TokenContext = createContext();

// Simple ERC20 ABI with just the functions we need
const tokenABI = [
  // Read-only functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  // Transactions
  "function transfer(address to, uint amount) returns (bool)"
];

// Sonic chain ID in proper hexadecimal format
const sonicChainId = '0xdede'; // 57054 in hex format

export const TokenProvider = ({ children, user }) => {
  // Token state
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState('ARKT');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  
  // Set your actual ARKT token address from the Sonic Blaze Testnet
  const tokenAddress = '0x9effd7655b5C23dbE306d7B87369fcBF0cf3280A';

  // Initialize on component mount
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
        
        // Initialize provider and contract
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(ethersProvider);
        const token = new ethers.Contract(tokenAddress, tokenABI, ethersProvider);
        setTokenContract(token);
        
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
      
      // Initialize provider and contract
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(ethersProvider);
      const token = new ethers.Contract(tokenAddress, tokenABI, ethersProvider);
      setTokenContract(token);
      
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
      if (!provider) {
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(ethersProvider);
        
        const token = new ethers.Contract(tokenAddress, tokenABI, ethersProvider);
        setTokenContract(token);
      }
      
      // Get ETH balance
      const ethBalance = await provider.getBalance(currentAccount);
      setBalance(ethers.utils.formatEther(ethBalance));

      if (!tokenContract) {
        const token = new ethers.Contract(tokenAddress, tokenABI, provider);
        setTokenContract(token);
      }

      try {
        // Get token symbol
        const symbol = await tokenContract.symbol();
        setTokenSymbol(symbol);
  
        // Get token decimals
        const decimals = await tokenContract.decimals();
  
        // Get token balance
        const rawTokenBalance = await tokenContract.balanceOf(currentAccount);
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
  const sendTokens = async (recipientAddress, amount) => {
    if (!recipientAddress || !amount) {
      setStatus('Please enter a recipient address and amount');
      return;
    }

    if (!ethers.utils.isAddress(recipientAddress)) {
      setStatus('Please enter a valid Ethereum address');
      return;
    }

    // Check if amount is valid number
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setStatus('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      setStatus('Preparing transaction...');
      if (!provider) {
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(ethersProvider);
      }
      
      const signer = provider.getSigner();
      
      if (!tokenContract) {
        const token = new ethers.Contract(tokenAddress, tokenABI, provider);
        setTokenContract(token);
      }
      
      const tokenWithSigner = tokenContract.connect(signer);
      
      // Get token decimals
      const decimals = await tokenContract.decimals();
      
      // Convert amount to token units
      const tokenAmount = ethers.utils.parseUnits(amount, decimals);
      
      setStatus('Sending transaction...');
      const tx = await tokenWithSigner.transfer(recipientAddress, tokenAmount);
      
      setStatus('Transaction sent! Waiting for confirmation...');
      await tx.wait();
      
      setStatus('Transaction confirmed!');
      getBalances(account);
      
      return true;
    } catch (error) {
      console.error("Error sending tokens:", error);
      setStatus(`Transaction failed: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add custom network (Sonic testnet) to MetaMask
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

  // Context value
  const value = {
    isConnected,
    account,
    balance,
    tokenBalance,
    tokenSymbol,
    status,
    isLoading,
    tokenAddress,
    connectWallet,
    getBalances,
    sendTokens,
    switchToSonicNetwork,
    addSonicNetwork
  };

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
};

// Custom hook for using the token context
export const useToken = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};

export default TokenContext;