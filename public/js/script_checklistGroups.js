import * as dbUtils from './script_db_helper.js';
import * as utils from './script_utilities.js';

var debugLogging = false;

let gameId = null;
let gameNameFriendly = null;

const sectionGroupItemTemplate = document.getElementById('section-group-item-template');

$(document).ready(async function () {
    gameId = utils.getQueryParam('gameId');

    // Fetch game data and section groups in parallel
    const [gameData, sectionGroups] = await Promise.all([
        dbUtils.getGameData(gameId),
        dbUtils.getSectionGroupsByGameId(gameId, false)
    ]);

    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;
    const linkToGamePage = `/game?id=${gameId}`;
    if (debugLogging) console.log('linkToGamePage:', linkToGamePage);

    // Populate static page elements
    document.title = gameNameFriendly + ': Checklist Groups';
    document.getElementById('game-name').textContent = gameNameFriendly;
    document.getElementById('back-link').href = linkToGamePage;

    // Render section groups
    renderSectionGroups(sectionGroups);
});

function renderSectionGroups(sectionGroups) {
    if (debugLogging) console.log('SectionGroups:', sectionGroups);
    const container = document.getElementById('section-group-list-container');
    const fragment = document.createDocumentFragment();

    sectionGroups.forEach(sectionGroup => {
        const clone = sectionGroupItemTemplate.content.cloneNode(true);
        const p = clone.querySelector('.game-list-item');
        p.textContent = sectionGroup.FriendlyName;
        p.onclick = () => window.location.href = `checklist?gameId=${gameId}&sectionGroupId=${sectionGroup.ID}`;
        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
}
