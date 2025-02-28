require("dotenv").config();

const express = require('express');
const sgMail = require('@sendgrid/mail');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require("path");

dotenv.config(); // Load API key from .env file

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend to call this API


const AV_USERNAME = process.env.AV_USERNAME;
const AV_PASSWORD = process.env.AV_PASSWORD;




// Middleware for Basic Authentication
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        return res.status(401).send("Unauthorized: No credentials provided");
    }

    const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
    const user = credentials[0];
    const pass = credentials[1];
 
    if (user !== AV_USERNAME || pass !== AV_PASSWORD) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        //console.log('looking for username ' + AV_USERNAME + ' and password ' + AV_PASSWORD);

        //resets authentication after failed attempts
        res.setHeader("Set-Cookie", "auth_time=; Max-Age=0; HttpOnly"); // Clear auth_time cookie

        console.log('incorrect credentials');
        return res.status(401).send("Unauthorized: Incorrect user");
    }

    next(); // Proceed to the next middleware (serve static files)
});

// Serve static files (your frontend)
app.use(express.static(path.join(__dirname, "public"))); // Change 'public' to your folder name

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Endpoint to send emails
app.post('/send-email', async (req, res) => {
    const { subject, text } = req.body;

    const msg = {
        to: process.env.SENDGRID_SENDER_EMAIL,
        from: process.env.SENDGRID_SENDER_EMAIL,
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


