$(document).ready(async function () {
    // Define these at the top level so they can be reused
    let gameId = null;
    let gameNameFriendly = null;
    let gameName = null;

    // Fetch game data first
    const result = await loadGameData();
    console.log('result:', result);
    gameId = result.ID;
    gameName = result.Name;
    gameNameFriendly = result.FriendlyName;
    console.log('gameId:' + gameId + ', gameName:' + gameName + ', gameNameFriendly:' + gameNameFriendly);

    // Now safely use the values
    var linkToChecklistPage = '/games/' + gameId + '/checklist.html';
    var linkToTablesPage = '/games/' + gameId + '/tables.html';
    
    $("title").text(gameNameFriendly);
    document.querySelector('.game-name').textContent = gameNameFriendly;

    $(".section-header.link-checklist").attr("href", linkToChecklistPage);
    $(".section-header.link-tables").attr("href", linkToTablesPage);

});




function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('urlParams: ' + urlParams);
    return urlParams.get(param);
}

async function loadGameData() {
    var passed_gameId = getQueryParam('id');
    var passed_gameName = getQueryParam('name');

    if (!passed_gameId) {
        alert("Missing game ID in URL.");
        return;
    }

    try {
        const res = await fetch(`/api/db/games/${passed_gameId}`);
        const data = await res.json();
        console.log('Game data:', data);
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

