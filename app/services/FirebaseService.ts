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

export interface PandaReminder {
  id?: string;
  title: string;
  location?: string;
  reminderTime: Date;
  isCompleted: boolean;
  category: string;
}

class FirebaseService {
  // AUTH METHODS
  async signUp(email: string, password: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async logIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async loginWithGoogle(idToken: string) {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  // FIRESTORE METHODS
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
    
    return await updateDoc(eventRef, { ...formattedData, updatedAt: serverTimestamp() });
  }

  async getUserEvents(): Promise<PlannerEvent[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    
    const q = query(collection(db, 'users', userId, 'schedules'), orderBy('startTime', 'asc'));
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