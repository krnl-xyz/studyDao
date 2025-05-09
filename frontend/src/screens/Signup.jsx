// screens/Signup.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile 
} from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; // Adjust path if needed
import { doc, setDoc } from 'firebase/firestore';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (step === 2 && validateStep2()) {
      try {
        setIsLoading(true);
        
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        const user = userCredential.user;
        
        // Update profile with username
        await updateProfile(user, {
          displayName: formData.username
        });
        
        // Store additional user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          username: formData.username,
          email: formData.email,
          createdAt: new Date(),
          points: 0,
          completedCourses: []
        });
        
        // Navigate to home page
        navigate('/home');
      } catch (error) {
        console.error("Error during signup:", error);
        setError(error.message.includes("auth/") 
          ? error.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "")
          : 'Failed to create account. Please try again.');
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this is a new user
      const isNewUser = result._tokenResponse.isNewUser;
      
      if (isNewUser) {
        // Extract username from email or use display name
        const username = user.displayName || user.email.split('@')[0];
        
        // Store user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          username: username,
          email: user.email,
          createdAt: new Date(),
          points: 0,
          completedCourses: []
        });
      }
      
      // Navigate to home page
      navigate('/home');
    } catch (error) {
      console.error("Error during Google sign in:", error);
      setError('Failed to sign in with Google. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2"/>
              <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="2"/>
              <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="white" strokeWidth="2"/>
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-blue-400">STUDY</span>
            <span className="text-purple-500">DAO</span>
          </h1>
          <p className="text-gray-400 mt-2">Create your account and start earning while learning</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center w-48">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 1 ? 'border-blue-500 bg-blue-500 bg-opacity-20' : 'border-green-500 bg-green-500 text-white'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`flex-1 h-1 ${step > 1 ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 2 ? 'border-blue-500 bg-blue-500 bg-opacity-20' : 'border-gray-600'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 backdrop-filter backdrop-blur-sm">
          {/* Step 1 - Google Sign in or Email/Username */}
          {step === 1 && (
            <>
              {/* Google Sign in Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-3 px-4 mb-6 rounded-lg border border-blue-500 text-blue-400 hover:bg-blue-500 hover:bg-opacity-10 transition-colors flex items-center justify-center"
              >
                {isGoogleLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full mr-3"
                    />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center my-6">
                <div className="flex-grow h-px bg-gray-700"></div>
                <span className="px-4 text-sm text-gray-400">or sign up with email</span>
                <div className="flex-grow h-px bg-gray-700"></div>
              </div>

              <form>
                {error && (
                  <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    className="w-full bg-gray-700 bg-opacity-50 text-white rounded-lg py-3 px-4 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="w-full bg-gray-700 bg-opacity-50 text-white rounded-lg py-3 px-4 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Next
                </button>
              </form>
            </>
          )}

          {/* Step 2 - Password Creation */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="w-full bg-gray-700 bg-opacity-50 text-white rounded-lg py-3 px-4 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="w-full bg-gray-700 bg-opacity-50 text-white rounded-lg py-3 px-4 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                      />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>

              <div className="mt-6 text-xs text-gray-400 text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
              </div>
            </form>
          )}
        </div>

        {/* Login link */}
        <div className="text-center mt-6 text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:underline">
            Log in
          </Link>
        </div>

        {/* Blockchain nodes decoration */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-purple-500 opacity-10"
            style={{ 
              width: 5 + Math.random() * 20, 
              height: 5 + Math.random() * 20,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              zIndex: -1
            }}
            animate={{ 
              opacity: [0.1, 0.2, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 3 + Math.random() * 3,
              delay: Math.random() * 2
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Signup;