import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { GoogleService } from './GoogleService';

export { auth };

export interface PlannerEvent {
  id?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: string;
  source?: "AI_Scan" | "Manual" | "Google_Sync";
  googleEventId?: string;
  isSyncedWithGoogle?: boolean;
}
export interface PlannerTask {
  id?: string;
  title: string;
  dueDate?: Date;
  priority: 'Low' | 'Medium' | 'High';
  isCompleted: boolean;
  createdAt?: any;
}

export interface PlannerReminder {
  id?: string;
  title: string;
  triggerTime: Date;
  isNotified: boolean;
  category: 'General' | 'Home' | 'Work' | 'Personal';
  repeat?: 'Daily' | 'Weekly' | 'None';
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

    const userRef = doc(db, 'users', user.uid);

    // Check if user doc already exists (returning user vs new user)
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // New Google user — create full document like signUp does
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        provider: 'google.com',
      });
    } else {
      // Returning user — just update lastLogin
      await updateDoc(userRef, { lastLogin: serverTimestamp() });
    }
    return user;
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  // --- FIRESTORE METHODS ---

  async getConflictingEvents(startTime: Date, endTime: Date): Promise<PlannerEvent[]> {
    try {
      const existingEvents = await this.getUserEvents();
      return existingEvents.filter(event => {
        const existingStart = new Date(event.startTime);
        const existingEnd = new Date(event.endTime);
        return startTime < existingEnd && endTime > existingStart;
      });
    } catch (error) {
      console.error("Conflict Check Error:", error);
      return [];
    }
  }

  // Keep the old one working by using the new one
  async checkConflict(startTime: Date, endTime: Date): Promise<boolean> {
    const conflicts = await this.getConflictingEvents(startTime, endTime);
    return conflicts.length > 0;
  }

   // --- GENERIC HELPER FOR ADDS ---

   private async addToCollection(collectionName: 'schedules' | 'tasks' | 'reminders', data: any) {
     const user = auth.currentUser;
     if (!user) throw new Error("No authenticated user");

     // Convert any Dates to Firestore Timestamps before saving
     const formattedData = { ...data };
     Object.keys(formattedData).forEach(key => {
       if (formattedData[key] instanceof Date) {
         formattedData[key] = Timestamp.fromDate(formattedData[key]);
       }
     });

     const docRef = await addDoc(collection(db, 'users', user.uid, collectionName), {
       ...formattedData,
       userId: user.uid,
       createdAt: serverTimestamp(),
     });
     return docRef.id;
   }

   // --- PUBLIC DATA METHODS ---

 async addEvent(eventData: PlannerEvent, syncToGoogle: boolean = false, accessToken?: string) {
    // 1. Initial save to Firestore
    const eventId = await this.addToCollection('schedules', eventData);

    if (syncToGoogle) {
      if (!accessToken) {
        // If user wants to sync but has no token, save the preference to sync "later"
        await this.updateEventSyncPreference(eventId, 'pending_authorization');
        return eventId; // Return ID but logic in component handles the "GOOGLE_AUTH_REQUIRED" alert
      }

      try {
        const googleResult = await GoogleService.saveEvent(eventData, accessToken);
        // 2. Update Firebase with the Google ID so they stay linked
        if (googleResult && googleResult.id) {
            await this.updateEventSyncStatus(eventId, googleResult.id);
        }
      } catch (e) {
        console.error("Google Sync failed", e);
      }
    }
    return eventId;
  }

  async addTask(taskData: PlannerTask) {
    return await this.addToCollection('tasks', taskData);
  }

  async addReminder(reminderData: PlannerReminder) {
    return await this.addToCollection('reminders', reminderData);
  }

  // --- SYNC HELPERS ---

  /**
   * Updates an event with its Google Calendar ID and sets sync status to true.
   */
  async updateEventSyncStatus(eventId: string, googleEventId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const eventRef = doc(db, 'users', userId, 'schedules', eventId);
    return await updateDoc(eventRef, {
      googleEventId: googleEventId,
      isSyncedWithGoogle: true,
      lastSyncedAt: serverTimestamp()
    });
  }

  /**
   * Updates the sync preference for an event (e.g., if authorization is needed later).
   */
  async updateEventSyncPreference(eventId: string, status: 'pending_authorization' | 'failed' | 'synced') {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const eventRef = doc(db, 'users', userId, 'schedules', eventId);
    return await updateDoc(eventRef, {
      syncStatus: status
    });
  }

  // SAVING METHODS


  async deleteEvent(id: string) {
    return await this.deleteItem(id, 'events');
  }

    // --- FETCH METHODS ---

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

    async getUserTasks(): Promise<PlannerTask[]> {
      const userId = auth.currentUser?.uid;
      if (!userId) return [];
      const q = query(collection(db, 'users', userId, 'tasks'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate ? (doc.data().dueDate as Timestamp).toDate() : undefined,
      })) as PlannerTask[];
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