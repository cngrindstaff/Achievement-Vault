import { getGameData } from "./script_db_helper.js";
import { getQueryParam } from "./script_utilities.js";
import { initNav } from './script_nav.js';

let gameId = null;
let gameNameFriendly = null;
let hasDataTables = false;

const gameLinkTemplate = document.getElementById('game-link-template');

$(document).ready(async function () {
    gameId = getQueryParam('id');

    // Fetch game data
    const result = await getGameData(gameId);
    console.log('result:', result);
    gameId = result.ID;
    gameNameFriendly = result.FriendlyName;
    hasDataTables = result.GameTableCount > 0;
    const countOfSectionGroups = result.SectionGroupCount;
    console.log('gameId:' + gameId + ', hasDataTables:' + hasDataTables + ', # of sectionGroups:' + countOfSectionGroups);

    // Populate static page elements
    document.title = gameNameFriendly;
    document.getElementById('game-name').textContent = gameNameFriendly;

    // Initialize nav — game page shows Home and Back (to Home)
    initNav({ currentPage: 'game', gameId, gameNameFriendly });

    // Build navigation links from template
    const linkContainer = document.getElementById('grid-link-container');

    appendGameLink(linkContainer, `/checklistGroups?gameId=${gameId}`, 'Checklists', 'link-checklist');

    if (hasDataTables) {
        appendGameLink(linkContainer, `/table?id=${gameId}`, 'Other Tables', 'link-tables');
    }

    appendGameLink(linkContainer, `/manage_sectionGroups?gameId=${gameId}`, 'Admin', 'link-checklist');
});

function appendGameLink(container, href, text, extraClass) {
    const clone = gameLinkTemplate.content.cloneNode(true);
    const link = clone.querySelector('a');
    link.href = href;
    link.textContent = text;
    if (extraClass) {
        link.classList.add(extraClass);
    }
    container.appendChild(clone);
}
