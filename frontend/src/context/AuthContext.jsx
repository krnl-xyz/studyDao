import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Using your existing firebase config

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Sign up function
  const signup = async (email, password, displayName) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name in auth profile
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      // Create user profile in Firestore with initial tokens
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        displayName,
        studyTokens: 100, // Starting tokens for new users
        joinedGroups: [],
        createdAt: new Date(),
        lastLogin: new Date()
      });
      
      return userCredential.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login timestamp
      await updateDoc(doc(db, "users", userCredential.user.uid), {
        lastLogin: new Date()
      });
      
      return userCredential.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out function
  const logout = () => {
    return signOut(auth);
  };

  // Password reset function
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        return userData;
      } else {
        // Create profile if it doesn't exist (this handles existing auth users)
        const newUserProfile = {
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          studyTokens: 100,
          joinedGroups: [],
          createdAt: new Date(),
          lastLogin: new Date()
        };
        
        await setDoc(userDocRef, newUserProfile);
        setUserProfile(newUserProfile);
        console.log("Created new user profile");
        return newUserProfile;
      }
    } catch (err) {
      console.error("Error fetching/creating user profile:", err);
      return null;
    }
  };

  // Update user profile
  const updateUserProfile = async (userData) => {
    try {
      if (!currentUser) throw new Error("No authenticated user");
      
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...userData,
        updatedAt: new Date()
      });
      
      // Update local state
      setUserProfile(prev => ({...prev, ...userData}));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Add tokens to user account
  const addTokens = async (amount) => {
    try {
      if (!currentUser) throw new Error("No authenticated user");
      
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        studyTokens: increment(amount)
      });
      
      // Update local state
      setUserProfile(prev => ({
        ...prev, 
        studyTokens: (prev.studyTokens || 0) + amount
      }));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Effect to handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile when authenticated
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      setInitialized(true);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Context value
  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    initialized,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    addTokens,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;