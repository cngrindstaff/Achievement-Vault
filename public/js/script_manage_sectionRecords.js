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

    const gameData = await dbUtils.loadGameData(passed_gameId);
    const sectionData = await dbUtils.getSectionById(passed_sectionId);
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;
    
    sectionId = passed_sectionId;
    sectionName = sectionData.Name;
    //todo recordorderpref

    linkToGamePage = `/game?id=${gameId}`;
    htmlTitle = gameNameFriendly + ': Section: ' + sectionName + ': Records';

    $("title").text(htmlTitle);

    const mainContainer = $('#container');
    mainContainer.append(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + htmlTitle + '</h1>');

    mainContainer.append('<div id="grid-manage-records-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    await initializeGameRecordsReorder(sectionId, 'grid-manage-records-container', 'reset-button');

})


function createRecordCard(record, gameId, container) {
    const card = document.createElement('div');
    card.className = 'record-card';
    card.draggable = true;
    card.dataset.id = record.ID;
    card.dataset.originalOrder = record.ListOrder;
    card.dataset.currentOrder = record.ListOrder;
    card.innerHTML = `
        <div class="record-card-content">
            <input type="number" class="list-order" value="${record.ListOrder}" readonly />
            <span class="record-name">${record.Name}</span>
        </div>
    `;

    return card;
}

function renderRecords(records, container, gameId) {
    container.innerHTML = '';
    records.forEach(record => container.appendChild(createRecordCard(record, gameId, container)));
}

function enableDragAndDrop(container) {
    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('record-card')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    container.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');

            // Add the "dropped" class for the snap-back animation
            draggedItem.classList.add('dropped');

            // Remove the "dropped" class after the animation completes
            setTimeout(() => {
                if (draggedItem && draggedItem.classList) {
                    draggedItem.classList.remove('dropped');
                }
            }, 150);

            draggedItem = null;
            updateListOrders(container);
            highlightChangedRecords(container);
        }
    });


    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggingElement = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(draggingElement);
        } else {
            container.insertBefore(draggingElement, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.record-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateListOrders(container) {
    const recordCards = [...container.children];
    recordCards.forEach((card, index) => {
        const orderInput = card.querySelector('.list-order');
        if (orderInput) {
            orderInput.value = index + 1;
            card.dataset.currentOrder = index + 1;
        }
    });
}

function highlightChangedRecords(container) {
    const recordCards = [...container.children];
    recordCards.forEach((card) => {
        const originalOrder = Number(card.dataset.originalOrder);
        const currentOrder = Number(card.dataset.currentOrder);
        if (originalOrder !== currentOrder) {
            card.classList.add('changed');
        } else {
            card.classList.remove('changed');
        }
    });
}

async function initializeGameRecordsReorder(sectionId, containerId, resetButtonId) {
    const container = document.getElementById(containerId);
    const resetButton = document.getElementById(resetButtonId);
    if (!container || !resetButton) return;

    const records = await dbUtils.loadRecordsBySectionId(sectionId, null);
    renderRecords(records, container, gameId);
    enableDragAndDrop(container);

    resetButton.addEventListener('click', () => {
        renderRecords(records, container, gameId);
        highlightChangedRecords(container);
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const updatedRecords = [...container.children]
            .map((card) => ({
                ID: Number(card.dataset.id),
                ListOrder: Number(card.dataset.currentOrder),
                OriginalOrder: Number(card.dataset.originalOrder)
            }))
            .filter((record) => record.ListOrder !== record.OriginalOrder);

        if (updatedRecords.length > 0) {
            const success = await dbUtils.UpdateSectionRecordsListOrder(updatedRecords);
            if (success) alert('List order updated successfully!');
            else alert('Failed to update list order.');
        } else {
            alert('No changes to save.');
        }
    });
}