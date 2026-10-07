import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { createSaver } from "./cloud-save.js";

let uid = null;

// ---- visible save status (bottom of the game page) ----
function status(kind, err) {
    const el = document.getElementById("cloud");
    if (!el) return;
    const code = err && (err.code || err.message) || "";
    if (kind === "saving") el.textContent = "☁ Saving…";
    else if (kind === "ok") el.textContent = "☁ Progress saved to your account · " + new Date().toLocaleTimeString();
    else if (kind === "loaded") el.textContent = "☁ Connected to your account";
    else if (/permission/i.test(code))
        el.textContent = "⚠ Cloud save blocked by your Firestore rules. Progress is only saved on this device. (See firestore.rules)";
    else if (/not.?found|does not exist/i.test(code))
        el.textContent = "⚠ Firestore database not created yet. Create it in the Firebase console. Progress is only saved on this device.";
    else
        el.textContent = "⚠ Cloud save problem (" + code + "). Progress is saved on this device and will retry.";
}

// ---- saving: at most one write every ~1.5s, retried on failure ----
const saver = createSaver({
    write: (data) => setDoc(doc(db, "saves", uid), {
        data: data ? JSON.stringify(data) : null,   // stringify: Firestore rejects nested arrays
        updatedAt: Date.now()
    }),
    onStatus: status
});

window.tqCloud = {
    save(data, now) {
        if (!uid) return;
        saver.save(data);
        if (now) saver.flush();      // important moments: save immediately
    }
};

// don't lose the last few seconds when leaving
window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saver.flush();
});
window.addEventListener("pagehide", () => { saver.flush(); });

window.tqLogout = () => {
    Promise.resolve(saver.flush()).finally(() => {
        signOut(auth).then(() => { window.location.href = "index.html"; });
    });
};

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";   // not logged in
        return;
    }
    uid = user.uid;

    // cloud: undefined = couldn't read it, null = nothing saved yet, object = the saved game
    let cloud;
    try {
        const snap = await Promise.race([getDoc(doc(db, "saves", uid)), timeout(8000)]);
        const raw = snap.exists() ? snap.data().data : null;
        cloud = raw ? JSON.parse(raw) : null;
        status("loaded");
    } catch (e) {
        console.warn("Cloud load skipped:", e.message);
        status("error", e);
    }

    window.startTinyQuest(user.displayName || user.email.split("@")[0], uid, cloud);
});
