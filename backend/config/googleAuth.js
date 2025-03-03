const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const AV_GOOGLE_SHEETS_CREDENTIALS = process.env.AV_GOOGLE_SHEETS_CREDENTIALS;

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
    const encodedCreds = AV_GOOGLE_SHEETS_CREDENTIALS;
    if (!encodedCreds) {
        console.error("ERROR: AV_GOOGLE_SHEETS_CREDENTIALS environment variable not set!");
        process.exit(1);
    }
    const decodedCreds = Buffer.from(AV_GOOGLE_SHEETS_CREDENTIALS, "base64").toString("utf-8");
    fs.writeFileSync(googleCredentialsPath, decodedCreds, { mode: 0o600 }); // Secure the file
    initializeGoogleAuth();

}

module.exports = { googleAuth, initializeGoogleAuth };
