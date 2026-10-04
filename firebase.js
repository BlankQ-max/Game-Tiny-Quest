import { initializeApp } 
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } 
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } 
from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBH2etntN6FcE9i0nBgusEuT3B4GPjgiDc",
  authDomain: "tiny-quest-2d3a8.firebaseapp.com",
  projectId: "tiny-quest-2d3a8",
  storageBucket: "tiny-quest-2d3a8.firebasestorage.app",
  messagingSenderId: "745974169104",
  appId: "1:745974169104:web:73d33cc7d6a0ac174f1495",
  measurementId: "G-BQZBQP58Z0"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


export { auth, db };