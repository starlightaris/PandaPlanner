import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth"; // 1. Import Auth types
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
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