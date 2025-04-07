import { loadGameData } from "./script_db_helper.js";
import {getQueryParam} from "./script_utilities.js";

// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let hasDataTables = false;

$(document).ready(async function () {
    var passed_gameId = getQueryParam('id');
    var passed_gameName = getQueryParam('name');

    // Fetch game data first
    const result = await loadGameData(passed_gameId);
    //console.log('result:', result);
    gameId = result.ID;
    gameName = result.Name;
    gameNameFriendly = result.FriendlyName;
    hasDataTables = result.HasDataTables;
    console.log('gameId:' + gameId + ', gameName:' + gameName + ', gameNameFriendly:' + gameNameFriendly);

    // Now safely use the values
    var linkToChecklistPage = `/checklist?id=${gameId}&name=${gameName}`;
    var linkToTablesPage = `/tables?id=${gameId}&name=${gameName}`;

    $("title").text(gameNameFriendly);
    document.querySelector('.game-name').textContent = gameNameFriendly;


    $('#grid-link-container').append(`<a class="section-header link-checklist" href="${linkToChecklistPage}">100% Checklist</a>`);
    
    if(hasDataTables){
        $('#grid-link-container').append(`<a class="section-header link-tables" href="${linkToTablesPage}">Other Tables</a>`);
    }

});


