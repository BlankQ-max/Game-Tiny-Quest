import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/* ------------------------------------------------------------------
   Usernames
   Firebase logs people in with an email, so each username is stored as
   a small document  usernames/{username-in-lowercase} = { uid, email, name }.
   Logging in with a username looks up that document to find the email.
------------------------------------------------------------------ */
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function friendly(error) {
    const code = (error && error.code) || "";
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
        return "Wrong username/email or password.";
    if (code.includes("invalid-email")) return "That doesn't look like a valid email. Type your email, or just your username.";
    if (code.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
    if (code.includes("email-already-in-use")) return "That email already has an account. Try logging in instead.";
    if (code.includes("weak-password")) return "Password must be at least 6 characters.";
    return (error && error.message) || String(error);
}

// "Kai" or "kai@mail.com"  ->  the email to sign in with
async function emailFor(identifier) {
    const id = identifier.trim();
    if (id.includes("@")) return id;
    let snap;
    try {
        snap = await getDoc(doc(db, "usernames", id.toLowerCase()));
    } catch (e) {
        throw new Error("Logging in with a username needs the new Firestore rules (see firestore.rules). " +
                        "For now, log in with your email instead.");
    }
    if (!snap.exists()) throw new Error("No account has the username \"" + id + "\". Check the spelling, or log in with your email.");
    return snap.data().email;
}

// Old accounts (made before usernames existed) get their username registered the next time they log in.
async function claimUsername(user) {
    const name = user.displayName;
    if (!name || !USERNAME_RE.test(name)) return;
    try {
        await setDoc(doc(db, "usernames", name.toLowerCase()), { uid: user.uid, email: user.email, name });
    } catch (e) { /* already registered (by this account) or rules not published yet: fine */ }
}

/* ---------------- LOGIN ---------------- */
window.login = async function () {
    const identifier = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (identifier.trim() === "" || password === "") {
        alert("Please enter your email or username, and your password.");
        return;
    }
    try {
        const email = await emailFor(identifier);
        const cred = await signInWithEmailAndPassword(auth, email, password);
        claimUsername(cred.user);                       // don't wait for it
        window.location.href = "loading.html";
    } catch (error) {
        alert("Login failed: " + friendly(error));
    }
};

/* ---------------- CREATE ACCOUNT ---------------- */
window.createAccount = async function () {
    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!username || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }
    if (!USERNAME_RE.test(username)) {
        alert("Username must be 3–20 characters: letters, numbers or underscore (no spaces or @).");
        return;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        // is the username free?
        try {
            const taken = await getDoc(doc(db, "usernames", username.toLowerCase()));
            if (taken.exists()) { alert("That username is already taken. Please pick another."); return; }
        } catch (e) { /* rules not published yet: continue, the account still works with email */ }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        try {
            await setDoc(doc(db, "usernames", username.toLowerCase()), { uid: cred.user.uid, email, name: username });
        } catch (e) {
            // someone claimed it a moment ago (or rules missing)
            if (e && /permission|already/i.test(e.code + " " + e.message)) {
                const again = await getDoc(doc(db, "usernames", username.toLowerCase())).catch(() => null);
                if (again && again.exists() && again.data().uid !== cred.user.uid) {
                    await deleteUser(cred.user).catch(() => {});
                    alert("That username was just taken. Please pick another.");
                    return;
                }
            }
        }
        window.location.href = "loading.html";            // already signed in
    } catch (error) {
        alert("Error: " + friendly(error));
    }
};

window.goToRegister = function () {
    window.location.href = "register.html";
};

/* ---------------- FORGOT PASSWORD ---------------- */
window.forgotPassword = async function () {
    const typed = (document.getElementById("username").value || "").trim() ||
        (prompt("Enter your email or username:") || "").trim();
    if (!typed) return;
    try {
        const email = await emailFor(typed);
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent to " + email + ".");
    } catch (error) {
        alert("Could not send reset email: " + friendly(error));
    }
};

/* ENTER key submits the form */
document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (document.getElementById("confirmPassword")) window.createAccount();
    else if (document.getElementById("password")) window.login();
});
