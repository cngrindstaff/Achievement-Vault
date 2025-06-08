import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";


//This doesn't work bc googleapis is not an ES6 module - //import google from "googleapis";
//Instead, use the following:
import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library";

const AV_GOOGLE_SHEETS_CREDENTIALS = process.env.AV_GOOGLE_SHEETS_CREDENTIALS;

// Define __dirname manually in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a path to credentials.json
const googleCredentialsPath = path.join(__dirname, "../credentials.json");


let googleAuth = null;

/**
 *  * Initialize Google Authentication
 *  * This function is exported to ensure it can be called again if needed.
 */
export function initializeGoogleAuth() {
    console.log("🔄 Initializing Google Auth...");
    googleAuth = new GoogleAuth({
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
    const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
    fs.writeFileSync(googleCredentialsPath, decodedCreds, { mode: 0o600 }); // Secure the file
    initializeGoogleAuth();
}


//Export `googleAuth` to allow access from other files
export { googleAuth, google };