import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';

const linkToHomePage = './';

var debugLogging = false;


// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let hasDataTables = false;
let linkToGamePage = null;
let htmlTitle = null;
$(document).ready(async function () {
    var passed_gameId = utils.getQueryParam('gameId');
    var passed_gameName = utils.getQueryParam('gameName');

    // Fetch game data first
    
    const gameData = await dbUtils.loadGameData(passed_gameId);
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;
    //hasDataTables = gameData.HasDataTables;
    linkToGamePage = `/game?id=${gameId}&name=${gameName}`;
    htmlTitle = gameNameFriendly + ': Sections';

    //set the title field that's in the head using the variable from the game's HTML
    $("title").text(htmlTitle);
    
    // Add sibling elements before grid-checklist-container
    //.append() puts data inside an element at last index and .prepend() puts the prepending elem at first index.
    const mainContainer = $('#container');

    mainContainer.prepend('<h1>' + htmlTitle + '</h1>');

    mainContainer.prepend(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');

    const gridContainer = document.getElementById('grid-manage-sections-container');
    gridContainer.innerHTML = ''; // Clear previous data
    // get the game gameSections, including hidden gameSections
    const gameSections = await dbUtils.loadSectionsByGameId(passed_gameId, null);

    let gameSectionCount = gameSections.length;
    if(gameSectionCount === 0){
        console.log('No game gameSections found for this game ID.');
        //TODO show option to add
        //showNoTablesMessage();
        return;       
    }
    

    for (const gameSection of gameSections) {
        const index = gameSections.indexOf(gameSections);
        const p = document.createElement('p');
        p.className = 'game-section-item';
        p.onclick = () => window.location.href = `game?id=${game.ID}&name=${game.Name}`;
        p.textContent = gameSection.Name;
        container.appendChild(p);
    }


    