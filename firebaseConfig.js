import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVCksObhzL-nTyVffhxuEM2OtM7mjYrGU",
  authDomain: "pandaplanner-21f94.firebaseapp.com",
  projectId: "pandaplanner-21f94",
  storageBucket: "pandaplanner-21f94.firebasestorage.app",
  messagingSenderId: "1015755840124",
  appId: "1:1015755840124:web:da42451b69fa662fa907f9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database instance to use in your Services
export const db = getFirestore(app);