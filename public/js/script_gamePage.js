var linkToHomePage = '../../';
var linkToChecklistPage = '/games/' + gameName + '/' + gameName + '_checklist.html';
var linkToTablesPage = '/games/' + gameName + '/' + gameName + '_tables.html';

$(document).ready(function() {
    //set the title field that's in the head, from the game's HTML
    $("title").text(gameNameFriendly);

    $(".game-name").text(gameNameFriendly);

    $(".section-header.link-checklist").attr("href", linkToChecklistPage);
    $(".section-header.link-tables").attr("href", linkToTablesPage);

 
});
