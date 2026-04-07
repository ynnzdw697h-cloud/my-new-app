import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDBFhBqXF-SLcUuJV68-B-JsEzAr_Td-uw",
  authDomain: "acadia-kitchen.firebaseapp.com",
  projectId: "acadia-kitchen",
  storageBucket: "acadia-kitchen.firebasestorage.app",
  messagingSenderId: "56324998421",
  appId: "1:56324998421:web:7cb1841bf7a6f47e80551c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
