import { getGameDataV2 } from "./script_db_helper.js";
import { getQueryParam } from "./script_utilities.js";

// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let hasDataTables = false;
let countOfSectionGroups = 1;

$(document).ready(async function () {
    var passed_gameId = getQueryParam('id');
    var passed_gameName = getQueryParam('name');

    // Fetch game data first
    const result = await getGameDataV2(passed_gameId);
    console.log('result:', result);
    gameId = result.ID;
    gameName = result.Name;
    gameNameFriendly = result.FriendlyName;
    hasDataTables = result.GameTableCount > 0
    countOfSectionGroups = result.SectionGroupCount;
    console.log('gameId:' + gameId + ', hasDataTables:' + hasDataTables + ', # of sectionGroups:' + countOfSectionGroups);

    // Now safely use the values
    //Set the HTML title
    $("title").text(gameNameFriendly);
    //Set the .game-name element
    document.querySelector('.game-name').textContent = gameNameFriendly;
    
    
    //Generate the URLs
    var linkToChecklistPage = `/checklist?id=${gameId}`;
    var linkToTablesPage = `/table?id=${gameId}`;
    var linkToManageSectionsPage = `/manage_sections?gameId=${gameId}`;
    var linkToSectionGroupsPage = `/checklistGroups?gameId=${gameId}`;

    // $('#grid-link-container').append(`<a class="section-header link-checklist" href="${linkToChecklistPage}">100% Checklist</a>`);
    
    $('#grid-link-container').append(`<a class="section-header link-checklist" href="${linkToSectionGroupsPage}">Checklists</a>`);

    if(hasDataTables){
        $('#grid-link-container').append(`<a class="section-header link-tables" href="${linkToTablesPage}">Other Tables</a>`);
    }
    
    $('#grid-link-container').append(`<a class="section-header link-checklist" href="${linkToManageSectionsPage}">Admin</a>`);

});


