// backend/routes/games.js
import express from "express";
const router = express.Router();
import db from '../config/mysqlConnector.js';

var debugLogging = process.env.DEBUG_LOGGING === 'true';


//#region Games
//************************************ GET ALL GAMES ************************************//
router.get('/db/games/all', async (req, res) => {
    //if(debugLogging) console.log('made it here');
    try {
        const [rows] = await db.query('CALL GetAllGames()');
        const games = rows[0]; // CALL returns an array of result sets
        res.json(games);
    } catch (err) {
        console.error('Error fetching games:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//************************************ GET GAME BY ID - includes # of tables, sectionGroups ************************************//
router.get('/db/games/:gameId', async (req, res) => {
    const gameId = req.params.gameId;
    //if(debugLogging) console.log('gameId: ' + gameId);
    try {
        const [rows] = await db.query('CALL GetGameByIdV2(?)', [gameId]);
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


//#endregion 


//#region Sections


//************************************ GET ALL SECTIONS FOR A GAME BY GAME ID ************************************//
router.get('/db/sections/:gameId/:hiddenFilter', async (req, res) => {
    //if(debugLogging) console.log('made it here sections/gameid');
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

    //if(debugLogging) console.log('gameId: ' + gameId + ' hiddenFilter: ' + hiddenFilter);
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

//************************************ GET SECTION BY SECTION ID ************************************//

router.get('/db/section/:sectionId', async (req, res) => {
    //if(debugLogging) console.log('made it here2');
    const sectionId = req.params.sectionId;
    //if(debugLogging) console.log('sectionId: ' + sectionId);
    try {
        const [rows] = await db.query('CALL GetSectionById(?)', [sectionId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        res.json(result[0]);
    } catch (err) {
        console.error(`Error fetching section with ID ${sectionId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//************************************ INSERT GAME SECTION************************************//
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

//************************************ UPDATE GAME SECTION ************************************//
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


//************************************ UPDATE THE ORDER OF GAME SECTIONS ************************************//
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

//#endregion 


//#region Records

//************************************ GET ALL RECORDS FOR A SECTION BY SECTION ID, WITH ORDERING ************************************//
router.get('/db/records/:sectionId/order/:recordOrderPreference/hiddenFilter/:hiddenFilter', async (req, res) => {
    //if(debugLogging) console.log('made it records/sectionId');
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

//************************************ GET ALL RECORDS FOR A SECTION BY SECTION ID, V2, WITHOUT ORDERING ************************************//
router.get('/db/records/v2/:sectionId/hiddenFilter/:hiddenFilter', async (req, res) => {
    //if(debugLogging) console.log('made it records/sectionId');
    const sectionId = req.params.sectionId;

    let hiddenFilter = req.params.hiddenFilter;

    // Convert string 'true'/'false' to boolean 1/0
    if (hiddenFilter === 'true') {
        hiddenFilter = 1;
    } else if (hiddenFilter === 'false') {
        hiddenFilter = 0;
    } else {
        hiddenFilter = null; // Let SQL default it if invalid or missing
    }

    // console.log('sectionId: ' + sectionId  + ' hiddenFilter: ' + hiddenFilter);
    try {
        const [rows] = await db.query('CALL GetGameRecordsByGameSectionIDV2(?, ?)', [sectionId, hiddenFilter]);
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

//************************************ GET RECORD BY RECORD ID ************************************//

router.get('/db/record/:recordId', async (req, res) => {
    //if(debugLogging) console.log('made it here2');
    const recordId = req.params.recordId;
    //if(debugLogging) console.log('recordId: ' + recordId);
    try {
        const [rows] = await db.query('CALL GetGameRecordByRecordID(?)', [recordId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json(result[0]);
    } catch (err) {
        console.error(`Error fetching record with ID ${recordId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//************************************ UPDATE RECORD COMPLETION ************************************//
router.put('/db/record/updateCompletion/:recordId', async (req, res) => {
    const recordId = req.params.recordId;
    const { numberAlreadyCompleted } = req.body;

    //if(debugLogging) console.log('recordId: ' + recordId + ". numberAlreadyCompleted: " + numberAlreadyCompleted);

    if (numberAlreadyCompleted === undefined) {
        return res.status(400).json({ error: 'Missing required field: numberAlreadyCompleted' });
    }
    
    try {
        await db.query('CALL UpdateGameRecordCompletion(?, ?)', [recordId, numberAlreadyCompleted]);
        res.json({ message: 'Progress updated successfully' });
    } catch (err) {
        console.error('Error updating progress:', err);
        res.status(500).json({ error: 'Database error' });
    }
});


//************************************ INSERT GAME RECORD ************************************//
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

//************************************ INSERT MULTIPLE GAME RECORDS ************************************//
router.post('/db/records/insertMultiple', async (req, res) => {
    const records = req.body;

    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Invalid input. Expected a non-empty array of records.' });
    }

    try {
        const jsonString = JSON.stringify(records);
        await db.query('CALL InsertMultipleGameRecords(?)', [jsonString]);
        res.json({ message: `${records.length} game records inserted successfully` });
    } catch (err) {
        console.error('Error inserting multiple game records:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

//************************************ UPDATE GAME RECORD ************************************//
router.put('/db/record/update/:recordId', async (req, res) => {
    const { recordId } = req.params;
    const { recordName, description, gameId, numberOfCheckboxes, numberAlreadyCompleted, 
        listOrder, longDescription, hidden, sectionId } = req.body;
    if (debugLogging) console.log('recordId: ' + recordId + ' sectionId: ' + sectionId + ' recordName: ' + recordName + ' description: ' + description + ' gameId: ' + gameId + ' numberOfCheckboxes: ' + numberOfCheckboxes + ' numberAlreadyCompleted: ' + numberAlreadyCompleted + ' listOrder: ' + listOrder + ' longDescription: ' + longDescription + ' hidden: ' + hidden);
    try {
        await db.query(
            'CALL UpdateGameRecord(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [recordId, sectionId, recordName, description, gameId, numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden]
        );
        res.json({ message: 'Game record updated successfully' });
    } catch (err) {
        console.error('Error updating game record:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

//************************************ DELETE A RECORD ITEM ************************************//
router.delete('/db/record/delete/:recordId', async (req, res) => {
    const recordId = req.params.recordId;

    try {
        await db.query('CALL DeleteGameRecord(?)', [recordId]);
        res.status(200).json({ message: 'Record deleted successfully' });
    } catch (err) {
        console.error("Error deleting record:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

//************************************ UPDATE THE ORDER OF RECORDS IN A SECTION ************************************//
router.put('/db/records/updateListOrder', async (req, res) => {
    const recordUpdates = req.body;

    // Validate the input is a non-empty array
    if (!Array.isArray(recordUpdates) || recordUpdates.length === 0) {
        return res.status(400).json({ error: 'Invalid input. Expected a non-empty array of section updates.' });
    }

    try {
        // Convert the section updates to a JSON string for the stored procedure
        const jsonString = JSON.stringify(recordUpdates);
        const [result] = await db.query(
            'CALL UpdateSectionRecordsListOrder(?, @rowsUpdated)',
            [jsonString]
        );

        // Fetch the number of rows updated
        const [rowsUpdatedResult] = await db.query('SELECT @rowsUpdated AS RowsUpdated');
        const rowsUpdated = rowsUpdatedResult[0].RowsUpdated || 0;

        res.json({ message: 'List orders updated successfully', rowsUpdated });
    } catch (err) {
        console.error('Error updating section record list orders:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

//#endregion 


//#region Tables

//************************************ GET ALL GAME TABLES BY GAME ID ************************************//
router.get('/db/gameTables/:gameId', async (req, res) => {
    //if(debugLogging) console.log('made it here sections/gameid');
    const gameId = req.params.gameId;
    //if(debugLogging) console.log('gameId: ' + gameId);
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

//************************************ GET TABLE RECORDS BY TABLE ID ************************************//
router.get('/db/tableRecords/:tableId', async (req, res) => {
    const gameId = req.params.tableId;
    try {
        const [rows] = await db.query('CALL GetAllTableRecordsByTableID(?)', [gameId]);
        //if(debugLogging) console.log('rows:', rows);
        if (!rows || rows.length === 0 || (Array.isArray(rows[0]) && rows[0].length === 0)) {
            if (debugLogging) console.log("No records returned.");
            return res.json([]);
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

//#endregion 

//************************************ GET ALL SECTIONGROUPS FOR A GAME BY GAME ID ************************************//
router.get('/db/sectionGroups/:gameId/:hiddenFilter', async (req, res) => {
    //if(debugLogging) console.log('made it here sectionGroups/gameid');
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

    //if(debugLogging) console.log('gameId: ' + gameId + ' hiddenFilter: ' + hiddenFilter);
    try {
        const [rows] = await db.query('CALL GetSectionGroupsByGameID(?, ?)', [gameId, hiddenFilter]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching sectionGroups  with game ID ${gameId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//************************************ GET  SECTIONGROUPS SECTIONGROUP ID ************************************//
router.get('/db/sectionGroup/:sectionGroupId', async (req, res) => {
    const sectionGroupId = req.params.sectionGroupId;
    //if(debugLogging) console.log('gameId: ' + gameId);
    try {
        const [rows] = await db.query('CALL GetSectionGroupById(?)', [sectionGroupId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Section Group not found' });
        }

        res.json(result[0]);
    } catch (err) {
        console.error(`Error fetching sectionGroup with ID ${sectionGroupId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//************************************ GET ALL SECTIONS FOR A GAME BY SECTION GROUP ID ************************************//
router.get('/db/sections/sectionGroupId/:sectionGroupId/:hiddenFilter', async (req, res) => {
    //if(debugLogging) console.log('made it here sectionGroups/sectionGroupId');
    const sectionGroupId = req.params.sectionGroupId;
    let hiddenFilter = req.params.hiddenFilter;

    // Convert string 'true'/'false' to boolean 1/0
    if (hiddenFilter === 'true') {
        hiddenFilter = 1;
    } else if (hiddenFilter === 'false') {
        hiddenFilter = 0;
    } else {
        hiddenFilter = null; // Let SQL default it if invalid or missing
    }

    //if(debugLogging) console.log('gameId: ' + gameId + ' hiddenFilter: ' + hiddenFilter);
    try {
        const [rows] = await db.query('CALL GetGameSectionsBySectionGroupID(?, ?)', [sectionGroupId, hiddenFilter]);
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



//************************************  ************************************//


















export default router;