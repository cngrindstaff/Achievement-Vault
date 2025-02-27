document.addEventListener("DOMContentLoaded", function () {
    const correctPassword = "yourSecurePassword"; // 🔒 Change this to your password
    const storedPassword = localStorage.getItem("siteAuth");

    if (storedPassword !== correctPassword) {
        let userInput = prompt("Enter the password to access this site:");

        if (userInput !== correctPassword) {
            alert("Incorrect password. Access denied.");
            window.location.href = "about:blank"; // Redirect to a blank page
        } else {
            localStorage.setItem("siteAuth", correctPassword); // Store password in localStorage
        }
    }
});
