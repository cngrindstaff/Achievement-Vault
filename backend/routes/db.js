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

// Route 3: Get all data for a game by ID
router.get('/db/games/full/:gameId', async (req, res) => {
    //console.log('made it here2');
    const gameId = req.params.gameId;
    //console.log('gameId: ' + gameId);
    try {
        const [rows] = await db.query('CALL GetAllGameDataByGameID(?)', [gameId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching full gamedata  with ID ${gameId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route 4: Get all sections for a game by ID
router.get('/db/sections/:gameId', async (req, res) => {
    //console.log('made it here sections/gameid');
    const gameId = req.params.gameId;
    //console.log('gameId: ' + gameId);
    try {
        const [rows] = await db.query('CALL GetAllSectionsByGameID(?)', [gameId]);
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
router.get('/db/records/:sectionId', async (req, res) => {
    //console.log('made it records/sectionId');
    const sectionId = req.params.sectionId;
    //console.log('sectionId: ' + sectionId);
    try {
        const [rows] = await db.query('CALL GetAllRecordsBySectionID(?)', [sectionId]);
        const result = rows[0];

        if (result.length === 0) {
            return res.status(404).json({ error: 'Game or section not found' });
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching section data with section ID ${sectionId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route 6: Update Record
router.put('/db/record/updateCompletion/:recordId', async (req, res) => {
    const recordId = req.params.recordId;
    const { numberAlreadyCompleted } = req.body;

    //console.log('recordId: ' + recordId + ". numberAlreadyCompleted: " + numberAlreadyCompleted);

    if (numberAlreadyCompleted === undefined) {
        return res.status(400).json({ error: 'Missing required field: numberAlreadyCompleted' });
    }

    //console.log('made it here2 - recordId ' + recordId + ' numberAlreadyCompleted ' + numberAlreadyCompleted);

    
    try {
        await db.query('CALL UpdateRecord(?, ?)', [recordId, numberAlreadyCompleted]);
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

export default router;