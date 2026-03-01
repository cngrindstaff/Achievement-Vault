import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// Import middleware & routes
import basicAuthMiddleware from "./middleware/authMiddleware.js";
import dbRouter from "./routes/db.js";

// Define __dirname manually in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Session middleware — keeps users logged in after Basic Auth succeeds once
const sessionDays = parseInt(process.env.AV_SESSION_DAYS) || 7;
app.use(session({
    secret: process.env.AV_SESSION_SECRET || 'fallback-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: sessionDays * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

app.use(basicAuthMiddleware); // Apply authentication globally

// Version endpoint
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
app.get('/api/version', (req, res) => res.json({ version: pkg.version }));

// Changelog endpoint
app.get('/api/changelog', (req, res) => {
    try {
        const changelog = readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf-8');
        res.type('text/plain').send(changelog);
    } catch {
        res.status(404).send('Changelog not found');
    }
});

// API Routes
app.use("/api", dbRouter);

// Serve static files
app.use(express.static(path.join(__dirname, "..", "public")));

// Custom routes to make the ".html" optional
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/game.html'));
});
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/checklist', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/checklist.html'));
});
app.get('/checklistGroups', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/checklistGroups.html'));
});
app.get('/table', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/table.html'));
});
app.get('/changelog', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/changelog.html'));
});
app.get('/reorder_sections', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/reorder_sections.html'));
});
app.get('/reorder_records', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/reorder_records.html'));
});




// Run the server on port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
