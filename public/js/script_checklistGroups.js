import * as dbUtils from './script_db_helper.js';
import * as utils from "./script_utilities.js";


let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let htmlTitle = null;
let linkToGamePage = null;
const linkToHomePage = './';

var debugLogging = false;

$(document).ready(async function () {
    var passed_gameId = utils.getQueryParam('gameId');
    gameId = passed_gameId;

    // Fetch game data first
    const gameData = await dbUtils.getGameData(passed_gameId);
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;
    linkToGamePage = `/game?id=${gameId}`;
    if(debugLogging) console.log('linkToGamePage:', linkToGamePage);
    htmlTitle = gameNameFriendly + ': Checklist Groups';
    
    $("title").text(htmlTitle);

    const mainContainer = $('#container');
    mainContainer.append(`<div class="link-container"> </div>`);
    
    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>Checklist Groups</h2>');

    mainContainer.append('<div id="section-group-list-container"></div>');

    loadSectionGroups();
});

async function loadSectionGroups() {
    try {
        const sectionGroups = await dbUtils.getSectionGroupsByGameId(gameId, false);
        if(debugLogging) console.log('SectionGroups:', sectionGroups)
        const sectionGroupContainer = document.getElementById('section-group-list-container');
        if(debugLogging) console.log('sectionGroupContainer:', sectionGroupContainer);
        sectionGroups.forEach(sectionGroup => {
            const p = document.createElement('p');
            p.className = 'game-list-item';
            p.onclick = () => window.location.href = `checklist?gameId=${gameId}&sectionGroupId=${sectionGroup.ID}`;
            p.textContent = sectionGroup.FriendlyName;
            sectionGroupContainer.appendChild(p);
        });
    } catch (err) {
        console.error('Failed to load sectionGroups:', err);
    }
}

