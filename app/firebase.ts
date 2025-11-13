// app/firebase.ts
import { getFirestore } from "firebase/firestore/lite";
import { app } from "@/lib/firebase-client";

export const db = getFirestore(app);






