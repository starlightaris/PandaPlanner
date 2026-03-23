import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function testWrite() {
  await addDoc(collection(db, "testCollection"), {
    message: "Firebase connected successfully"
  });
}