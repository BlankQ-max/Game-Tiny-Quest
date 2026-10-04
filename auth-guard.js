import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

let uid = null;

// Cloud save: Firestore document saves/{uid}. If Firestore is unavailable
// (rules, offline), the game still works using this device's local save.
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

window.tqCloud = {
    save(data) {
        if (!uid) return;
        // The game stores a plain JSON object; stringify so Firestore accepts nested arrays.
        setDoc(doc(db, "saves", uid), { data: data ? JSON.stringify(data) : null })
            .catch((e) => console.warn("Cloud save failed:", e.message));
    }
};

window.tqLogout = () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";   // not logged in
        return;
    }
    uid = user.uid;

    let cloud;   // undefined = couldn't reach cloud, keep local save
    try {
        const snap = await Promise.race([getDoc(doc(db, "saves", uid)), timeout(4000)]);
        if (snap.exists()) {
            const raw = snap.data().data;
            cloud = raw ? JSON.parse(raw) : null;
        }
    } catch (e) {
        console.warn("Cloud load skipped:", e.message);
    }

    window.startTinyQuest(user.displayName || user.email.split("@")[0], uid, cloud);
});
