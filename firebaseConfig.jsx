// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; 

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAk8Iho_vtSkggXjA1AQt8_MOx4z-K_0pM",
    authDomain: "asr-system-7744a.firebaseapp.com",
    projectId: "asr-system-7744a",
    storageBucket: "asr-system-7744a.firebasestorage.app",
    messagingSenderId: "448438456592",
    appId: "1:448438456592:web:a49f4f80b227ef9e2bd595",
    measurementId: "G-K7408M5QC2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); 

// Export the initialized services
export { auth, db, storage };