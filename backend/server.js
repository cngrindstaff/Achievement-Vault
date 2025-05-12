import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";  // Needed for __dirname in ES6

// Import middleware & routes
import basicAuthMiddleware from "./middleware/authMiddleware.js";
import googleSheetsRouter from "./routes/googleSheets.js";
import sendGridRouter from "./routes/sendGrid.js";
import dbRouter from "./routes/db.js";

// Define __dirname manually in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(basicAuthMiddleware); // Apply authentication globally

// API Routes
app.use("/api", googleSheetsRouter);
app.use("/api", sendGridRouter);
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
app.get('/table', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/table.html'));
});
app.get('/manage_sections', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/manage_sections.html'));
});
app.get('/manage_sectionRecords', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/manage_sectionRecords.html'));
});
// Run the server on port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
