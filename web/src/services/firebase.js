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
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim()
};

/**
 * Checks whether valid Firebase credentials have been configured
 */
export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId
  );
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

// Only initialize Firebase when configuration is provided to prevent crashes in Guest Mode
if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      setPersistence(auth, browserLocalPersistence).catch(() => {});
    } catch (e) {}
  } catch (err) {
    console.warn('Firebase initialization failed (running in Guest Mode):', err);
    app = null;
    auth = null;
    db = null;
    googleProvider = null;
  }
}

export { app, auth, db };

/**
 * Sign in using Firebase Google Authentication popup
 */
export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured() || !auth || !googleProvider) {
    throw new Error(
      'Firebase is not configured. Please add your Firebase credentials (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID) in web/.env to use Google Sign-In.'
    );
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

/**
 * Sign out from Firebase Authentication
 */
export const signOutFromGoogle = async () => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
  }
};

/**
 * Subscribe to Firebase Auth state changes
 */
export const onAuthUserChanged = (callback) => {
  if (!isFirebaseConfigured() || !auth) {
    // If Firebase is not configured, inform listener that user is null (Guest Mode)
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export default app;
