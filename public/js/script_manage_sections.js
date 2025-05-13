import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';

const linkToHomePage = './';

var debugLogging = false;

// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let hasDataTables = false;
let linkToGamePage = null;
let htmlTitle = null;
$(document).ready(async function () {
    var passed_gameId = utils.getQueryParam('gameId');

    // Fetch game data first

    const gameData = await dbUtils.loadGameData(passed_gameId);
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;
    linkToGamePage = `/game?id=${gameId}`;
    htmlTitle = gameNameFriendly + ': Sections';

    $("title").text(htmlTitle);
    
    const mainContainer = $('#container');
    mainContainer.append(`<div class="link-container"> </div>`);
    
    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + htmlTitle + '</h1>');

    mainContainer.append('<div id="grid-manage-sections-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');
    
    await initializeGameSectionsReorder(gameId, 'grid-manage-sections-container', 'reset-button');
    
})


function createSectionCard(section, gameId, container) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.draggable = true;
    card.dataset.id = section.ID;
    card.dataset.originalOrder = section.ListOrder;
    card.dataset.currentOrder = section.ListOrder;
    card.innerHTML = `
        <div class="section-card-content">
            <input type="number" class="list-order" value="${section.ListOrder}" readonly />
            <span class="section-name">${section.Name}</span>
            <button class="manage-records-button">Manage Records</button>
        </div>
    `;

    // Handle the Manage Records button click
    card.querySelector('.manage-records-button').addEventListener('click', () => {
        const hasUnsavedChanges = [...container.children].some((card) => {
            return card.dataset.currentOrder !== card.dataset.originalOrder;
        });

        const sectionId = section.ID;
        const confirmNavigate = !hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to leave this page?");

        if (confirmNavigate) {
            window.location.href = `/manage_sectionRecords?gameId=${gameId}&sectionId=${sectionId}`;
        }
    });
    
    return card;
}

function renderSections(sections, container, gameId) {
    container.innerHTML = '';
    sections.forEach(section => container.appendChild(createSectionCard(section, gameId, container)));
}

function enableDragAndDrop(container) {
    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('section-card')) {
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
            highlightChangedSections(container);
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
    const draggableElements = [...container.querySelectorAll('.section-card:not(.dragging)')];

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
    const sectionCards = [...container.children];
    sectionCards.forEach((card, index) => {
        const orderInput = card.querySelector('.list-order');
        if (orderInput) {
            orderInput.value = index + 1;
            card.dataset.currentOrder = index + 1;
        }
    });
}

function highlightChangedSections(container) {
    const sectionCards = [...container.children];
    sectionCards.forEach((card) => {
        const originalOrder = Number(card.dataset.originalOrder);
        const currentOrder = Number(card.dataset.currentOrder);
        if (originalOrder !== currentOrder) {
            card.classList.add('changed');
        } else {
            card.classList.remove('changed');
        }
    });
}

async function initializeGameSectionsReorder(gameId, containerId, resetButtonId) {
    const container = document.getElementById(containerId);
    const resetButton = document.getElementById(resetButtonId);
    if (!container || !resetButton) return;

    const sections = await dbUtils.loadSectionsByGameId(gameId);
    renderSections(sections, container, gameId);
    enableDragAndDrop(container);

    resetButton.addEventListener('click', () => {
        renderSections(sections, container, gameId);
        highlightChangedSections(container);
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const updatedSections = [...container.children]
            .map((card) => ({
                ID: Number(card.dataset.id),
                ListOrder: Number(card.dataset.currentOrder),
                OriginalOrder: Number(card.dataset.originalOrder)
            }))
            .filter((section) => section.ListOrder !== section.OriginalOrder);

        if (updatedSections.length > 0) {
            const success = await dbUtils.updateGameSectionsListOrder(updatedSections);
            if (success) alert('List order updated successfully!');
            else alert('Failed to update list order.');
        } else {
            alert('No changes to save.');
        }
    });
}