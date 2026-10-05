// Shows a clear message instead of a silent blank/dead page.
(function () {
    function banner(text) {
        var d = document.createElement("div");
        d.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:9999;padding:12px 16px;" +
            "background:#b3261e;color:#fff;font:15px Arial,sans-serif;text-align:center";
        d.textContent = text;
        document.body.appendChild(d);
    }
    if (location.protocol === "file:") {
        window.addEventListener("DOMContentLoaded", function () {
            banner("Open this through a local server (e.g. run 'python -m http.server' in the folder, " +
                   "then visit http://localhost:8000). Firebase does not work from file://");
        });
    }
    // Game page: if login/Firebase never answers, say so instead of staying blank.
    setTimeout(function () {
        var boot = document.getElementById("boot");
        if (boot) boot.textContent = "Could not reach Firebase. Check your internet connection, " +
            "open the browser console (F12) for details, then reload.";
    }, 10000);
})();
