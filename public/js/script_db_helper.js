import {getQueryParam} from "./script_utilities.js";

//can't use env var on client-side js file, so make sure this is 'false' when checking in to GitHub
var debugLogging = false

/** In DevTools: localStorage.setItem('AV_DEBUG_RECORDS','1') then reload. Remove with removeItem. */
export function isAvDebugRecordsEnabled() {
    try {
        return typeof localStorage !== 'undefined' && localStorage.getItem('AV_DEBUG_RECORDS') === '1';
    } catch {
        return false;
    }
}

// Maps UI booleans to the `/api/db/.../:hiddenFilter` segment contract (see `parseHiddenFilter` in `backend/routes/db.js`):
// - false => non-hidden only ('0')
// - true  => include hidden too ('all')
// Explicit strings like '0', '1', 'all' are passed through unchanged.
function normalizeHiddenListFilterParam(hiddenFilter) {
    if (hiddenFilter === true) return 'all';
    if (hiddenFilter === false) return '0';
    return hiddenFilter;
}

/**
 * Same-origin `/api/...` requests: bypass HTTP cache and avoid 304 + empty body edge cases
 * (Express weak ETags, reverse proxies, or identical URLs after toggles).
 */
export function apiFetch(url, init = {}) {
    const sep = url.includes('?') ? '&' : '?';
    const busted = `${url}${sep}_=${Date.now()}`;
    return fetch(busted, { ...init, cache: 'no-store' });
}

