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
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;

    sectionId = passed_sectionId;

    linkToGamePage = `/game?id=${gameId}`;
    htmlTitle = gameNameFriendly + ': Add Section';

    $("title").text(htmlTitle);

    const mainContainer = $('#container');
    mainContainer.append(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + htmlTitle + '</h1>');

    mainContainer.append('<div id="grid-add-section-container"></div>');

    const addSectionContainer = $('#grid-add-section-container');
    addSectionContainer.append(`
        <form id="new-section-form" class="add-section-container">
            <label class="add-section">Name:<input type="text" id="sectionName" class="add-section" required></label>
            <label class="add-section">List Order:<input type="number" id="listOrder" class="add-section" min="0" required></label>
            <label class="add-section">Order Preference:
                <select id="orderPreference" class="add-section" required>
                    <option value="order-name">List Order, Name</option>
                    <option value="name">Name</option>
                    <option value="completed-order-name">Number Completed, List Order, Name</option>
                </select>
            </label>
            <label class="add-section">Hidden:<input type="checkbox" id="hidden" class="add-section"></label>
            <button type="submit" id="save-button" class="save-button">Save Section</button>
            <button type="button" id="reset-button" class="reset-button">Reset Changes</button>
            <div id="loading-spinner" class="spinner hidden"></div>
            <div id="success-message" class="success-message hidden">Section saved successfully!</div>
        </form>
`);

    // Add a submit event listener to the form
    //do it this way because it's direct event binding. Don't do it via addSectionContainer because that's a form ELEMENT
    $('#section').on("submit", async (event) => {
        event.preventDefault();

        const sectionName = document.getElementById("sectionName").value.trim();
        const listOrder = parseInt(document.getElementById("listOrder").value);
        const orderPreference = document.getElementById("orderPreference").value;
        const hidden = document.getElementById("hidden").checked ? 1 : 0;

        const sectionData = {
            sectionName,
            gameId: parseInt(gameId),
            listOrder, 
            orderPreference,
            hidden
        };
        
        if (debugLogging) console.log('Section Data:', sectionData);

        const spinner = $('#loading-spinner');
        const successMessage = $('#success-message');
        const saveButton = $('.save-button');

        // Trigger the bounce effect
        saveButton.addClass('bounce');
        setTimeout(() => saveButton.removeClass('bounce'), 500);

        spinner.removeClass('hidden');
        successMessage.addClass('hidden');
        
        
        // Call your function to insert the section
        try {
            const success = await dbUtils.insertGameSection(sectionData);
            if (success) {
                successMessage.removeClass('hidden');

                // Fade out after 1.5 seconds, then redirect
                setTimeout(() => {
                    successMessage.addClass('fade-out');
                    setTimeout(() => {
                        window.location.href = `/manage_sections?gameId=${gameId}`;
                    }, 500); // Wait for fade-out to complete
                }, 1500);

            } else {
                alert("Failed to save section. Please try again.");
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
            console.error(error);
        } finally {
            spinner.addClass('hidden');
        }
        
    });
    
    
    
});
