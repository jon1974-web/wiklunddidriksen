import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBlsfPOb2WcY_SQp3HgLuoOEJLtBllJxS8",
  authDomain: "familiesenter-837bb.firebaseapp.com",
  projectId: "familiesenter-837bb",
  storageBucket: "familiesenter-837bb.firebasestorage.app",
  messagingSenderId: "146555872592",
  appId: "1:146555872592:web:c16cd0d2eb179c21d17855"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
