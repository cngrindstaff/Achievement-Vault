import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';

const linkToHomePage = './';

var debugLogging = false;

// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;

let sectionId = null;
let sectionName = null;

let linkToGamePage = null;
let htmlTitle = null;

$(document).ready(async function () {
    var passed_gameId = utils.getQueryParam('gameId');
    var passed_sectionId = utils.getQueryParam('sectionId');

    // Fetch game data first

    const gameData = await dbUtils.getGameData(passed_gameId);
    const sectionData = await dbUtils.getSectionById(passed_sectionId);
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;

    sectionId = passed_sectionId;
    sectionName = sectionData.Name;

    linkToGamePage = `/game?id=${gameId}`;
    htmlTitle = gameNameFriendly + ': Section: ' + sectionName + ': Add Record';

    $("title").text(htmlTitle);

    const mainContainer = $('#container');
    mainContainer.append(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + htmlTitle + '</h1>');

    mainContainer.append('<div id="grid-add-record-container"></div>');

/*    const addRecordContainer = $('#grid-add-record-container');
    addRecordContainer.append('<form id="new-record-form"></form>');*/

    const addRecordContainer = $('#grid-add-record-container');
    addRecordContainer.append(`
        <form id="new-record-form" class="add-record-container">
            <label class="add-record">Name:<input type="text" id="recordName" class="add-record" required></label>
            <label class="add-record">Description:<textarea id="description" class="add-record" rows="3"></textarea></label>
            <label class="add-record">Number of Checkboxes:<input type="number" id="numberOfCheckboxes" class="add-record" min="0" required></label>
            <label class="add-record">Number Already Completed:<input type="number" id="numberAlreadyCompleted" class="add-record" min="0" required></label>
            <label class="add-record">List Order:<input type="number" id="listOrder" class="add-record" min="0" required></label>
            <label class="add-record">Long Description:<textarea id="longDescription" class="add-record" rows="5"></textarea></label>
            <label class="add-record">Hidden:<input type="checkbox" id="hidden" class="add-record"></label>
            <button type="submit" id="save-button" class="save-button">Save Record</button>
            <button type="button" id="reset-button" class="reset-button">Reset Changes</button>
            <div id="loading-spinner" class="spinner hidden"></div>
            <div id="success-message" class="success-message hidden">Record saved successfully!</div>
        </form>
`);

    // Add a submit event listener to the form
    //do it this way because it's direct event binding. Don't do it via addRecordContainer because that's a form ELEMENT
    $('#new-record-form').on("submit", async (event) => {
        event.preventDefault();

        const recordName = document.getElementById("recordName").value.trim();
        const description = document.getElementById("description").value.trim();
        const numberOfCheckboxes = parseInt(document.getElementById("numberOfCheckboxes").value);
        const numberAlreadyCompleted = parseInt(document.getElementById("numberAlreadyCompleted").value);
        const listOrder = parseInt(document.getElementById("listOrder").value);
        const longDescription = document.getElementById("longDescription").value.trim();
        const hidden = document.getElementById("hidden").checked ? 1 : 0;

        // Add visual feedback for invalid inputs
        if (numberAlreadyCompleted > numberOfCheckboxes) {
            const completedInput = document.getElementById("numberAlreadyCompleted");
            const checkboxesInput = document.getElementById("numberOfCheckboxes");

            completedInput.classList.add("invalid-input", "shake");
            checkboxesInput.classList.add("invalid-input", "shake");

            setTimeout(() => {
                completedInput.classList.remove("shake");
                checkboxesInput.classList.remove("shake");
            }, 300);

            alert("Error: 'Number Already Completed' cannot be greater than 'Number of Checkboxes'.");
            return;
        } else {
            // Remove any existing error styles
            document.getElementById("numberAlreadyCompleted").classList.remove("invalid-input");
            document.getElementById("numberOfCheckboxes").classList.remove("invalid-input");
        }

        const recordData = {
            recordName,
            description,
            sectionId: parseInt(sectionId),
            gameId: parseInt(gameId),
            numberOfCheckboxes,
            numberAlreadyCompleted,
            listOrder,
            longDescription,
            hidden
        };
        
        if (debugLogging) console.log('Record Data:', recordData);

        const spinner = $('#loading-spinner');
        const successMessage = $('#success-message');
        const saveButton = $('.save-button');

        // Trigger the bounce effect
        saveButton.addClass('bounce');
        setTimeout(() => saveButton.removeClass('bounce'), 500);

        spinner.removeClass('hidden');
        successMessage.addClass('hidden');
        
        
        // Call your function to insert the record
        try {
            const success = await dbUtils.insertGameRecord(recordData);
            if (success) {
                successMessage.removeClass('hidden');

                // Fade out after 1.5 seconds, then redirect
                setTimeout(() => {
                    successMessage.addClass('fade-out');
                    setTimeout(() => {
                        window.location.href = `/manage_sectionRecords?gameId=${gameId}&sectionId=${sectionId}`;
                    }, 500); // Wait for fade-out to complete
                }, 1500);

            } else {
                alert("Failed to save record. Please try again.");
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
            console.error(error);
        } finally {
            spinner.addClass('hidden');
        }
        
    });
    
    
    
});
