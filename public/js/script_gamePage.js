import { loadGameData } from "./script_db_helper.js";
import {getQueryParam} from "./script_utilities.js";

// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;

$(document).ready(async function () {
    var passed_gameId = getQueryParam('id');
    var passed_gameName = getQueryParam('name');
    
    // Fetch game data first
    const result = await loadGameData(passed_gameId);
    //console.log('result:', result);
    gameId = result.ID;
    gameName = result.Name;
    gameNameFriendly = result.FriendlyName;
    console.log('gameId:' + gameId + ', gameName:' + gameName + ', gameNameFriendly:' + gameNameFriendly);

    // Now safely use the values
    var linkToChecklistPage = '/checklist?id=' + gameId + '&name=' + gameName;
    var linkToTablesPage = '/tables?id=' + gameId + '&name=' + gameName;
    
    $("title").text(gameNameFriendly);
    document.querySelector('.game-name').textContent = gameNameFriendly;

    $(".section-header.link-checklist").attr("href", linkToChecklistPage);
    $(".section-header.link-tables").attr("href", linkToTablesPage);

});


