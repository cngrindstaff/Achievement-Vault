import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';
import { initRecordModal } from './script_recordModal.js';
import { initNav } from './script_nav.js';

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
    //todo recordorderpref

    linkToGamePage = `/game?id=${gameId}`;
    htmlTitle = gameNameFriendly + ': Section: ' + sectionName + ': Records';

    $("title").text(htmlTitle);

    // Initialize slide-out nav
    initNav({ currentPage: 'manage_sectionRecords', gameId, gameNameFriendly });

    const mainContainer = $('#container');
    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>Section: ' + sectionName + '</h2>');
    mainContainer.append('<h3>Records <span id="record-count" class="record-count"></span></h3>');

    mainContainer.append('<button id="add-record-button" class="add-record-button">Add Record(s)</button>');
    mainContainer.append('<div id="grid-manage-records-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    await initializeGameRecordsReorder(sectionId, 'grid-manage-records-container', 'reset-button');

    // --- ADD/EDIT RECORD MODAL (shared module) ---
    const recordModal = initRecordModal({
        gameId,
        defaultAlreadyCompleted: 1,
        onSave: async () => {
            // Refresh the grid container
            const gridContainer = document.getElementById('grid-manage-records-container');
            const records = await dbUtils.getRecordsBySectionId(sectionId, null);
            renderRecords(records, gridContainer, gameId);
        }
    });

    // Handle the Add Record button click
    document.getElementById('add-record-button').addEventListener('click', () => {
        const gridContainer = document.getElementById('grid-manage-records-container');
        const hasUnsavedChanges = [...gridContainer.children].some((card) => {
            return card.dataset.currentOrder !== card.dataset.originalOrder;
        });

        if (!hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to leave this page?")) {
            recordModal.openForAdd(sectionId, sectionName);
        }
    });

    // Make modal accessible for edit buttons in record cards
    window._recordModal = recordModal;
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
            <input type="number" class="list-order" value="${record.ListOrder}" min="0" />
            <span class="record-name">${record.Name}</span>
            <button class="edit-button" data-id="${record.ID}">Edit</button>
            <button class="delete-button" data-id="${record.ID}">Delete</button>
       </div>
    `;

    // Allow manual order editing
    card.querySelector('.list-order').addEventListener('change', function () {
        card.dataset.currentOrder = parseInt(this.value) || 0;
        highlightChangedRecords(container);
    });

    // Handle the Edit button click
    card.querySelector('.edit-button').addEventListener('click', async (event) => {
        event.stopPropagation();
        const recordId = event.target.dataset.id;
        window._recordModal.openForEdit(recordId);
    });

    // Handle the Delete button click
    card.querySelector('.delete-button').addEventListener('click', async (event) => {
        event.stopPropagation();
        const recordId = event.target.dataset.id;
        const confirmDelete = confirm("Are you sure you want to delete this record?");

        if (confirmDelete) {
            const success = await dbUtils.deleteGameRecord(recordId);
            if (success) {
                alert("Record deleted successfully!");
                card.remove();
                updateRecordCount();
            } else {
                alert("Failed to delete record. Please try again.");
            }
        }
    });
    return card;
}

function renderRecords(records, container, gameId) {
    container.innerHTML = '';
    records.forEach(record => container.appendChild(createRecordCard(record, gameId, container)));
    updateRecordCount();
}

function updateRecordCount() {
    const count = document.getElementById('grid-manage-records-container').children.length;
    document.getElementById('record-count').textContent = `(${count})`;
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

    const records = await dbUtils.getRecordsBySectionId(sectionId, null);
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
            const success = await dbUtils.updateSectionRecordsListOrder(updatedRecords);
            if (success) {
                alert('List order updated successfully!');
                // Re-fetch and re-render with the new order
                const freshRecords = await dbUtils.getRecordsBySectionId(sectionId, null);
                renderRecords(freshRecords, container, gameId);
            } else {
                alert('Failed to update list order.');
            }
        } else {
            alert('No changes to save.');
        }
    });
}