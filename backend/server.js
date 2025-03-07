﻿import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";  // Needed for __dirname in ES6

// Import middleware & routes
import basicAuthMiddleware from "./middleware/authMiddleware.js";
import googleSheetsRouter from "./routes/googleSheets.js";
import sendGridRouter from "./routes/sendGrid.js";

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

// Serve static files
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
