// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyBtlEhZqMaYoGQ2CIKU9CGTmo1L-X1F2RU",
  authDomain: "studydao-c9ecf.firebaseapp.com",
  projectId: "studydao-c9ecf",
  storageBucket: "studydao-c9ecf.firebasestorage.app",
  messagingSenderId: "531749699644",
  appId: "1:531749699644:web:b0f8fd99c37cfbdaa80339",
  measurementId: "G-XR72T9PBYX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };