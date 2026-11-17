
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Sanitizes environment variable strings by stripping surrounding whitespace and quotes
 */
const sanitizeEnv = (val) => {
  if (!val) return '';
  return String(val).trim().replace(/^["']|["']$/g, '').trim();
};

const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: sanitizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID)
};

export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0
      ? getApp()
      : initializeApp(firebaseConfig);

    auth = getAuth(app);
    db = getFirestore(app);

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Firebase persistence error:', error);
    });

  } catch (error) {
    console.error('Firebase initialization failed:', error);
    app = null;
    auth = null;
    db = null;
    googleProvider = null;
  }
}

export { app, auth, db };

/**
 * Google Sign-In with popup.
 * Invoked synchronously within the click handler to preserve the user gesture
 * and prevent browser popup blockers from redirecting to broken handler endpoints.
 */
export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured() || !auth || !googleProvider) {
    throw new Error('Firebase configuration is missing or incomplete in environment variables.');
  }

  const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  return result.user;
};

/**
 * Google Sign-Out
 */
export const signOutFromGoogle = async () => {
  if (auth) {
    await signOut(auth);
  }
};

/**
 * Listen for authentication changes
 */
export const onAuthUserChanged = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

export default app;
