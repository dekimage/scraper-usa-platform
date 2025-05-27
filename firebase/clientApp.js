import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configurations
const firebaseConfig = {
  apiKey: "AIzaSyCBVd2JShDZ6QKvFuN6vXOapPKKgSMR24I",
  authDomain: "scraper-usa-platform.firebaseapp.com",
  projectId: "scraper-usa-platform",
  storageBucket: "scraper-usa-platform.firebasestorage.app",
  messagingSenderId: "562562659821",
  appId: "1:562562659821:web:d06bb4f6927b380b9ee3e4",
  measurementId: "G-MVH3D4S2DB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
