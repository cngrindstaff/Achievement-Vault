require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Import middleware & routes
const basicAuthMiddleware = require("./middleware/authMiddleware");
const googleSheetsRoutes = require("./routes/googleSheets");
const sendGridRoutes = require("./routes/sendGrid");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(basicAuthMiddleware); // Apply authentication globally

// API Routes
app.use("/api", googleSheetsRoutes);
app.use("/api", sendGridRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
