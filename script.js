import { auth } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// LOGIN -> loading screen -> game
window.login = function () {
    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter your email and password.");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { window.location.href = "loading.html"; })
        .catch((error) => alert("Login failed: " + error.message));
};

// CREATE ACCOUNT
window.createAccount = function () {
    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!username || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
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

    createUserWithEmailAndPassword(auth, email, password)
        .then((cred) => updateProfile(cred.user, { displayName: username }))
        .then(() => {
            window.location.href = "loading.html";   // already signed in
        })
        .catch((error) => alert("Error: " + error.message));
};

window.goToRegister = function () {
    window.location.href = "register.html";
};


// FORGOT PASSWORD
window.forgotPassword = function () {
    const email = (document.getElementById("username").value || "").trim() ||
        prompt("Enter your account email:");
    if (!email) return;
    sendPasswordResetEmail(auth, email)
        .then(() => alert("Password reset email sent to " + email + "."))
        .catch((error) => alert("Could not send reset email: " + error.message));
};

// ENTER KEY submits the form
document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (document.getElementById("confirmPassword")) window.createAccount();
    else if (document.getElementById("password")) window.login();
});
