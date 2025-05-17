import {getQueryParam} from "./script_utilities.js";

var debugLogging = false;


//************************************ GET GAME BY ID ************************************//
export async function getGameData(passed_gameId) {
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

//************************************ GET ALL SECTIONS FOR A GAME BY GAME ID ************************************//
export async function getSectionsByGameId(gameId, hiddenFilter) {
    if (!gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        //console.log('made it here loadSectionsByGameId');
        const res = await fetch(`/api/db/sections/${gameId}/${hiddenFilter}`);
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
//************************************ GET SECTION BY SECTION ID ************************************//
export async function getSectionById(passed_sectionId) {
    if (!passed_sectionId) {
        alert("Missing section ID in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/section/${passed_sectionId}`);
        const data = await res.json();
        //console.log('Game data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        return data;
    } catch (err) {
        console.error("Error fetching section data:", err);
    }

    //document.querySelector('.game-name').textContent = passed_gameNameFriendly;
}

//************************************ GET ALL RECORDS FOR A SECTION BY SECTION ID ************************************//
export async function getRecordsBySectionId(sectionId, recordOrderPreference, hiddenFilter) {
    if (!sectionId) {
        alert("Missing sectionId in URL.");
        return;
    }
    //console.log('sectionId: ' + sectionId + ' recordOrderPreference: ' + recordOrderPreference);

    try {
        const res = await fetch(`/api/db/records/${sectionId}/order/${recordOrderPreference}/hiddenFilter/${hiddenFilter}`);
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


//************************************ UPDATE RECORD COMPLETION ************************************//
export async function updateRecordCompletion(recordId, numberAlreadyCompleted){
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

//************************************ GET ALL GAME TABLES BY GAME ID ************************************//
export async function getGameTablesByGameId(gameId) {
    if (!gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/gameTables/${gameId}`);
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching game data:", err);
    }
}
//************************************ GET TABLE RECORDS BY TABLE ID ************************************//
export async function getTableRecordsByTableId(tableId) {
    if (!tableId) {
        alert("Missing table ID in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/tableRecords/${tableId}`);
        if(res === null){
            console.error("Error fetching table data. Returned null");
            return null;
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching table data:", err);
    }
}

//************************************ UPDATE GAME RECORD ************************************//
export async function updateGameRecord(recordId, sectionId, updateData) {
    if (!recordId || !sectionId || !updateData) {
        alert("Missing record ID, section ID, or update data.");
        return;
    }

    try {
        const res = await fetch(`/api/db/record/update/${recordId}/${sectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!res.ok) {
            console.error("Error updating game record. Status:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error updating game record:", err);
        return null;
    }
}

//************************************ INSERT GAME RECORD ************************************//
export async function insertGameRecord(recordData) {
    if (!recordData) {
        alert("Missing record data.");
        return;
    }

    try {
        const res = await fetch(`/api/db/record/insert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recordData)
        });

        if (!res.ok) {
            console.error("Error inserting game record. Status:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error inserting game record:", err);
        return null;
    }
}


//************************************ UPDATE GAME SECTION ************************************//
export async function updateGameSection(sectionId, gameId, updateData) {
    if (!sectionId || !gameId || !updateData) {
        alert("Missing section ID, game ID, or update data.");
        return;
    }

    try {
        const res = await fetch(`/api/db/section/update/${sectionId}/${gameId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!res.ok) {
            console.error("Error updating game section. Status:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error updating game section:", err);
        return null;
    }
}


//************************************ INSERT GAME SECTION************************************//
export async function insertGameSection(sectionData) {
    if (!sectionData) {
        alert("Missing section data.");
        return;
    }

    try {
        const res = await fetch(`/api/db/section/insert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionData)
        });

        if (!res.ok) {
            console.error("Error inserting game section. Status:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error inserting game section:", err);
        return null;
    }
}


//************************************ UPDATE THE ORDER OF GAME SECTIONS ************************************//
export async function updateGameSectionsListOrder(sectionUpdates) {
    if (!Array.isArray(sectionUpdates) || sectionUpdates.length === 0) {
        alert("Invalid section updates. Expected a non-empty array.");
        return;
    }

    try {
        const res = await fetch(`/api/db/sections/updateListOrder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionUpdates)
        });

        if (!res.ok) {
            console.error("Error updating game sections list order. Status:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error updating game sections list order:", err);
        return null;
    }
}

//************************************ UPDATE THE ORDER OF RECORDS IN A SECTION ************************************//
export async function UpdateSectionRecordsListOrder(recordUpdates) {
    if (!Array.isArray(recordUpdates) || recordUpdates.length === 0) {
        alert("Invalid record updates. Expected a non-empty array.");
        return;
    }

    try {
        const res = await fetch(`/api/db/records/updateListOrder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recordUpdates)
        });

        if (!res.ok) {
            console.error("Error updating game records list order. Status:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error updating game records list order:", err);
        return null;
    }
}


//************************************ DELETE A RECORD ITEM ************************************//
export async function deleteGameRecord(recordId) {
    try {
        if (debugLogging) console.log('deleteGameRecord called with ID:', recordId);
        const res = await fetch(`/api/db/record/delete/${recordId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            return true;
        } else {
            console.error("Failed to delete record. Status:", res.status);
            return false;
        }
    } catch (err) {
        console.error("Error deleting record:", err);
        return false;
    }
}


