import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth"; // 1. Import Auth types
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVCksObhzL-nTyVffhxuEM2OtM7mjYrGU",
  authDomain: "pandaplanner-21f94.firebaseapp.com",
  projectId: "pandaplanner-21f94",
  storageBucket: "pandaplanner-21f94.firebasestorage.app",
  messagingSenderId: "1015755840124",
  appId: "1:1015755840124:web:da42451b69fa662fa907f9"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// 2. Initialize and export Auth
export const auth: Auth = getAuth(app);

// Export the database instance
export const db: Firestore = getFirestore(app);