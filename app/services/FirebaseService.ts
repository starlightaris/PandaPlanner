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

export { auth };

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
  // AUTH METHODS
  async signUp(email: string, password: string): Promise<User> {
    // 1. Create the Auth record
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // 2. Create the User Profile in Firestore
    // We use setDoc with doc(db, 'users', user.uid) to ensure the 
    // Document ID matches the Authentication UID.
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    return user;
  }

  async logIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Optional: Update last login timestamp in Firestore
    const userRef = doc(db, 'users', credential.user.uid);
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
    
    return credential.user;
  }

  async loginWithGoogle(idToken: string) {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    
    // Ensure Firestore document exists for Google users too
    await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        createdAt: serverTimestamp(),
    }, { merge: true }); // 'merge' prevents overwriting existing data

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