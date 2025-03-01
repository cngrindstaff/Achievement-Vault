require("dotenv").config();

console.log ('trying to start');

const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json()); //Allow HTTP requests and responses, provide routing, parse JSON, start a web server
app.use(cors()); // Allow frontend to call this API

const AV_USERNAME = process.env.AV_USERNAME;
const AV_PASSWORD = process.env.AV_PASSWORD;
const AV_GOOGLE_SHEETS_CREDENTIALS = process.env.AV_GOOGLE_SHEETS_CREDENTIALS;
//console.log('AV_GOOGLE_SHEETS_CREDENTIALS: ' + AV_GOOGLE_SHEETS_CREDENTIALS);
const AV_SENDGRID_API_KEY = process.env.AV_SENDGRID_API_KEY
const AV_SENDGRID_SENDER_EMAIL = process.env.AV_SENDGRID_SENDER_EMAIL;
const AV_GOOGLE_SHEETS_ID = process.env.AV_GOOGLE_SHEETS_ID;process.env.AV_GOOGLE_SHEETS_ID

// Declare globally, bc we set it inside an if statement
let googleAuth; 


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Middleware for Basic Authentication ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        return res.status(401).send("Unauthorized: No credentials provided");
    }

    const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
    const user = credentials[0];
    const pass = credentials[1];

    if (user !== AV_USERNAME || pass !== AV_PASSWORD) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        console.log('looking for username ' + AV_USERNAME + ' and password ' + AV_PASSWORD);

        //resets authentication after failed attempts
        res.setHeader("Set-Cookie", "auth_time=; Max-Age=0; HttpOnly"); // Clear auth_time cookie

        console.log('incorrect credentials');
        return res.status(401).send("Unauthorized: Incorrect user");
    }

    next(); // Proceed to the next middleware (serve static files)
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Google Sheets ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Define path for credentials.json
const googleCredentialsPath = path.join(__dirname, "credentials.json");

// Step 1: Decode and write credentials.json

//console.log("1. Encoded credentials length:", AV_GOOGLE_SHEETS_CREDENTIALS?.length || "Not Set");

if (fs.existsSync(googleCredentialsPath)) {
    //console.log("2. Credentials file already exists!");
    initializeGoogleAuth();

}

else {
    //console.log("2. Credentials file does not yet exist");

    const encodedCreds = AV_GOOGLE_SHEETS_CREDENTIALS;
    if (!encodedCreds) { 
        console.error("ERROR: AV_GOOGLE_SHEETS_CREDENTIALS environment variable not set!");
        process.exit(1);
    } 

    //const decodedCreds = Buffer.from(AV_GOOGLE_SHEETS_CREDENTIALS, "base64").toString("utf-8");
    const decodedCreds = Buffer.from(AV_GOOGLE_SHEETS_CREDENTIALS, "base64").toString("binary");

    //console.log("3. Decoded JSON length:", decodedCreds.length);
    //console.log("4. Decoded credentials preview:", decodedCreds.substring(0, 300) + "...");
    //console.log("5. ...");

// Force synchronous writing to ensure the entire file is written
    try {
        fs.writeFile(googleCredentialsPath, decodedCreds, { mode: 0o600 }, (err) => {
            if (err) {
                console.error("6. Error writing credentials file:", err);
                process.exit(1);
            }

            setTimeout(() => {
                console.log("7. timeout Keeping process alive for debugging...");
            }, 5000);
            console.log("8. timeout finished...");
            
            //console.log("9. Credentials file written successfully!");

            // 🔍 Verify file size after writing
            //const stats = fs.statSync(googleCredentialsPath);
            //console.log(`10. File size after write: ${stats.size} bytes`);

            // 🟢 Only continue authentication once file is fully written
            initializeGoogleAuth();
            
/*            if (stats.size !== decodedCreds.length) {
                console.error("10b. File was not fully written! Expected:", decodedCreds.length, "but got:", stats.size);
                process.exit(1);
            }*/


        });
    } catch (error) {
        console.error("11. Error writing credentials file:", error);
    }
} 



function initializeGoogleAuth() {
    console.log("12. Initializing Google Auth...");
    googleAuth = new google.auth.GoogleAuth({
        keyFile: googleCredentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Debug: Check if auth works
    //testAuth(googleAuth);
}

// Debug: Check if auth works
async function testAuth(authInstance) {
    try {
        const client = await authInstance.getClient();
        console.log("13. Google Auth successful!");
    } catch (error) {
        console.error("13. Google Auth failed:", error);
    }
}
//testAuth(); 


// Step 3: Append Row Function
async function appendRow(rowData) {
    const client = await googleAuth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = AV_GOOGLE_SHEETS_ID; 
    const range = "Sheet1!A1"; // Adjust based on your sheet
 
    const resource = { values: [rowData] };
    
    return await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource,
    });
}

// Step 4: API Route to Append Data
app.post("/google-sheets-append", async (req, res) => {
    try {
        const { rowData } = req.body;
        if (!Array.isArray(rowData)) {
            return res.status(400).json({ error: "rowData must be an array" });
        }

        const result = await appendRow(rowData);
        res.json({ success: true, updates: result.data.updates });
    } catch (error) {
        console.error("Error appending row:", error);
        res.status(500).json({ error: "Failed to append row" });
    }
});




// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Start the server ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.listen(PORT, () => console.log(`14. Starting. Server running on port ${PORT}`));

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SendGrid Email ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
sgMail.setApiKey(AV_SENDGRID_API_KEY);

// Endpoint to send emails
app.post('/send-email', async (req, res) => {
    const { subject, text } = req.body;

    if (!subject || !text) {
        return res.status(400).json({ error: "Subject and text are required." });
    }
    const msg = {
        to: AV_SENDGRID_SENDER_EMAIL,
        from: AV_SENDGRID_SENDER_EMAIL,
        subject,
        text
    };

    try {
        await sgMail.send(msg);
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error sending email.' });
    }
});



// Serve static files (your frontend)
//app.use(express.static(path.join(__dirname, "public"))); 
app.use(express.static(path.join(__dirname, "..", "public"))); // Go up one level
