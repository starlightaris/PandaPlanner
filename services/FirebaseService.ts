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
import { auth, db } from '../firebaseConfig';

export interface PlannerEvent {
  id?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: string;
  source?: "AI_Scan" | "Manual" | "Google_Sync";
}

export interface PlannerReminder {
  id?: string;
  title: string;
  location?: string;
  reminderTime: Date;
  isCompleted: boolean;
  category?: string;
}

class FirebaseService {
  // --- AUTH METHODS ---

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

  async logIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', credential.user.uid);
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
    return credential.user;
  }

  async loginWithGoogle(idToken: string): Promise<User> {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
      provider: 'google.com',
    }, { merge: true });
    return user;
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  // --- FIRESTORE METHODS ---

  async checkConflict(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const existingEvents = await this.getUserEvents();
      return existingEvents.some(event => {
        const existingStart = new Date(event.startTime);
        const existingEnd = new Date(event.endTime);
        return (startTime < existingEnd && endTime > existingStart);
      });
    } catch (error) {
      console.error("Conflict Check Error:", error);
      return false;
    }
  }

  // SAVING METHODS
  async saveEvent(eventData: PlannerEvent) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");
    const eventsRef = collection(db, 'users', userId, 'events');
    return await addDoc(eventsRef, {
      ...eventData,
      startTime: Timestamp.fromDate(eventData.startTime),
      endTime: Timestamp.fromDate(eventData.endTime),
      createdAt: serverTimestamp()
    });
  }

  async saveReminder(reminderData: PlannerReminder) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");
    const remindersRef = collection(db, 'users', userId, 'reminders');
    return await addDoc(remindersRef, {
      ...reminderData,
      reminderTime: Timestamp.fromDate(reminderData.reminderTime),
      createdAt: serverTimestamp()
    });
  }

  // FETCHING METHODS
  async getUserEvents(): Promise<PlannerEvent[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'events'), orderBy('startTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: (doc.data().startTime as Timestamp).toDate(),
      endTime: (doc.data().endTime as Timestamp).toDate(),
    })) as PlannerEvent[];
  }

  async getUserReminders(): Promise<PlannerReminder[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'reminders'), orderBy('reminderTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      reminderTime: (doc.data().reminderTime as Timestamp).toDate(),
    })) as PlannerReminder[];
  }

  // DELETION & UPDATES
  async deleteItem(id: string, type: 'events' | 'reminders') {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");
    return await deleteDoc(doc(db, 'users', userId, type, id));
  }

  async saveTodo(userId: string, todo: any) {
    const colRef = collection(db, "users", userId, "todos");
    return await addDoc(colRef, { ...todo, createdAt: new Date().toISOString() });
  }

  async getTodos(userId: string) {
    const colRef = collection(db, "users", userId, "todos");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateTodoStatus(userId: string, todoId: string, done: boolean) {
    const docRef = doc(db, "users", userId, "todos", todoId);
    return await updateDoc(docRef, { done });
  }

  async removeTodo(userId: string, todoId: string) {
    const docRef = doc(db, "users", userId, "todos", todoId);
    return await deleteDoc(docRef);
  }
}

export default new FirebaseService();