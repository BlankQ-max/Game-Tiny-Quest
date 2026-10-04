let progress = 0;

const progressBar =
    document.getElementById("loadingProgress");

const percentText =
    document.getElementById("loadingPercent");

const messageText =
    document.getElementById("loadingMessage");

const tipText =
    document.getElementById("loadingTip");


const messages = [

    "Entering the forest...",

    "Preparing Arlo's adventure...",

    "Looking for slimes...",

    "Checking your inventory...",

    "Loading your quests...",

    "Preparing the village...",

    "Sharpening Arlo's sword...",

    "Almost ready..."

];


const tips = [

    "Tip: Use the arrow keys or WASD to move Arlo.",

    "Tip: Bump into a slime to start a battle.",

    "Tip: Rest at the house to restore your HP.",

    "Tip: Slime jelly buys better swords and armor.",

    "Tip: Guard when a slime is winding up a big hit.",

    "Tip: Find the key in the Slime Caves.",

    "Tip: Defeat the Slime King to win!"

];


let messageIndex = 0;
let tipIndex = 0;


// Change messages
const messageTimer = setInterval(() => {

    messageIndex++;

    if (messageIndex >= messages.length) {
        messageIndex = messages.length - 1;
    }

    messageText.innerText =
        messages[messageIndex];

}, 800);


// Change tips
const tipTimer = setInterval(() => {

    tipIndex++;

    if (tipIndex >= tips.length) {
        tipIndex = 0;
    }

    tipText.innerText =
        tips[tipIndex];

}, 1500);


// Loading progress
const loadingTimer = setInterval(() => {

    progress += Math.floor(
        Math.random() * 8
    ) + 3;


    if (progress >= 100) {

        progress = 100;

        clearInterval(loadingTimer);
        clearInterval(messageTimer);
        clearInterval(tipTimer);

        progressBar.style.width =
            "100%";

        percentText.innerText =
            "100%";

        messageText.innerText =
            "Adventure ready!";

        setTimeout(() => {

            window.location.href =
                "game.html";

        }, 600);

        return;
    }


    progressBar.style.width =
        progress + "%";

    percentText.innerText =
        progress + "%";

}, 180);