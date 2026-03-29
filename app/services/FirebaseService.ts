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
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export interface PlannerEvent {
  id?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: string;
  source?: "AI_Scan" | "Manual" | "Google_Sync";
}

class FirebaseService {
  // --- AUTH METHODS ---

  /**
   * Standard Email/Password Signup
   * Creates Auth record AND initializes Firestore document
   */
  async signUp(email: string, password: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      provider: 'password'
    });

    return user;
  }

  /**
   * Standard Email/Password Login
   * Updates the lastLogin timestamp in Firestore
   */
  async logIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', credential.user.uid);
    
    await updateDoc(userRef, { 
      lastLogin: serverTimestamp() 
    });
    
    return credential.user;
  }

  /**
   * Google Authentication
   * Handles first-time account creation AND returning user sync
   */
  async loginWithGoogle(idToken: string): Promise<User> {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;
    
    // Using { merge: true } to create if missing, or update if exists
    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName, // Personalized greeting for the UI
        photoURL: user.photoURL,       // Profile picture sync
        lastLogin: serverTimestamp(),
        provider: 'google.com',
    }, { merge: true });

    return user;
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  // --- FIRESTORE METHODS ---

  /**
   * Saves an event to the user's private schedule sub-collection
   */
  async saveEvent(eventData: PlannerEvent) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");

    const scheduleRef = collection(db, 'users', userId, 'schedules');
    return await addDoc(scheduleRef, {
      ...eventData,
      startTime: Timestamp.fromDate(eventData.startTime),
      endTime: Timestamp.fromDate(eventData.endTime),
      createdAt: serverTimestamp()
    });
  }

  async deleteEvent(eventId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");
    const eventRef = doc(db, 'users', userId, 'schedules', eventId);
    return await deleteDoc(eventRef);
  }

  async updateEvent(eventId: string, updatedData: Partial<PlannerEvent>) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");
    const eventRef = doc(db, 'users', userId, 'schedules', eventId);
    
    const formattedData: any = { ...updatedData };
    if (updatedData.startTime) formattedData.startTime = Timestamp.fromDate(updatedData.startTime);
    if (updatedData.endTime) formattedData.endTime = Timestamp.fromDate(updatedData.endTime);
    
    return await updateDoc(eventRef, { 
      ...formattedData, 
      updatedAt: serverTimestamp() 
    });
  }

  /**
   * Fetches all events for the current user, sorted by start time
   */
  async getUserEvents(): Promise<PlannerEvent[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    
    const q = query(
      collection(db, 'users', userId, 'schedules'), 
      orderBy('startTime', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      startTime: (doc.data().startTime as Timestamp).toDate(),
      endTime: (doc.data().endTime as Timestamp).toDate(),
    })) as PlannerEvent[];
  }
}

export default new FirebaseService();