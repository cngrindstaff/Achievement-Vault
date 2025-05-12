// backend/routes/games.js
import express from "express";
const router = express.Router();
import db from '../config/mysqlConnector.js'; 

// Route 1: Get all games
router.get('/db/games/all', async (req, res) => {
    //console.log('made it here');
    try {
        const [rows] = await db.query('CALL GetAllGames()');
        const games = rows[0]; // CALL returns an array of result sets
        res.json(games);
    } catch (err) {
        console.error('Error fetching games:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route 2: Get a single game by ID
router.get('/db/games/:gameId', async (req, res) => {
    //console.log('made it here2');
    const gameId = req.params.gameId;
    //console.log('gameId: ' + gameId);
    try {
        const [rows] = await db.query('CALL GetGameById(?)', [gameId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(result[0]);
    } catch (err) {
        console.error(`Error fetching game with ID ${gameId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Route 4: Get all sections for a game by ID
router.get('/db/sections/:gameId/:hiddenFilter', async (req, res) => {
    //console.log('made it here sections/gameid');
    const gameId = req.params.gameId;
    let hiddenFilter = req.params.hiddenFilter;

    // Convert string 'true'/'false' to boolean 1/0
    if (hiddenFilter === 'true') {
        hiddenFilter = 1;
    } else if (hiddenFilter === 'false') {
        hiddenFilter = 0;
    } else {
        hiddenFilter = null; // Let SQL default it if invalid or missing
    }
    
    //console.log('gameId: ' + gameId + ' hiddenFilter: ' + hiddenFilter);
    try {
        const [rows] = await db.query('CALL GetGameSectionsByGameID(?, ?)', [gameId, hiddenFilter]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching sections  with game ID ${gameId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route 5: Get all records for a game section by section Id
router.get('/db/records/:sectionId/order/:recordOrderPreference/hiddenFilter/:hiddenFilter', async (req, res) => {
    //console.log('made it records/sectionId');
    const sectionId = req.params.sectionId;
    const recordOrderPreference = req.params.recordOrderPreference

    let hiddenFilter = req.params.hiddenFilter;

    // Convert string 'true'/'false' to boolean 1/0
    if (hiddenFilter === 'true') {
        hiddenFilter = 1;
    } else if (hiddenFilter === 'false') {
        hiddenFilter = 0;
    } else {
        hiddenFilter = null; // Let SQL default it if invalid or missing
    }
    
    // console.log('sectionId: ' + sectionId + ' recordOrderPreference: ' + recordOrderPreference + ' hiddenFilter: ' + hiddenFilter);
    try {
        const [rows] = await db.query('CALL GetGameRecordsByGameSectionID(?, ?, ?)', [sectionId, recordOrderPreference, hiddenFilter]);
        const result = rows[0];

        if (result.length === 0) { 
            console.error(`Section or records not found ${sectionId}`);
            res.json();
        }
        else {
            res.json(result);
        }

    } catch (err) { 
        console.error(`Error fetching section data with section ID ${sectionId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route 6: Update Record Completion
router.put('/db/record/updateCompletion/:recordId', async (req, res) => {
    const recordId = req.params.recordId;
    const { numberAlreadyCompleted } = req.body;

    //console.log('recordId: ' + recordId + ". numberAlreadyCompleted: " + numberAlreadyCompleted);

    if (numberAlreadyCompleted === undefined) {
        return res.status(400).json({ error: 'Missing required field: numberAlreadyCompleted' });
    }

    //console.log('made it here2 - recordId ' + recordId + ' numberAlreadyCompleted ' + numberAlreadyCompleted);

    
    try {
        await db.query('CALL UpdateGameRecordCompletion(?, ?)', [recordId, numberAlreadyCompleted]);
        res.json({ message: 'Progress updated successfully' });
    } catch (err) {
        console.error('Error updating progress:', err);
        res.status(500).json({ error: 'Database error' });
    }
});


//get all game Tables by gameId
router.get('/db/gameTables/:gameId', async (req, res) => {
    //console.log('made it here sections/gameid');
    const gameId = req.params.gameId;
    //console.log('gameId: ' + gameId);
    try {
        const [rows] = await db.query('CALL GetAllGameTablesByGameID(?)', [gameId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching game tables with game ID ${gameId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//GET table Record by ID
router.get('/db/tableRecords/:tableId', async (req, res) => {
    const gameId = req.params.tableId;
    try {
        const [rows] = await db.query('CALL GetAllTableRecordsByTableID(?)', [gameId]);
        //console.log('rows:', rows);
        if (!rows || rows.length === 0 || (Array.isArray(rows[0]) && rows[0].length === 0)) {
            console.log("No records returned.");
            return null;
        }
        
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching game tables with game ID ${gameId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Insert Game Record
router.post('/db/record/insert', async (req, res) => {
    const { recordName, description, sectionId, gameId, numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden } = req.body;

    if (!recordName || sectionId === undefined || gameId === undefined || numberOfCheckboxes === undefined || numberAlreadyCompleted === undefined || listOrder === undefined || hidden === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.query(
            'CALL InsertGameRecord(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [recordName, description, sectionId, gameId, numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden]
        );
        res.json({ message: 'Game record inserted successfully' });
    } catch (err) {
        console.error('Error inserting game record:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update Game Record
router.put('/db/record/update/:recordId/:sectionId', async (req, res) => {
    const { recordId, sectionId } = req.params;
    const { recordName, description, gameId, numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden } = req.body;

    try {
        await db.query(
            'CALL UpdateGameRecord(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [recordId, sectionId, recordName, description, gameId, numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden]
        );
        res.json({ message: 'Game record updated successfully' });
    } catch (err) {
        console.error('Error updating game record:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Insert Game Section
router.post('/db/section/insert', async (req, res) => {
    const { sectionName, gameId, listOrder, recordOrderPreference, hidden } = req.body;

    if (!sectionName || gameId === undefined || listOrder === undefined || hidden === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.query(
            'CALL InsertGameSection(?, ?, ?, ?, ?)',
            [sectionName, gameId, listOrder, recordOrderPreference, hidden]
        );
        res.json({ message: 'Game section inserted successfully' });
    } catch (err) {
        console.error('Error inserting game section:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update Game Section
router.put('/db/section/update/:sectionId/:gameId', async (req, res) => {
    const { sectionId, gameId } = req.params;
    const { sectionName, listOrder, recordOrderPreference, hidden } = req.body;

    try {
        await db.query(
            'CALL UpdateGameSection(?, ?, ?, ?, ?)',
            [sectionId, gameId, sectionName, listOrder, recordOrderPreference, hidden]
        );
        res.json({ message: 'Game section updated successfully' });
    } catch (err) {
        console.error('Error updating game section:', err);
        res.status(500).json({ error: 'Database error' });
    }
});


// Update multiple game sections' list orders
/*
Expected input: 
[
    { "ID": 1234, "ListOrder": 4 },
    { "ID": 5678, "ListOrder": 5 },
    { "ID": 9999, "ListOrder": 6 }
]

Expected response: 
{
    "message": "List orders updated successfully",
    "rowsUpdated": 2
}

 */
router.put('/db/sections/updateListOrder', async (req, res) => {
    const sectionUpdates = req.body;

    // Validate the input is a non-empty array
    if (!Array.isArray(sectionUpdates) || sectionUpdates.length === 0) {
        return res.status(400).json({ error: 'Invalid input. Expected a non-empty array of section updates.' });
    }

    try {
        // Convert the section updates to a JSON string for the stored procedure
        const jsonString = JSON.stringify(sectionUpdates);
        const [result] = await db.query(
            'CALL UpdateGameSectionsListOrder(?, @rowsUpdated)',
            [jsonString]
        );

        // Fetch the number of rows updated
        const [rowsUpdatedResult] = await db.query('SELECT @rowsUpdated AS RowsUpdated');
        const rowsUpdated = rowsUpdatedResult[0].RowsUpdated || 0;

        res.json({ message: 'List orders updated successfully', rowsUpdated });
    } catch (err) {
        console.error('Error updating game section list orders:', err);
        res.status(500).json({ error: 'Database error' });
    }
});



export default router;