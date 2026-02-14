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
    //todo recordorderpref

    linkToGamePage = `/game?id=${gameId}`;
    htmlTitle = gameNameFriendly + ': Section: ' + sectionName + ': Records';

    $("title").text(htmlTitle);

    const mainContainer = $('#container');
    mainContainer.append(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>Section: ' + sectionName + '</h2>');
    mainContainer.append('<h3>Records <span id="record-count" class="record-count"></span></h3>');

    mainContainer.append('<button id="add-record-button" class="add-record-button">Add Record(s)</button>');
    mainContainer.append('<div id="grid-manage-records-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    // Add modal HTML
    mainContainer.append(`
        <div id="add-record-modal" class="modal hidden">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <form id="new-record-form" class="add-record-container">
                    <label class="switch multi-toggle">
                        <input type="checkbox" id="multi-mode-toggle">
                        <span class="slider"></span>Add Multiple
                    </label>
                    <label class="add-record" id="single-name-label">Name:<input type="text" id="recordName" class="add-record" required></label>
                    <label class="add-record hidden" id="multi-name-label">Names (one per line):<textarea id="recordNames" class="add-record" rows="6" placeholder="Record One&#10;Record Two&#10;Record Three"></textarea></label>
                    <label class="add-record">Description:<textarea id="description" class="add-record" rows="3"></textarea></label>
                    <label class="add-record">Number of Checkboxes:<input type="number" id="numberOfCheckboxes" class="add-record default-value" min="0" value="1" required></label>
                    <label class="add-record">Number Already Completed:<input type="number" id="numberAlreadyCompleted" class="add-record default-value" min="0" value="1" required></label>
                    <label class="add-record">List Order:<input type="number" id="listOrder" class="add-record default-value" min="0" value="100" required></label>
                    <label class="add-record">Long Description:<textarea id="longDescription" class="add-record" rows="5"></textarea></label>
                    <label class="modern-checkbox add-record">
                        <input type="checkbox" id="hidden">
                        <span class="checkmark"></span>
                        Hidden
                    </label>
                    <div class="button-container">
                        <button type="submit" id="save-record-button" class="save-button">Save Record</button>
                        <button type="button" id="reset-record-button" class="reset-button">Reset Changes</button>
                    </div>
                    <div id="loading-spinner" class="spinner hidden"></div>
                    <div id="success-message" class="success-message hidden">Record saved successfully!</div>
                </form>
            </div>
        </div>
    `);

    await initializeGameRecordsReorder(sectionId, 'grid-manage-records-container', 'reset-button');

    // Handle the Add Record button click
    const addRecordButton = document.getElementById('add-record-button');
    const modal = document.getElementById('add-record-modal');
    const closeModal = document.querySelector('.close-modal');
    const newRecordForm = document.getElementById('new-record-form');

    // Multi-mode toggle
    const multiModeToggle = document.getElementById('multi-mode-toggle');
    const singleNameLabel = document.getElementById('single-name-label');
    const multiNameLabel = document.getElementById('multi-name-label');
    const recordNameInput = document.getElementById('recordName');
    const recordNamesTextarea = document.getElementById('recordNames');

    multiModeToggle.addEventListener('change', () => {
        const isMulti = multiModeToggle.checked;
        singleNameLabel.classList.toggle('hidden', isMulti);
        multiNameLabel.classList.toggle('hidden', !isMulti);
        // Toggle required so form validation works correctly
        recordNameInput.required = !isMulti;
        if (isMulti) {
            recordNameInput.value = '';
        } else {
            recordNamesTextarea.value = '';
        }
    });

    addRecordButton.addEventListener('click', () => {
        const gridContainer = document.getElementById('grid-manage-records-container');
        const hasUnsavedChanges = [...gridContainer.children].some((card) => {
            return card.dataset.currentOrder !== card.dataset.originalOrder;
        });

        if (!hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to leave this page?")) {
            modal.classList.remove('hidden');
        }
    });

    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        newRecordForm.reset();
        restoreDefaultStyling();
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
            newRecordForm.reset();
            restoreDefaultStyling();
        }
    });

    // Handle form submission
    newRecordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const isMultiMode = multiModeToggle.checked;
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
            document.getElementById("numberAlreadyCompleted").classList.remove("invalid-input");
            document.getElementById("numberOfCheckboxes").classList.remove("invalid-input");
        }

        // Validate names
        if (isMultiMode) {
            const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            if (names.length === 0) {
                alert("Please enter at least one name.");
                return;
            }
        } else {
            const recordName = document.getElementById("recordName").value.trim();
            if (!recordName) {
                alert("Please enter a name.");
                return;
            }
        }

        const spinner = document.getElementById('loading-spinner');
        const successMessage = document.getElementById('success-message');
        const saveButton = document.getElementById('save-record-button');

        // Trigger the bounce effect
        saveButton.classList.add('bounce');
        setTimeout(() => saveButton.classList.remove('bounce'), 500);

        spinner.classList.remove('hidden');
        successMessage.classList.add('hidden');

        try {
            let success;
            const editId = newRecordForm.dataset.editId;

            if (isMultiMode && !editId) {
                // Multi-insert mode
                const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
                const records = names.map(name => ({
                    name,
                    description,
                    sectionId: parseInt(sectionId),
                    gameId: parseInt(gameId),
                    numberOfCheckboxes,
                    numberAlreadyCompleted,
                    listOrder,
                    longDescription,
                    hidden
                }));
                success = await dbUtils.insertMultipleGameRecords(records);
            } else if (editId) {
                // Update existing record
                const recordName = document.getElementById("recordName").value.trim();
                const recordData = {
                    recordName, description,
                    sectionId: parseInt(sectionId), gameId: parseInt(gameId),
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                };
                success = await dbUtils.updateGameRecord(editId, recordData);
            } else {
                // Single insert
                const recordName = document.getElementById("recordName").value.trim();
                const recordData = {
                    recordName, description,
                    sectionId: parseInt(sectionId), gameId: parseInt(gameId),
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                };
                success = await dbUtils.insertGameRecord(recordData);
            }

            if (success) {
                successMessage.classList.remove('hidden');

                setTimeout(async () => {
                    successMessage.classList.add('fade-out');
                    setTimeout(async () => {
                        modal.classList.add('hidden');
                        newRecordForm.reset();
                        // Clear the edit ID
                        delete newRecordForm.dataset.editId;
                        // Refresh only the grid container
                        const gridContainer = document.getElementById('grid-manage-records-container');
                        const records = await dbUtils.getRecordsBySectionId(sectionId, null);
                        renderRecords(records, gridContainer, gameId);
                    }, 500);
                }, 1500);
            } else {
                alert("Failed to save record. Please try again.");
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
            console.error(error);
        } finally {
            spinner.classList.add('hidden');
        }
    });

    // Title-case logic
    const lowercaseWords = new Set([
        'a', 'an', 'the',
        'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
        'in', 'on', 'at', 'to', 'by', 'of', 'up', 'as', 'if',
        'from', 'into', 'with', 'over', 'than'
    ]);

    function toTitleCase(str) {
        return str.split(' ').map((word, i) => {
            if (!word) return word;
            const lower = word.toLowerCase();
            if (i > 0 && lowercaseWords.has(lower)) return lower;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    // Title-case single name field on blur
    document.getElementById('recordName').addEventListener('blur', function () {
        this.value = toTitleCase(this.value);
    });

    // Title-case each line in multi-name textarea on blur
    document.getElementById('recordNames').addEventListener('blur', function () {
        this.value = this.value.split('\n').map(line => {
            const trimmed = line.trim();
            return trimmed ? toTitleCase(trimmed) : '';
        }).join('\n');
    });

    // Remove default-value styling when user interacts with a field
    const defaultFields = newRecordForm.querySelectorAll('.default-value');
    defaultFields.forEach(field => {
        field.addEventListener('focus', () => field.classList.remove('default-value'));
    });

    // Re-add default-value styling and reset multi mode when form is reset
    function restoreDefaultStyling() {
        document.getElementById('numberOfCheckboxes').classList.add('default-value');
        document.getElementById('numberAlreadyCompleted').classList.add('default-value');
        document.getElementById('listOrder').classList.add('default-value');
        // Reset multi mode
        multiModeToggle.checked = false;
        singleNameLabel.classList.remove('hidden');
        multiNameLabel.classList.add('hidden');
        recordNameInput.required = true;
        document.querySelector('.multi-toggle').classList.remove('hidden');
    }

    // Handle reset button
    document.getElementById('reset-record-button').addEventListener('click', () => {
        newRecordForm.reset();
        // Clear the edit ID when resetting
        delete newRecordForm.dataset.editId;
        restoreDefaultStyling();
    });

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
        const recordData = await dbUtils.getGameRecordById(recordId);
        
        if (recordData) {
            // Populate the form with existing data
            document.getElementById("recordName").value = recordData.Name;
            document.getElementById("description").value = recordData.Description || '';
            document.getElementById("numberOfCheckboxes").value = recordData.NumberOfCheckboxes;
            document.getElementById("numberAlreadyCompleted").value = recordData.NumberAlreadyCompleted;
            document.getElementById("listOrder").value = recordData.ListOrder;
            document.getElementById("longDescription").value = recordData.LongDescription || '';
            document.getElementById("hidden").checked = recordData.Hidden === 1;

            // Remove default styling since these are real values
            document.getElementById("numberOfCheckboxes").classList.remove('default-value');
            document.getElementById("numberAlreadyCompleted").classList.remove('default-value');
            document.getElementById("listOrder").classList.remove('default-value');

            // Hide multi-mode toggle when editing
            document.querySelector('.multi-toggle').classList.add('hidden');

            // Show the modal
            const modal = document.getElementById('add-record-modal');
            modal.classList.remove('hidden');

            // Store the record ID in the form for editing
            const form = document.getElementById('new-record-form');
            form.dataset.editId = recordId;
        }
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