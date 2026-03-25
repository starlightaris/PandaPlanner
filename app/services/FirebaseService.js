import { addDoc, collection, getDocs, query, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

class FirebaseService {
  /**
   * Saves a finalized event to the user's sub-collection
   * @param {string} userId - The unique Firebase UID
   * @param {object} eventData - JSON from Gemini or Manual input
   */
  async saveEvent(userId, eventData) {
    try {
      const scheduleRef = collection(db, 'users', userId, 'schedules');
      
      const docRef = await addDoc(scheduleRef, {
        title: eventData.title,
        startTime: Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: Timestamp.fromDate(new Date(eventData.endTime)),
        location: eventData.location || "Not Specified",
        category: eventData.category || "General",
        source: eventData.source || "AI_Scan",
        isConflictResolved: true,
        createdAt: Timestamp.now()
      });

      return docRef.id;
    } catch (error) {
      console.error("Firestore Save Error: ", error);
      throw error;
    }
  }

  /**
   * Fetches events for conflict detection logic
   */
  async getUserEvents(userId) {
    const q = query(collection(db, 'users', userId, 'schedules'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

export default new FirebaseService();