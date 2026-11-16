import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithGoogle, 
  signOutFromGoogle, 
  onAuthUserChanged,
  isFirebaseConfigured
} from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map Firebase Auth user object to standardized app user object
  const mapFirebaseUser = (firebaseUser) => {
    if (!firebaseUser) return null;
    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Google User',
      fullName: firebaseUser.displayName || 'Google User',
      userName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email,
      picture: firebaseUser.photoURL,
      avatarUrl: firebaseUser.photoURL,
      isGoogleUser: true
    };
  };

  useEffect(() => {
    // Purge any legacy unauthenticated guest download history keys from localStorage
    try {
      localStorage.removeItem('app_download_history');
      localStorage.removeItem('download_history');
    } catch (e) {}

    // Subscribe to Firebase Authentication state changes
    const unsubscribe = onAuthUserChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const firebaseUser = await signInWithGoogle();
      const mapped = mapFirebaseUser(firebaseUser);
      setUser(mapped);
      return { success: true, user: mapped };
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOutFromGoogle();
    } catch (err) {
      console.error('Firebase Sign-Out error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        setUser, 
        loading, 
        loginWithGoogle, 
        logout,
        isConfigured: isFirebaseConfigured()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
