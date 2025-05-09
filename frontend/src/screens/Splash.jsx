// screens/Splash.jsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const Splash = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3500); // Extended slightly to allow animations to complete
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // Floating nodes animation for blockchain effect
  const nodes = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    x: Math.random() * 80 - 40,
    y: Math.random() * 80 - 40,
    size: Math.random() * 8 + 4
  }));

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden relative">
      {/* Blockchain-like floating nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full bg-blue-500 opacity-30"
          style={{ 
            width: node.size, 
            height: node.size,
          }}
          initial={{ 
            x: `calc(50% + ${node.x}px)`, 
            y: `calc(50% + ${node.y}px)`,
            opacity: 0
          }}
          animate={{ 
            x: [
              `calc(50% + ${node.x}px)`,
              `calc(50% + ${node.x + Math.random() * 60 - 30}px)`,
              `calc(50% + ${node.x}px)`
            ],
            y: [
              `calc(50% + ${node.y}px)`,
              `calc(50% + ${node.y + Math.random() * 60 - 30}px)`,
              `calc(50% + ${node.y}px)`
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
        className="absolute inset-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
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

      {/* Logo and text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10"
      >
        {/* Hexagon container for Web3 aesthetic */}
        <motion.div 
          className="mx-auto mb-6 relative"
          initial={{ rotate: -30, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="w-24 h-24 bg-opacity-20 bg-blue-500 rounded-xl relative overflow-hidden mx-auto">
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Text logo */}
        <motion.h1 
          className="text-6xl font-bold tracking-tighter"
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, letterSpacing: '-0.05em' }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        >
          <span className="text-blue-400">STUDY</span>
          <span className="text-purple-500">DAO</span>
        </motion.h1>

        {/* Underline */}
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 1, duration: 1 }}
          className="h-1 bg-gradient-to-r from-blue-400 to-purple-500 mt-4 rounded-full"
        />

        {/* Tagline with staggered letters */}
        <motion.p
          className="text-gray-400 mt-4 font-light text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          learn • grow • earn
        </motion.p>

        {/* Binary/blockchain-style loading dots */}
        <motion.div className="flex justify-center mt-8 space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-400 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Splash;