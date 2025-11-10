// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // <--- NEW IMPORT

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const storage = getStorage(app); // <--- INITIALIZE STORAGE

export { auth, db, storage }; // <--- EXPORT STORAGE