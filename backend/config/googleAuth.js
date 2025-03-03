const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const googleCredentialsPath = path.join(__dirname, "../credentials.json");
let googleAuth = null;

function initializeGoogleAuth() {
    console.log("🔄 Initializing Google Auth...");
    googleAuth = new google.auth.GoogleAuth({
        keyFile: googleCredentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
}

// Ensure credentials exist before initializing Google Auth
if (fs.existsSync(googleCredentialsPath)) {
    initializeGoogleAuth();
} else {
    console.error("❌ Google credentials file is missing!");
    process.exit(1);
}

module.exports = { googleAuth, initializeGoogleAuth };
