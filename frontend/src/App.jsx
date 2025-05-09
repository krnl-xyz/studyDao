import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Splash from './screens/Splash';
import Home from './screens/Home';
import Login from './screens/Login';
import Signup from './screens/Signup';
import StudyGroups from './screens/StudyGroups'; 
import ArktechTokenApp from './screens/ArktechTokenApp';

// This component contains the routes and handles auth state
const AppRoutes = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { currentUser, userProfile, loading: authLoading, isAuthenticated } = useAuth();
  
  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Simulate splash screen timeout
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000); // 3 seconds for splash screen
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Show splash screen initially
  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }
  
  // Wait until authentication is ready before rendering routes
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Prepare user data to pass to components
  const userData = isAuthenticated ? {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName || userProfile?.displayName,
    photoURL: currentUser.photoURL,
    // Add any additional user profile data you need from userProfile
    studyTokens: userProfile?.studyTokens || 0,
    joinedGroups: userProfile?.joinedGroups || [],
    // Add wallet address if available in the user profile
    walletAddress: userProfile?.walletAddress || null
  } : null;
  
  // After splash screen and auth check, use React Router for navigation
  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/home" /> : <Login />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/home" /> : <Signup />} />
        <Route 
          path="/home" 
          element={isAuthenticated ? <Home user={userData} /> : <Navigate to="/login" />} 
        />
        {/* Study Groups route */}
        <Route 
          path="/study-groups" 
          element={isAuthenticated ? <StudyGroups user={userData} /> : <Navigate to="/login" />} 
        />
        {/* Add ArktechToken route */}
        <Route 
          path="/tokens" 
          element={isAuthenticated ? <ArktechTokenApp user={userData} /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/login"} />} />
      </Routes>
    </Router>
  );
};

// Main App component that wraps everything with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;