﻿import {getQueryParam} from "./script_utilities.js";

export async function loadGameData(passed_gameId) {
    if (!passed_gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/games/${passed_gameId}`);
        const data = await res.json();
        //console.log('Game data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        return data;
    } catch (err) {
        console.error("Error fetching game data:", err);
    }

    //document.querySelector('.game-name').textContent = passed_gameNameFriendly;
}
export async function loadFullGameData(passed_gameId) {
    if (!passed_gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/games/full/${passed_gameId}`);
        const data = await res.json();
        //console.log('Game data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        return data;
    } catch (err) {
        console.error("Error fetching game data:", err);
    }
}
export async function loadSectionsByGameId(gameId) {
    if (!gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        //console.log('made it here loadSectionsByGameId');
        const res = await fetch(`/api/db/sections/${gameId}`);
        const data = await res.json();
        //console.log('Section data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        
        //returns ordered by ListOrder asc, ID asc
        
        return data;
    } catch (err) {
        console.error("Error fetching game data:", err);
    }
}

export async function loadRecordsBySectionId(sectionId) {
    if (!sectionId) {
        alert("Missing sectionId in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/records/${sectionId}`);
        const data = await res.json();
        //console.log('Records data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        return data;
    } catch (err) {
        console.error("Error fetching game data:", err);
    }
}


export async function updateRecordInDatabase(recordId, numberAlreadyCompleted){
    try {
        const res = await fetch(`/api/db/record/updateCompletion/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ numberAlreadyCompleted: numberAlreadyCompleted }),
        });
        const data = await res.json();
        console.log('Updated record:', data);
        return data;
    } catch (err) {
        console.error("Error updating record:", err);
    }
}



