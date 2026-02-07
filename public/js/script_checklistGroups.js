import * as dbUtils from './script_db_helper.js';
import * as utils from './script_utilities.js';

var debugLogging = false;

let gameId = null;
let gameNameFriendly = null;

const sectionGroupItemTemplate = document.getElementById('section-group-item-template');

$(document).ready(async function () {
    gameId = utils.getQueryParam('gameId');

    // Fetch game data
    const gameData = await dbUtils.getGameData(gameId);
    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;
    const linkToGamePage = `/game?id=${gameId}`;
    if (debugLogging) console.log('linkToGamePage:', linkToGamePage);

    // Populate static page elements
    document.title = gameNameFriendly + ': Checklist Groups';
    document.getElementById('game-name').textContent = gameNameFriendly;
    document.getElementById('back-link').href = linkToGamePage;

    // Load and render section groups
    await loadSectionGroups();
});

async function loadSectionGroups() {
    try {
        const sectionGroups = await dbUtils.getSectionGroupsByGameId(gameId, false);
        if (debugLogging) console.log('SectionGroups:', sectionGroups);
        const container = document.getElementById('section-group-list-container');

        sectionGroups.forEach(sectionGroup => {
            const clone = sectionGroupItemTemplate.content.cloneNode(true);
            const p = clone.querySelector('.game-list-item');
            p.textContent = sectionGroup.FriendlyName;
            p.onclick = () => window.location.href = `checklist?gameId=${gameId}&sectionGroupId=${sectionGroup.ID}`;
            container.appendChild(clone);
        });
    } catch (err) {
        console.error('Failed to load sectionGroups:', err);
    }
}
