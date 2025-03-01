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
const AV_SENDGRID_API_KEY = process.env.AV_SENDGRID_API_KEY
const AV_SENDGRID_SENDER_EMAIL = process.env.AV_SENDGRID_SENDER_EMAIL;
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

// Serve static files (your frontend)
app.use(express.static(path.join(__dirname, "public"))); // Change 'public' to your folder name


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Google Sheets ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Define path for credentials.json
const googleCredentialsPath = path.join(__dirname, "credentials.json");

// Step 1: Decode and write credentials.json
if (!fs.existsSync(googleCredentialsPath)) {
    const encodedCreds = AV_GOOGLE_SHEETS_CREDENTIALS;
    if (!encodedCreds) {
        console.error("ERROR: AV_GOOGLE_SHEETS_CREDENTIALS environment variable not set!");
        process.exit(1);
    }

    try {
        const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
        fs.writeFileSync(googleCredentialsPath, decodedCreds, { mode: 0o600 }); // Secure the file
        console.log("Credentials file written successfully.");
    } catch (error) {
        console.error("Error decoding credentials:", error);
        process.exit(1);
    }
}

// Step 2: Google Auth Setup
const auth = new google.auth.GoogleAuth({
    keyFile: googleCredentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Step 3: Append Row Function
async function appendRow(rowData) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.AV_GOOGLE_SHEETS_ID; 
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
// S
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


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


