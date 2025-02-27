const express = require('express');
const sgMail = require('@sendgrid/mail');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config(); // Load API key from .env file

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend to call this API

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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
