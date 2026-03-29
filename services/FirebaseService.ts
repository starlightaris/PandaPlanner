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

  // AUTH 

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
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
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
      await updateDoc(userRef, { lastLogin: serverTimestamp() });
    }
    return user;
  }

  async logOut(): Promise<void> {
    await signOut(auth);
  }

  // GENERIC HELPER 

  private async addToCollection(collectionName: 'schedules' | 'tasks' | 'reminders', data: any) {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

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

  // EVENTS 

  async addEvent(eventData: PlannerEvent, syncToGoogle: boolean = false, accessToken?: string) {
    const eventId = await this.addToCollection('schedules', eventData);

    if (syncToGoogle) {
      if (!accessToken) {
        await this.updateEventSyncPreference(eventId, 'pending_authorization');
        return eventId;
      }
      try {
        const googleResult = await GoogleService.saveEvent(eventData, accessToken);
        if (googleResult && googleResult.id) {
          await this.updateEventSyncStatus(eventId, googleResult.id);
        }
      } catch (e) {
        console.error("Google Sync failed", e);
      }
    }
    return eventId;
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

  async deleteEvent(id: string) {
    return await this.deleteItem(id, 'reminders'); // use deleteItem with correct collection
  }

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

  async checkConflict(startTime: Date, endTime: Date): Promise<boolean> {
    const conflicts = await this.getConflictingEvents(startTime, endTime);
    return conflicts.length > 0;
  }

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

  async updateEventSyncPreference(eventId: string, status: 'pending_authorization' | 'failed' | 'synced') {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const eventRef = doc(db, 'users', userId, 'schedules', eventId);
    return await updateDoc(eventRef, { syncStatus: status });
  }

  // TASKS & REMINDERS

  async addTask(taskData: PlannerTask) {
    return await this.addToCollection('tasks', taskData);
  }

  async addReminder(reminderData: PlannerReminder) {
    return await this.addToCollection('reminders', reminderData);
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

  async getUserReminders(): Promise<PlannerReminder[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(collection(db, 'users', userId, 'reminders'), orderBy('triggerTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      triggerTime: (doc.data().triggerTime as Timestamp).toDate(),
    })) as PlannerReminder[];
  }

  async updateReminderStatus(reminderId: string, isNotified: boolean) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const ref = doc(db, 'users', userId, 'reminders', reminderId);
    return await updateDoc(ref, { isNotified });
  }

  async deleteItem(id: string, type: 'events' | 'reminders') {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("No authenticated user found");
    return await deleteDoc(doc(db, 'users', userId, type, id));
  }

  // TODOS

  async getTodos(userId: string) {
    const colRef = collection(db, "users", userId, "todos");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async saveTodo(userId: string, todo: any) {
    const colRef = collection(db, "users", userId, "todos");
    return await addDoc(colRef, { ...todo, createdAt: new Date().toISOString() });
  }

  async updateTodoStatus(userId: string, todoId: string, done: boolean) {
    const docRef = doc(db, "users", userId, "todos", todoId);
    return await updateDoc(docRef, { done });
  }

  async updateTodoTitle(userId: string, todoId: string, title: string) {
    const docRef = doc(db, "users", userId, "todos", todoId);
    return await updateDoc(docRef, { title });
  }

  async removeTodo(userId: string, todoId: string) {
    const docRef = doc(db, "users", userId, "todos", todoId);
    return await deleteDoc(docRef);
  }
}

export default new FirebaseService();