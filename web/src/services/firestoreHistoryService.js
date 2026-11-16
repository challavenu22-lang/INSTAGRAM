import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export const firestoreHistoryService = {
  /**
   * Fetch all saved history items for a specific user from Firestore
   * @param {string} userId - Firebase authenticated User UID
   * @returns {Promise<Array>} List of history items
   */
  getUserHistory: async (userId) => {
    if (!userId || !isFirebaseConfigured()) {
      return [];
    }

    try {
      const historyColRef = collection(db, 'users', userId, 'history');
      const q = query(historyColRef, orderBy('downloadedAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    } catch (err) {
      console.error('Error fetching user history from Firestore:', err);
      // Fallback: Attempt fetch without ordering if index is still building
      try {
        const historyColRef = collection(db, 'users', userId, 'history');
        const snapshot = await getDocs(historyColRef);
        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        return items.sort((a, b) => new Date(b.downloadedAt || 0) - new Date(a.downloadedAt || 0));
      } catch (fallbackErr) {
        console.error('Fallback fetch error:', fallbackErr);
        return [];
      }
    }
  },

  /**
   * Save a completed download to Firestore under the user's private collection
   * @param {string} userId - Firebase authenticated User UID
   * @param {Object} item - Download history payload
   */
  saveHistoryItem: async (userId, item) => {
    // CRITICAL: Never save download history in Guest Mode (when userId is missing)
    if (!userId || !isFirebaseConfigured() || !item) {
      return null;
    }

    const docId = String(item.id || Date.now());
    const docRef = doc(db, 'users', userId, 'history', docId);

    const historyData = {
      id: docId,
      title: item.title || 'Instagram Video',
      sourceUrl: item.sourceUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      status: item.status || 'Completed',
      downloadedAt: item.downloadedAt || new Date().toISOString()
    };

    try {
      await setDoc(docRef, historyData, { merge: true });
      return historyData;
    } catch (err) {
      console.error('Error saving history item to Firestore:', err);
      return historyData;
    }
  },

  /**
   * Delete a single history item for a user from Firestore
   * @param {string} userId - Firebase authenticated User UID
   * @param {string} itemId - Item ID to delete
   */
  deleteHistoryItem: async (userId, itemId) => {
    if (!userId || !isFirebaseConfigured() || !itemId) {
      return;
    }

    try {
      const docRef = doc(db, 'users', userId, 'history', String(itemId));
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting history item from Firestore:', err);
    }
  },

  /**
   * Clear all download history for a user from Firestore
   * @param {string} userId - Firebase authenticated User UID
   */
  clearUserHistory: async (userId) => {
    if (!userId || !isFirebaseConfigured()) {
      return;
    }

    try {
      const historyColRef = collection(db, 'users', userId, 'history');
      const snapshot = await getDocs(historyColRef);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error('Error clearing history from Firestore:', err);
    }
  }
};
