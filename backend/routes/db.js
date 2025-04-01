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

export default router;