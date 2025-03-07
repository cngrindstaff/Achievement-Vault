import express from "express";
import sgMail from "@sendgrid/mail";

const router = express.Router();
sgMail.setApiKey(process.env.AV_SENDGRID_API_KEY);

router.post("/send-email", async (req, res) => {
    const { subject, text } = req.body;

    if (!subject || !text) {
        return res.status(400).json({ error: "Subject and text are required." });
    }

    const msg = {
        to: process.env.AV_SENDGRID_SENDER_EMAIL,
        from: process.env.AV_SENDGRID_SENDER_EMAIL,
        subject,
        text,
    };

    try {
        await sgMail.send(msg);
        res.status(200).json({ message: "✅ Email sent successfully!" });
    } catch (error) {
        console.error("❌ SendGrid Error:", error);
        res.status(500).json({ error: "Error sending email." });
    }
});

// Export the router for use in server.js
export default router;