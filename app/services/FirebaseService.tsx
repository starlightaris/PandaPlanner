import { 
  addDoc, 
  collection, 
  getDocs, 
  query, 
  Timestamp, 
  orderBy 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from '../../firebaseConfig';

// Define an interface for your Event data
export interface PlannerEvent {
  id?: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  location?: string;
  category?: string;
  source?: "AI_Scan" | "Manual" | "Google_Sync";
}

class FirebaseService {
  /**
   * AUTHENTICATION
   */
  async signUp(email: string, password: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async logIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  /**
   * FIRESTORE OPERATIONS
   */
  async saveEvent(eventData: PlannerEvent) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");

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

  async getUserEvents() {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    try {
      const q = query(
        collection(db, 'users', userId, 'schedules'),
        orderBy('startTime', 'asc') // Helpful for calendar views
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as PlannerEvent[];
    } catch (error) {
      console.error("Firestore Fetch Error: ", error);
      return [];
    }
  }
}

export default new FirebaseService();