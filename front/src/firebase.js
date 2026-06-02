// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, browserSessionPersistence } from 'firebase/auth'
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration pulling securely from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app)

// This configuration forces the browser to discard the auth tokens 
// the absolute millisecond the tab or browser window is closed.
auth.setPersistence(browserSessionPersistence)
  .then(() => {
    console.log("Session token persistence mutated to Tab/Window bounds successfully.")
  })
  .catch((error) => {
    console.error("Auth persistence configuration failed:", error)
  })

// Initialize Firebase services
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { db, auth, provider, storage };