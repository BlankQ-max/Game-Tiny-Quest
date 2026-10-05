import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Only logged-in players may see the loading screen.
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
});
