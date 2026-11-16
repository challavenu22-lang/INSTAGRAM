import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Client Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId
  );
};

// Initialize or reuse existing Firebase App instance
const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Ensure local persistence for persistent sessions
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (e) {}

/**
 * Sign in using Firebase Google Authentication popup
 */
export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase credentials are not configured in .env. Please provide VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID.'
    );
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

/**
 * Sign out from Firebase Authentication
 */
export const signOutFromGoogle = async () => {
  await signOut(auth);
};

/**
 * Subscribe to Firebase Auth state changes
 */
export const onAuthUserChanged = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
