import express from "express";
import { googleAuth, google } from "../config/googleAuth.js";

const router = express.Router();

export async function appendRow(rowData) {
    if (!googleAuth) {
        console.error("❌ Google Auth is not initialized!");
        return;
    }

    const client = await googleAuth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.AV_GOOGLE_SHEETS_ID;
    const range = "Sheet1!A1";

    const resource = { values: [rowData] };

    return await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource,
    });
}

router.post("/google-sheets-append", async (req, res) => {
    try {
        const { rowData } = req.body;
        if (!Array.isArray(rowData)) {
            return res.status(400).json({ error: "rowData must be an array" });
        }

        const result = await appendRow(rowData);
        res.json({ success: true, updates: result.data.updates });
    } catch (error) {
        console.error("❌ Error appending row:", error);
        res.status(500).json({ error: "Failed to append row" });
    }
});

// Export the router for use in server.js
// A file can have ONE default export, but as many named exports as you want (export function, export const)
export default router;