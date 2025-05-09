// components/Resources.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiClock, FiStar, FiBookmark, FiTrendingUp, FiShield, FiDollarSign, FiUser, FiMessageSquare, FiFile, FiUpload, FiVideo, FiBook, FiLayers, FiMonitor, FiAward } from 'react-icons/fi';

const Resources = () => {
  const [activeResourceTab, setActiveResourceTab] = useState('tutors');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [requestHours, setRequestHours] = useState(1);
  const [requestMessage, setRequestMessage] = useState('');
  
  // Animation variants
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
  
  // Mock data for tutors
  const tutors = [
    {
      id: 1,
      name: 'Dr. Alex Johnson',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
      specialty: 'Blockchain Development',
      rating: 4.9,
      reviews: 134,
      hourlyRate: 45,
      availability: 'Available today',
      description: 'Experienced blockchain developer with 7+ years teaching Solidity, Web3.js, and dApp architecture. PhD in Computer Science.',
      verified: true,
    },
    {
      id: 2,
      name: 'Sarah Kim',
      photo: 'https://randomuser.me/api/portraits/women/44.jpg',
      specialty: 'Smart Contract Security',
      rating: 4.8,
      reviews: 98,
      hourlyRate: 50,
      availability: 'Available tomorrow',
      description: 'Security researcher specializing in smart contract audits. Former lead at a major crypto security firm. Excellent at explaining complex security concepts.',
      verified: true,
    },
    {
      id: 3,
      name: 'Michael Rodriguez',
      photo: 'https://randomuser.me/api/portraits/men/45.jpg',
      specialty: 'DeFi Protocols',
      rating: 4.7,
      reviews: 86,
      hourlyRate: 40,
      availability: 'Available today',
      description: 'DeFi expert with deep knowledge of lending protocols, AMMs, and yield farming strategies. Previously worked at Compound.',
      verified: true,
    },
    {
      id: 4,
      name: 'Emma Wilson',
      photo: 'https://randomuser.me/api/portraits/women/33.jpg',
      specialty: 'NFT Development',
      rating: 4.9,
      reviews: 112,
      hourlyRate: 55,
      availability: 'Available in 2 days',
      description: 'Artist and developer specializing in NFT creation, marketplaces, and generative art. Can teach both technical and creative aspects.',
      verified: true,
    },
    {
      id: 5,
      name: 'James Chen',
      photo: 'https://randomuser.me/api/portraits/men/22.jpg',
      specialty: 'Crypto Economics',
      rating: 4.6,
      reviews: 75,
      hourlyRate: 35,
      availability: 'Available today',
      description: 'Economist specializing in tokenomics, incentive design, and crypto game theory. Can help with understanding token models and market behaviors.',
      verified: false,
    }
  ];
  
  // Mock data for learning materials
  const learningMaterials = [
    {
      id: 1,
      title: 'Introduction to Blockchain Technology',
      type: 'course',
      author: 'Blockchain Academy',
      rating: 4.8,
      reviews: 342,
      difficulty: 'Beginner',
      duration: '12 hours',
      tokenCost: 20,
      color: 'from-blue-600 to-blue-400',
      icon: <FiBook size={30} />,
      tags: ['blockchain', 'cryptocurrency', 'beginner']
    },
    {
      id: 2,
      title: 'Smart Contract Development with Solidity',
      type: 'course',
      author: 'Web3 Education',
      rating: 4.9,
      reviews: 189,
      difficulty: 'Intermediate',
      duration: '15 hours',
      tokenCost: 30,
      color: 'from-purple-600 to-purple-400',
      icon: <FiLayers size={30} />,
      tags: ['smart contracts', 'solidity', 'ethereum']
    },
    {
      id: 3,
      title: 'Advanced DeFi Concepts',
      type: 'ebook',
      author: 'DeFi Researcher Collective',
      rating: 4.7,
      reviews: 124,
      difficulty: 'Advanced',
      pages: 220,
      tokenCost: 25,
      color: 'from-green-600 to-green-400',
      icon: <FiDollarSign size={30} />,
      tags: ['defi', 'finance', 'advanced']
    },
    {
      id: 4,
      title: 'NFT Creation Workshop',
      type: 'workshop',
      author: 'Digital Artists Guild',
      rating: 4.6,
      reviews: 98,
      difficulty: 'Intermediate',
      duration: '8 hours',
      tokenCost: 35,
      color: 'from-pink-600 to-pink-400',
      icon: <FiAward size={30} />,
      tags: ['nft', 'art', 'digital']
    },
    {
      id: 5,
      title: 'Blockchain Security Best Practices',
      type: 'webinar',
      author: 'Security Shield Institute',
      rating: 4.8,
      reviews: 156,
      difficulty: 'Advanced',
      duration: '4 hours',
      tokenCost: 15,
      color: 'from-red-600 to-red-400',
      icon: <FiShield size={30} />,
      tags: ['security', 'best practices', 'advanced']
    }
  ];
  
  // Mock data for community resources
  const communityResources = [
    {
      id: 1,
      title: 'Understanding ERC-20 Token Standard',
      type: 'document',
      author: 'eth_dev_master',
      uploads: 23,
      downloads: 347,
      tokenReward: 5,
      uploadDate: '2025-03-15',
      fileSize: '2.4 MB',
      fileType: 'PDF',
      tags: ['ethereum', 'tokens', 'standards']
    },
    {
      id: 2,
      title: 'Step-by-Step Guide: Building Your First dApp',
      type: 'tutorial',
      author: 'blockchain_teacher',
      uploads: 18,
      downloads: 412,
      tokenReward: 8,
      uploadDate: '2025-04-02',
      fileSize: '5.1 MB',
      fileType: 'ZIP',
      tags: ['dapp', 'development', 'tutorial']
    },
    {
      id: 3,
      title: 'Analyzing Gas Optimization Techniques',
      type: 'research',
      author: 'gas_optimizer',
      uploads: 10,
      downloads: 289,
      tokenReward: 12,
      uploadDate: '2025-04-20',
      fileSize: '1.8 MB',
      fileType: 'PDF',
      tags: ['gas', 'optimization', 'ethereum']
    },
    {
      id: 4,
      title: 'Consensus Mechanisms Comparison Chart',
      type: 'infographic',
      author: 'crypto_researcher',
      uploads: 7,
      downloads: 511,
      tokenReward: 4,
      uploadDate: '2025-03-28',
      fileSize: '1.2 MB',
      fileType: 'PNG',
      tags: ['consensus', 'pow', 'pos']
    },
    {
      id: 5,
      title: 'Web3 Wallet Integration Examples',
      type: 'code',
      author: 'web3_developer',
      uploads: 15,
      downloads: 376,
      tokenReward: 10,
      uploadDate: '2025-04-15',
      fileSize: '3.7 MB',
      fileType: 'ZIP',
      tags: ['wallets', 'integration', 'web3']
    }
  ];
  
  // Filter tutors based on search term
  const filteredTutors = tutors.filter(tutor => 
    tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutor.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Filter learning materials based on search term and category
  const filteredMaterials = learningMaterials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          material.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
                          
    const matchesCategory = selectedCategory === 'all' || material.type === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Filter community resources based on search term
  const filteredCommunityResources = communityResources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle tutor request
  const handleTutorRequest = (tutor) => {
    setSelectedTutor(tutor);
    setRequestModalOpen(true);
  };
  
  // Handle request submission
  const handleSubmitRequest = () => {
    // In a real app, this would send the request to the backend
    alert(`Request sent to ${selectedTutor.name} for ${requestHours} hours!`);
    setRequestModalOpen(false);
    setSelectedTutor(null);
    setRequestHours(1);
    setRequestMessage('');
  };
  
  // Get icon for resource type
  const getResourceTypeIcon = (type) => {
    switch(type) {
      case 'course': return <FiBookmark />;
      case 'ebook': return <FiBook />;
      case 'workshop': return <FiUser />;
      case 'webinar': return <FiVideo />;
      case 'document': return <FiFile />;
      case 'tutorial': return <FiBookmark />;
      case 'research': return <FiTrendingUp />;
      case 'infographic': return <FiFile />;
      case 'code': return <FiFile />;
      default: return <FiFile />;
    }
  };

  return (
    <div className="min-h-screen">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Resources Navigation Tabs */}
        <motion.div variants={item} className="flex justify-center mb-6">
          <div className="inline-flex bg-gray-800 bg-opacity-50 rounded-lg p-1">
            {[
              { id: 'tutors', label: 'Find Tutors' },
              { id: 'learning', label: 'Learning Materials' },
              { id: 'community', label: 'Community Resources' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm rounded-md transition-all ${
                  activeResourceTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveResourceTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={item} className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder={`Search for ${activeResourceTab === 'tutors' ? 'tutors' : activeResourceTab === 'learning' ? 'courses, books, and more' : 'community resources'}`}
              className="w-full bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
          
          {/* Category filters for learning materials */}
          {activeResourceTab === 'learning' && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['all', 'course', 'ebook', 'workshop', 'webinar'].map(category => (
                <button
                  key={category}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    selectedCategory === category
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-400'
                  } transition-colors`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tutors Tab Content */}
        {activeResourceTab === 'tutors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.length > 0 ? (
              filteredTutors.map(tutor => (
                <motion.div
                  key={tutor.id}
                  variants={item}
                  className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 overflow-hidden backdrop-filter backdrop-blur-sm"
                >
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <img
                        src={tutor.photo}
                        alt={tutor.name}
                        className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-gray-700"
                      />
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-semibold text-lg">{tutor.name}</h3>
                          {tutor.verified && (
                            <div className="ml-2 bg-blue-500 rounded-full p-1 flex items-center justify-center">
                              <FiShield size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-blue-400 text-sm">{tutor.specialty}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-4">{tutor.description}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <FiStar size={16} className="text-yellow-400 mr-1" />
                        <span className="font-medium mr-1">{tutor.rating}</span>
                        <span className="text-gray-400 text-sm">({tutor.reviews})</span>
                      </div>
                      <div className="flex items-center text-green-400 text-sm">
                        <FiClock size={14} className="mr-1" />
                        {tutor.availability}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <FiDollarSign size={18} className="text-purple-400 mr-1" />
                        <span className="font-bold text-xl">{tutor.hourlyRate}</span>
                        <span className="text-gray-400 text-sm ml-1">ARKT/hr</span>
                      </div>
                      <button
                        onClick={() => handleTutorRequest(tutor)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm"
                      >
                        Request Tutor
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div variants={item} className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10">
                <p className="text-gray-400">No tutors match your search criteria. Try a different search term.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Learning Materials Tab Content */}
        {activeResourceTab === 'learning' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map(material => (
                <motion.div
                  key={material.id}
                  variants={item}
                  className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 overflow-hidden backdrop-filter backdrop-blur-sm"
                >
                  {/* Stylized course thumbnail instead of plain image */}
                  <div className={`w-full h-40 bg-gradient-to-br ${material.color} flex items-center justify-center p-6 border-b border-gray-700`}>
                    <div className="bg-white bg-opacity-20 rounded-full p-5">
                      <div className="text-white">
                        {material.icon}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center text-xs text-gray-400 mb-1">
                      <span className="bg-gray-700 rounded-full px-2 py-0.5 flex items-center">
                        {getResourceTypeIcon(material.type)}
                        <span className="ml-1 capitalize">{material.type}</span>
                      </span>
                      <span className="mx-2">•</span>
                      <span>{material.difficulty}</span>
                      <span className="mx-2">•</span>
                      <span>{material.duration || `${material.pages} pages`}</span>
                    </div>
                    
                    <h3 className="font-medium text-lg mb-1">{material.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">By {material.author}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <FiStar size={16} className="text-yellow-400 mr-1" />
                        <span className="font-medium mr-1">{material.rating}</span>
                        <span className="text-gray-400 text-sm">({material.reviews})</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <FiDollarSign size={18} className="text-purple-400 mr-1" />
                        <span className="font-bold text-xl">{material.tokenCost}</span>
                        <span className="text-gray-400 text-sm ml-1">ARKT</span>
                      </div>
                      <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm">
                        Access Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div variants={item} className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10">
                <p className="text-gray-400">No learning materials match your search criteria. Try a different search term or category.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Community Resources Tab Content */}
        {activeResourceTab === 'community' && (
          <div className="space-y-6">
            <motion.div variants={item} className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 p-6 backdrop-filter backdrop-blur-sm mb-6">
              <h3 className="text-xl font-semibold mb-4">Share Your Knowledge, Earn ARKT</h3>
              <p className="text-gray-300 mb-4">
                Help the community by sharing your learning resources, guides, or research. Earn ARKT tokens each time another member downloads your contribution.
              </p>
              <div className="flex justify-between items-center">
                <div className="text-gray-400 text-sm">
                  <span className="text-green-400 font-medium">4-12 ARKT</span> reward per resource contribution
                </div>
                <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm flex items-center">
                  <FiUpload className="mr-2" />
                  Upload Resource
                </button>
              </div>
            </motion.div>
            
            {filteredCommunityResources.length > 0 ? (
              filteredCommunityResources.map(resource => (
                <motion.div
                  key={resource.id}
                  variants={item}
                  className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 p-4 backdrop-filter backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start">
                      <div className="bg-gray-700 p-3 rounded-lg mr-4 text-blue-400">
                        {getResourceTypeIcon(resource.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{resource.title}</h3>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <span>By {resource.author}</span>
                          <span className="mx-2">•</span>
                          <span>{resource.uploadDate}</span>
                          <span className="mx-2">•</span>
                          <span>{resource.fileSize} {resource.fileType}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resource.tags.map((tag, index) => (
                            <span key={index} className="bg-gray-700 text-xs px-2 py-0.5 rounded-full text-gray-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-gray-400 text-sm justify-end mb-2">
                        <span>{resource.downloads} downloads</span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <FiDollarSign size={14} className="text-purple-400 mr-1" />
                          {resource.tokenReward} ARKT reward
                        </span>
                      </div>
                      <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-1.5 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm">
                        Download
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div variants={item} className="text-center py-10">
                <p className="text-gray-400">No community resources match your search criteria. Try a different search term.</p>
              </motion.div>
            )}
          </div>
        )}
        
        {/* Tutor Request Modal */}
        {requestModalOpen && selectedTutor && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-semibold mb-4">Request Tutor Session</h2>
              
              <div className="flex items-center mb-6">
                <img
                  src={selectedTutor.photo}
                  alt={selectedTutor.name}
                  className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-gray-700"
                />
                <div>
                  <h3 className="font-medium">{selectedTutor.name}</h3>
                  <p className="text-blue-400 text-sm">{selectedTutor.specialty}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Number of Hours</label>
                <div className="flex items-center">
                  <button 
                    className="bg-gray-700 rounded-l-lg px-3 py-2 hover:bg-gray-600 transition-colors"
                    onClick={() => setRequestHours(prev => Math.max(1, prev - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={requestHours}
                    onChange={(e) => setRequestHours(parseInt(e.target.value) || 1)}
                    className="bg-gray-700 text-center py-2 w-16 focus:outline-none"
                  />
                  <button 
                    className="bg-gray-700 rounded-r-lg px-3 py-2 hover:bg-gray-600 transition-colors"
                    onClick={() => setRequestHours(prev => prev + 1)}
                  >
                    +
                  </button>
                  <div className="ml-4">
                    <div className="flex items-center text-sm">
                      <FiDollarSign size={16} className="text-purple-400 mr-1" />
                      <span className="font-bold">{selectedTutor.hourlyRate * requestHours}</span>
                      <span className="text-gray-400 ml-1">ARKT total</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ({selectedTutor.hourlyRate} ARKT × {requestHours} hours)
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">Message (optional)</label>
                <textarea
                  placeholder="Tell the tutor what you'd like to learn..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors text-white resize-none h-24"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  onClick={() => setRequestModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                  onClick={handleSubmitRequest}
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Resources;