import { addDoc, collection, DocumentData, getDocs, query, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ParsedEvent } from './AIService';

class FirebaseService {
  /**
   * Saves a finalized event to the user's sub-collection
   */
  async saveEvent(userId: string, eventData: ParsedEvent): Promise<string> {
    try {
      const scheduleRef = collection(db, 'users', userId, 'schedules');
      
      const docRef = await addDoc(scheduleRef, {
        title: eventData.title,
        // Convert ISO strings back to Firestore Timestamps
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
  async getUserEvents(userId: string): Promise<DocumentData[]> {
    const q = query(collection(db, 'users', userId, 'schedules'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

export default new FirebaseService();