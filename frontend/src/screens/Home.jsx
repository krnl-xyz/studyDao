// screens/Home.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiGrid, FiUsers, FiBookOpen, FiLogOut, FiDollarSign, FiAward, FiTarget } from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigate, Link } from 'react-router-dom';
import StudyGroups from '../components/StudyGroups';
import Resources from '../components/Resources';

const Home = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Mock data
  const studyStats = {
    totalHours: 42.5,
    rank: 23,
    streak: 7
  };
  
  const leaderboard = [
    { id: 1, name: 'alex.eth', hours: 68, tokens: 425 },
    { id: 2, name: 'blockchain_scholar', hours: 63, tokens: 410 },
    { id: 3, name: 'study_master', hours: 59, tokens: 387 },
    { id: 4, name: 'web3_learner', hours: 54, tokens: 352 },
    { id: 5, name: 'dao_student', hours: 52, tokens: 338 }
  ];

  const achievementBadges = [
    { id: 1, name: 'Early Adopter', icon: '🚀', obtained: true },
    { id: 2, name: '7-Day Streak', icon: '🔥', obtained: true },
    { id: 3, name: 'Group Facilitator', icon: '👥', obtained: true },
    { id: 4, name: 'Knowledge Contributor', icon: '📚', obtained: false },
    { id: 5, name: 'Token Whale', icon: '🐋', obtained: false }
  ];

  // Check if MetaMask is installed and if an account is connected
  useEffect(() => {
    checkIfWalletIsConnected();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setIsConnected(false);
          setAccount('');
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    // If user has a stored wallet address, use it
    if (user?.walletAddress) {
      setAccount(user.walletAddress);
      if (window.ethereum) {
        setIsConnected(true);
      }
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [user]);

  // Check if MetaMask is installed and if an account is connected
  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this app');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigation will be handled by App.jsx's auth state listener
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Handle tab navigation
  const handleTabNavigation = (tabId) => {
    if (tabId === 'tokens') {
      // Navigate to ArktechToken page
      navigate('/tokens');
    } else {
      // For all other tabs, just switch the active tab
      setActiveTab(tabId);
    }
  };

  // Improved address formatter - shows first 4 and last 3 digits with ellipsis
  const formatAddress = (address) => {
    if (!address) return "Not Connected";
    return `${address.slice(0, 4)}...${address.slice(-3)}`;
  };

  // Get user initials for the avatar
  const getUserInitials = () => {
    if (!user) return "?";
    
    if (user.displayName) {
      const names = user.displayName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.displayName[0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return "?";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return "Guest";
    
    if (user.displayName) {
      return user.displayName;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return "Guest";
  };

  // Animation variants from Splash screen
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  // Floating nodes animation for blockchain effect (from Splash)
  const nodes = Array.from({ length: 5 }).map((_, i) => ({
    id: i,
    x: Math.random() * 80 - 40,
    y: Math.random() * 80 - 40,
    size: Math.random() * 6 + 3
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background Floating Nodes (from Splash screen) */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full bg-blue-500 opacity-20 hidden md:block"
          style={{ 
            width: node.size, 
            height: node.size,
          }}
          initial={{ 
            x: `calc(80% + ${node.x}px)`, 
            y: `calc(30% + ${node.y}px)`,
            opacity: 0
          }}
          animate={{ 
            x: [
              `calc(80% + ${node.x}px)`,
              `calc(80% + ${node.x + Math.random() * 40 - 20}px)`,
              `calc(80% + ${node.x}px)`
            ],
            y: [
              `calc(30% + ${node.y}px)`,
              `calc(30% + ${node.y + Math.random() * 40 - 20}px)`,
              `calc(30% + ${node.y}px)`
            ],
            opacity: [0, 0.4, 0.2],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 3 + Math.random() * 2,
            ease: "easeInOut",
            delay: Math.random()
          }}
        />
      ))}

      {/* Connection lines animation (from Splash) */}
      <motion.svg 
        className="absolute right-0 top-0 w-1/2 h-full hidden lg:block"
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

      {/* Header Bar */}
      <header className="border-b border-gray-700 bg-black bg-opacity-30 backdrop-filter backdrop-blur-lg z-10 relative">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <motion.div 
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 flex items-center justify-center"
            >
              {/* Animated logo (like in Splash) */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2"/>
                  <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="2"/>
                  <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="white" strokeWidth="2"/>
                </svg>
              </motion.div>
            </motion.div>
            <motion.h1 
              className="text-2xl font-bold tracking-tight"
              initial={{ opacity: 0, letterSpacing: '0.2em' }}
              animate={{ opacity: 1, letterSpacing: 'normal' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-blue-400">STUDY</span>
              <span className="text-purple-500">DAO</span>
            </motion.h1>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="bg-gray-800 rounded-full py-1 px-4 text-sm flex items-center border border-gray-700 hover:border-blue-400 transition-colors">
                <span className="text-blue-400 mr-1">⬡</span>
                <span>{formatAddress(account)}</span>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm py-1 px-4 rounded-full hover:opacity-90 transition-opacity"
              >
                Connect Wallet
              </button>
            )}
            
            {/* User Profile Dropdown */}
            <div className="relative">
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user && user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">{getUserInitials()}</span>
                  </div>
                )}
              </div>
              
              {/* User Menu Dropdown */}
              {showUserMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10"
                >
                  <div className="p-3 border-b border-gray-700">
                    <div className="font-medium">{getUserDisplayName()}</div>
                    <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm rounded-md flex items-center hover:bg-gray-700 transition-colors"
                    >
                      <FiLogOut className="mr-2" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex bg-gray-800 bg-opacity-50 rounded-lg p-1"
          >
            {[
              { id: 'dashboard', icon: <FiGrid className="mr-2" />, label: 'Dashboard' },
              { id: 'groups', icon: <FiUsers className="mr-2" />, label: 'Groups' },
              { id: 'resources', icon: <FiBookOpen className="mr-2" />, label: 'Resources' },
              { id: 'tokens', icon: <FiDollarSign className="mr-2" />, label: 'ArktechTokens' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`flex items-center px-4 py-2 text-sm rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => handleTabNavigation(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Dashboard Area */}
            <motion.div variants={item} className="col-span-1 lg:col-span-2">
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 backdrop-filter backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-4">Welcome to StudyDAO</h2>
                <p className="text-gray-300 mb-4">StudyDAO is a decentralized platform that rewards your study and learning activities with ARKT tokens.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Hours */}
                  <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Total Study Hours</div>
                    <div className="text-2xl font-bold">{studyStats.totalHours}h</div>
                    <div className="text-xs text-gray-400 mt-1">Last updated: Today</div>
                  </div>
                  
                  {/* Rank */}
                  <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Current Rank</div>
                    <div className="text-2xl font-bold">#{studyStats.rank}</div>
                    <div className="text-xs text-green-400 mt-1">Top 5% of users</div>
                  </div>
                  
                  {/* Current Streak */}
                  <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Study Streak</div>
                    <div className="text-2xl font-bold flex items-center">
                      {studyStats.streak} days
                      <span className="ml-2 text-yellow-500">🔥</span>
                    </div>
                    <div className="text-xs text-green-400 mt-1">+2 days this week</div>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <motion.div variants={item} className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 mt-6 backdrop-filter backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  Wallet Status
                </h2>
                
                {isConnected ? (
                  <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                          Connected to MetaMask
                        </div>
                        <div className="text-sm text-gray-400 mt-1">{formatAddress(account)}</div>
                      </div>
                      <Link 
                        to="/tokens"
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm py-1 px-4 rounded-md hover:opacity-90 transition-opacity"
                      >
                        Manage Tokens
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                          Wallet Not Connected
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Connect your MetaMask wallet to manage tokens</div>
                      </div>
                      <button 
                        onClick={connectWallet}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm py-1 px-4 rounded-md hover:opacity-90 transition-opacity"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
              
              {/* App Info */}
              <motion.div variants={item} className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 mt-6 backdrop-filter backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-4">About StudyDAO</h2>
                <p className="text-gray-300 mb-4">
                  StudyDAO is a decentralized autonomous organization focused on incentivizing learning through blockchain technology.
                  Complete study sessions, contribute to groups, and participate in governance to earn ARKT tokens.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Features</h3>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                      <li>Track study hours on-chain</li>
                      <li>Earn ARKT tokens for learning</li>
                      <li>Join study groups with other members</li>
                      <li>Access curated learning resources</li>
                    </ul>
                  </div>
                  <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Getting Started</h3>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                      <li>Connect your MetaMask wallet</li>
                      <li>Browse available study groups</li>
                      <li>Complete your first study session</li>
                      <li>Manage your ARKT tokens</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Side Panel */}
            <motion.div variants={item} className="col-span-1 space-y-6">
              {/* User Welcome Card */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 backdrop-filter backdrop-blur-sm">
                <div className="flex items-center mb-4">
                  {user && user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full border border-gray-600 mr-4"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-lg font-bold">{getUserInitials()}</span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-lg">Welcome, {getUserDisplayName()}</div>
                    <div className="text-sm text-gray-400">{user?.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Link 
                    to="/tokens"
                    className="py-2 text-blue-400 text-sm border border-blue-400 rounded-lg hover:bg-blue-400 hover:bg-opacity-10 transition-colors flex items-center justify-center"
                  >
                    <FiDollarSign className="mr-2" />
                    My Tokens
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="py-2 text-blue-400 text-sm border border-blue-400 rounded-lg hover:bg-blue-400 hover:bg-opacity-10 transition-colors flex items-center justify-center"
                  >
                    <FiLogOut className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 backdrop-filter backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <FiAward className="mr-2 text-blue-400" />
                  Leaderboard
                </h2>
                <div className="space-y-3">
                  {leaderboard.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-2 ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-300' : 
                          index === 2 ? 'bg-yellow-700' : 'bg-gray-700'
                        }`}>
                          <span className="text-xs">{index + 1}</span>
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <div className="text-sm text-gray-400">{user.hours}h</div>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-gray-700 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 mr-2">
                        <span className="text-xs">{studyStats.rank}</span>
                      </div>
                      <span className="font-medium">You</span>
                    </div>
                    <div className="text-sm text-gray-400">{studyStats.totalHours}h</div>
                  </div>
                </div>
              </div>

              {/* Achievement Badges */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 backdrop-filter backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <FiTarget className="mr-2 text-blue-400" />
                  Study Badges
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {achievementBadges.map(badge => (
                    <div 
                      key={badge.id} 
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center p-2 border ${
                        badge.obtained ? 'border-blue-500 bg-blue-500 bg-opacity-10' : 'border-gray-700 bg-gray-700 bg-opacity-30 opacity-50'
                      }`}
                    >
                      <span className="text-2xl mb-1">{badge.icon}</span>
                      <span className="text-xs">{badge.name}</span>
                    </div>
                  ))}
                  <div className="aspect-square rounded-lg flex flex-col items-center justify-center text-center p-2 border border-dashed border-gray-600 bg-gray-700 bg-opacity-30">
                    <span className="text-2xl mb-1">+</span>
                    <span className="text-xs">More</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Groups Tab Content */}
        {activeTab === 'groups' && <StudyGroups />}

        {/* Resources Tab Content */}
        {activeTab === 'resources' && <Resources />}

        {/* Placeholder for other tabs that don't have components yet */}
        {activeTab !== 'dashboard' && activeTab !== 'groups' && activeTab !== 'resources' && (
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-10 text-center border border-gray-700 backdrop-filter backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section</h2>
            <p className="text-gray-400">This section is currently in development</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 backdrop-filter backdrop-blur-lg border-t border-gray-800 z-20">
        <div className="flex justify-around py-3">
          {[
            { id: 'dashboard', icon: <FiGrid size={22} /> },
            { id: 'groups', icon: <FiUsers size={22} /> },
            { id: 'resources', icon: <FiBookOpen size={22} /> },
            { id: 'tokens', icon: <FiDollarSign size={22} /> }
          ].map(tab => (
            <button
              key={tab.id}
              className={`flex flex-col items-center justify-center ${
                activeTab === tab.id
                  ? 'text-blue-400'
                  : 'text-gray-500'
              }`}
              onClick={() => handleTabNavigation(tab.id)}
            >
              {tab.icon}
              <span className="text-xs mt-1">
                {tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;