//************************************ GET GAME BY ID ************************************//
export async function getGameData(passed_gameId) {
    if (!passed_gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/game/${passed_gameId}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        //if(debugLogging) console.log('Game data:', data);
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

//************************************ INSERT GAME + MAIN SECTION GROUP ************************************//
export async function insertGame(gameData) {
    if (!gameData) {
        alert("Missing game data.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/game/insert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }

        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }

        return JSON.parse(text);
    } catch (err) {
        console.error("Error inserting game:", err);
        return null;
    }
}


//************************************ GET ALL SECTIONS FOR A GAME BY GAME ID ************************************//
export async function getSectionsByGameId(gameId, hiddenFilter) {
    if (!gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        hiddenFilter = normalizeHiddenListFilterParam(hiddenFilter);
        //if(debugLogging) console.log('made it here loadSectionsByGameId');
        const res = await apiFetch(`/api/db/sections/${gameId}/${hiddenFilter}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        //by default, returns ordered by ListOrder asc, ID asc

        //sort by SectionGroupID, ListOrder, ID
/*        data.sort((a, b) =>
            a.SectionGroupID - b.SectionGroupID ||
            a.ListOrder - b.ListOrder ||
            a.ID - b.ID
        );*/
        
        
        //need to just separate these out by groups 
        
        //if(debugLogging) console.log('Section data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        
        
        return data;
    } catch (err) {
        console.error("Error getSectionsByGameId: ", err);
    }
}
//************************************ GET SECTION BY SECTION ID ************************************//
export async function getSectionById(passed_sectionId) {
    if (!passed_sectionId) {
        alert("Missing section ID in URL.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/section/${passed_sectionId}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        //if(debugLogging) console.log('Game data:', data);
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


//************************************ GET ALL RECORDS FOR A SECTION BY SECTION ID, V2, manual ordering ************************************//
export async function getRecordsBySectionIdV2(sectionId, recordOrderPreference, hiddenFilter) {
    if (!sectionId) {
        alert("Missing sectionId in URL.");
        return;
    }
    //if(debugLogging) console.log('sectionId: ' + sectionId );

    try {
        hiddenFilter = normalizeHiddenListFilterParam(hiddenFilter);
        const res = await apiFetch(`/api/db/records/v2/${sectionId}/hiddenFilter/${hiddenFilter}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        if (debugLogging || isAvDebugRecordsEnabled()) {
            const hidden1 = Array.isArray(data) ? data.filter((r) => Number(r?.Hidden) === 1).length : 0;
            const total = Array.isArray(data) ? data.length : 0;
            console.log('[AV_DEBUG_RECORDS] getRecordsBySectionIdV2 (client)', {
                sectionId,
                hiddenFilterSent: hiddenFilter,
                httpStatus: res.status,
                totalRows: total,
                hiddenEq1: hidden1,
                hiddenEq0: total - hidden1,
            });
        }
        //if(debugLogging) console.log('Records data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/

        if(recordOrderPreference === "" || recordOrderPreference === null) {
            recordOrderPreference = "order-name";
        }

        if(recordOrderPreference === "order-name")
        {
            data.sort((a, b) => {
                // First, sort by Order (ascending)
                if (a.ListOrder !== b.ListOrder) {
                    return a.ListOrder - b.ListOrder;
                }
                // If they're equal, sort by Name (case-insensitive ascending)
                return a.Name.localeCompare(b.Name, undefined, { sensitivity: 'base' });
            });
        }  
        else if(recordOrderPreference === "completed-order-name")
        {
            data.sort((a, b) => {
                // First, sort by NumberAlreadyCompleted (ascending)
                if (a.NumberAlreadyCompleted !== b.NumberAlreadyCompleted) {
                    return a.NumberAlreadyCompleted - b.NumberAlreadyCompleted;
                }
                // If they're equal, sort by Order (ascending)
                if (a.ListOrder !== b.ListOrder) {
                    return a.ListOrder - b.ListOrder;
                }
                // If they're equal, sort by Name (case-insensitive ascending)
                return a.Name.localeCompare(b.Name, undefined, { sensitivity: 'base' });
            });
        }
        else if (recordOrderPreference === "completed-name")
        {
            data.sort((a, b) => {
                // First, sort by NumberAlreadyCompleted (ascending)
                if (a.NumberAlreadyCompleted !== b.NumberAlreadyCompleted) {
                    return a.NumberAlreadyCompleted - b.NumberAlreadyCompleted;
                }
                // If they're equal, sort by Name (case-insensitive ascending)
                return a.Name.localeCompare(b.Name, undefined, { sensitivity: 'base' });
            });
        }

        else if (recordOrderPreference === "name")
        {
            data.sort((a, b) => {
                // sort by Name (case-insensitive ascending)
                return a.Name.localeCompare(b.Name, undefined, { sensitivity: 'base' });
            });
        }       
        
        return data;
    } catch (err) {
        console.error("Error fetching game data:", err);
    }
}

//************************************ GET GAME RECORD BY ID ************************************//

export async function getGameRecordById(passed_recordId) {
    if (!passed_recordId) {
        alert("Missing record ID in URL.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/record/${passed_recordId}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        //if(debugLogging) console.log('Game data:', data);
        /*        return {
                    gameId: data.ID,
                    gameNameFriendly: data.FriendlyName || passed_gameName || passed_gameId,
                    gameName: data.Name || passed_gameId,
                };*/
        return data;
    } catch (err) {
        console.error("Error fetching record data:", err);
    }

    //document.querySelector('.game-name').textContent = passed_gameNameFriendly;
}


//************************************ UPDATE RECORD COMPLETION ************************************//
export async function updateRecordCompletion(recordId, numberAlreadyCompleted){
    try {
        const res = await apiFetch(`/api/db/record/updateCompletion/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ numberAlreadyCompleted: numberAlreadyCompleted }),
        });
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
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
        const res = await apiFetch(`/api/db/gameTables/${gameId}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
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
        const res = await apiFetch(`/api/db/tableRecords/${tableId}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error fetching table data:", err);
    }
}

//************************************ UPDATE GAME RECORD ************************************//
export async function updateGameRecord(recordId, updateData) {
    if (!recordId || !updateData) {
        alert("Missing record ID or update data.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/record/update/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
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
        const res = await apiFetch(`/api/db/record/insert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recordData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error inserting game record:", err);
        return null;
    }
}


//************************************ INSERT MULTIPLE GAME RECORDS ************************************//
export async function insertMultipleGameRecords(records) {
    if (!Array.isArray(records) || records.length === 0) {
        alert("No records to insert.");
        return null;
    }

    try {
        const res = await apiFetch('/api/db/records/insertMultiple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(records)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error("Error inserting multiple game records:", err);
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
        const res = await apiFetch(`/api/db/section/update/${sectionId}/${gameId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error updating game section:", err);
        return null;
    }
}

//************************************ DELETE GAME SECTION ************************************//
export async function deleteGameSection(sectionId, gameId) {
    if (!sectionId || !gameId) {
        alert("Missing section ID or game ID.");
        return null;
    }

    try {
        const res = await apiFetch(`/api/db/section/delete/${sectionId}/${gameId}`, {
            method: 'DELETE'
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return null;
        }

        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        return JSON.parse(text);
    } catch (err) {
        console.error("Error deleting section:", err);
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
        const res = await apiFetch(`/api/db/section/insert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error inserting game section:", err);
        return null;
    }
}

//************************************ INSERT MULTIPLE GAME SECTIONS ************************************//
export async function insertMultipleGameSections(sections) {
    if (!Array.isArray(sections) || sections.length === 0) {
        alert("No sections to insert.");
        return null;
    }

    try {
        const res = await apiFetch('/api/db/sections/insertMultiple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sections)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error("Error inserting multiple game sections:", err);
        return null;
    }
}

//************************************ INSERT SECTION GROUP ************************************//
export async function insertSectionGroup(sectionGroupData) {
    if (!sectionGroupData) {
        alert("Missing section group data.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/sectionGroup/insert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionGroupData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error inserting section group:", err);
        return null;
    }
}

//************************************ UPDATE SECTION GROUP ************************************//
export async function updateSectionGroup(sectionGroupId, gameId, updateData) {
    if (!sectionGroupId || !gameId || !updateData) {
        alert("Missing section group ID, game ID, or update data.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/sectionGroup/update/${sectionGroupId}/${gameId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error updating section group:", err);
        return null;
    }
}


//************************************ UPDATE THE ORDER OF SECTION GROUPS ************************************//
export async function updateSectionGroupsListOrder(sectionGroupUpdates) {
    if (!Array.isArray(sectionGroupUpdates) || sectionGroupUpdates.length === 0) {
        alert("Invalid section group updates. Expected a non-empty array.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/sectionGroups/updateListOrder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionGroupUpdates)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return false;
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error updating section groups list order:", err);
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
        const res = await apiFetch(`/api/db/sections/updateListOrder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sectionUpdates)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error updating game sections list order:", err);
        return null;
    }
}

//************************************ UPDATE THE ORDER OF RECORDS IN A SECTION ************************************//
export async function updateSectionRecordsListOrder(recordUpdates) {
    if (!Array.isArray(recordUpdates) || recordUpdates.length === 0) {
        alert("Invalid record updates. Expected a non-empty array.");
        return;
    }

    try {
        const res = await apiFetch(`/api/db/records/updateListOrder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recordUpdates)
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
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
        const res = await apiFetch(`/api/db/record/delete/${recordId}`, {
            method: 'DELETE'
        });

        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        return data;
    } catch (err) {
        console.error("Error deleting record:", err);
        return false;
    }
}

//************************************ GET SECTIONGROUP BY SECTIONGROUP ID  ************************************//
export async function getSectionGroupById(sectionGroupId) {
    if (!sectionGroupId) {
        alert("Missing sectionGroupId in URL.");
        return;
    }

    try {
        //if(debugLogging) console.log('made it here getSectionGroupsByGameId');
        const res = await apiFetch(`/api/db/sectionGroup/${sectionGroupId}`);
        if (!res || !res.ok) {
            console.log('No response or response not ok:', res);
            return [];
        }
        const text = await res.text();
        if (!text) {
            console.log('Response body empty');
            return [];
        }
        const data = JSON.parse(text);
        //if(debugLogging) console.log('SectionGroup data:', data);
        return data;
    } catch (err) {
        console.error("Error fetching SectionGroup data:", err);
    }
}
//************************************ GET ALL SECTIONGROUPS FOR A GAME BY GAME ID ************************************//
async function fetchSectionGroupsByGameIdRaw(gameId, hiddenFilterSegment) {
    const res = await apiFetch(`/api/db/sectionGroups/${gameId}/${hiddenFilterSegment}`);
    if (!res || !res.ok) {
        console.log('No response or response not ok:', res);
        return [];
    }
    const text = await res.text();
    if (!text) {
        console.log('Response body empty');
        return [];
    }
    return JSON.parse(text);
}

function mergeSectionGroupsVisibleAndHidden(visible, hidden) {
    const byId = new Map();
    for (const row of [...(visible || []), ...(hidden || [])]) {
        if (row && row.ID != null) byId.set(row.ID, row);
    }
    return Array.from(byId.values()).sort((a, b) => {
        if ((a.ListOrder || 0) !== (b.ListOrder || 0)) {
            return (a.ListOrder || 0) - (b.ListOrder || 0);
        }
        return (a.ID || 0) - (b.ID || 0);
    });
}

export async function getSectionGroupsByGameId(gameId, hiddenFilter) {
    if (!gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        hiddenFilter = normalizeHiddenListFilterParam(hiddenFilter);
        //if(debugLogging) console.log('made it here getSectionGroupsByGameId');
        if (hiddenFilter === 'all') {
            const [visible, hidden] = await Promise.all([
                fetchSectionGroupsByGameIdRaw(gameId, '0'),
                fetchSectionGroupsByGameIdRaw(gameId, '1'),
            ]);
            return mergeSectionGroupsVisibleAndHidden(visible, hidden);
        }
        return await fetchSectionGroupsByGameIdRaw(gameId, hiddenFilter);
    } catch (err) {
        console.error("Error fetching SectionGroup data:", err);
    }
}

//************************************ GET ALL SECTIONS FOR A GAME BY SECTION GROUP ID ************************************//
async function fetchSectionsBySectionGroupIdRaw(sectionGroupId, hiddenFilterSegment) {
    const res = await apiFetch(`/api/db/sections/sectionGroupId/${sectionGroupId}/${hiddenFilterSegment}`);
    if (!res || !res.ok) {
        console.log('No response or response not ok:', res);
        return [];
    }
    const text = await res.text();
    if (!text) {
        console.log('Response body empty');
        return [];
    }
    return JSON.parse(text);
}

function mergeSectionsVisibleAndHidden(visible, hidden) {
    const byId = new Map();
    for (const row of [...(visible || []), ...(hidden || [])]) {
        if (row && row.ID != null) byId.set(row.ID, row);
    }
    return Array.from(byId.values()).sort((a, b) => {
        if ((a.ListOrder || 0) !== (b.ListOrder || 0)) {
            return (a.ListOrder || 0) - (b.ListOrder || 0);
        }
        return String(a.Name || '').localeCompare(String(b.Name || ''), undefined, { sensitivity: 'base' });
    });
}

export async function getSectionsBySectionGroupId(sectionGroupId, hiddenFilter) {
    if (!sectionGroupId) {
        alert("Missing sectionGroupId in URL.");
        return;
    }

    try {
        hiddenFilter = normalizeHiddenListFilterParam(hiddenFilter);
        //if(debugLogging) console.log('made it here loadSectionsByGameId');
        if(debugLogging) console.log('getSectionsBySectionGroupId sectionGroupId: ' + sectionGroupId);
        // Older DB procs treated NULL as "hidden only" for this endpoint. Request 0 + 1 and merge
        // so "show all sections" works even before the stored procedure is updated.
        if (hiddenFilter === 'all') {
            const [visible, hidden] = await Promise.all([
                fetchSectionsBySectionGroupIdRaw(sectionGroupId, '0'),
                fetchSectionsBySectionGroupIdRaw(sectionGroupId, '1'),
            ]);
            return mergeSectionsVisibleAndHidden(visible, hidden);
        }
        return await fetchSectionsBySectionGroupIdRaw(sectionGroupId, hiddenFilter);
    } catch (err) {
        console.error("Error getSectionsBySectionGroupId: ", err);
    }
}
