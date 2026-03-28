import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { ParsedEvent } from './AIService';

// We'll use this interface for general app usage
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
   * These methods fulfill the "Register/Login" requirements in your Use-Case Diagram.
   */
  async signUp(email: string, password: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async logIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async loginWithGoogle(idToken: string) {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (error) {
      console.error("Google Auth Error:", error);
      throw error;
    }
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  /**
   * FIRESTORE OPERATIONS
   * Handles the "Storage" stage of your Data Management plan.
   */
  async saveEvent(eventData: ParsedEvent | PlannerEvent) {
    // Automatically gets the ID from the currently logged-in user
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

  /**
   * Fetches events for the "View/Edit Schedule" and "Detect Conflicts" features.
   */
  async getUserEvents(): Promise<PlannerEvent[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    try {
      const q = query(
        collection(db, 'users', userId, 'schedules'),
        orderBy('startTime', 'asc') // Essential for your "Universal Timeline" view
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