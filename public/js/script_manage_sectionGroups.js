import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';
import { initNav } from './script_nav.js';

let gameId = null;
let gameNameFriendly = null;

$(document).ready(async function () {
    const passed_gameId = utils.getQueryParam('gameId');

    const gameData = await dbUtils.getGameData(passed_gameId);
    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;

    $("title").text(gameNameFriendly + ': Section Groups');

    initNav({ currentPage: 'manage_sectionGroups', gameId, gameNameFriendly });

    const mainContainer = $('#container');
    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>Section Groups</h2>');
    mainContainer.append('<div id="grid-manage-sectiongroups-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    await initializeSectionGroupsReorder(gameId, 'grid-manage-sectiongroups-container', 'reset-button');
});

function createSectionGroupCard(sectionGroup, gameId, container) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.draggable = true;
    card.dataset.id = sectionGroup.ID;
    card.dataset.originalOrder = sectionGroup.ListOrder;
    card.dataset.currentOrder = sectionGroup.ListOrder;
    card.innerHTML = `
        <div class="section-card-content">
            <input type="number" class="list-order" value="${sectionGroup.ListOrder}" min="0" />
            <span class="section-name">${sectionGroup.FriendlyName}</span>
            <button class="manage-records-button">Manage Sections</button>
        </div>
    `;

    card.querySelector('.list-order').addEventListener('change', function () {
        card.dataset.currentOrder = parseInt(this.value) || 0;
        highlightChangedCards(container);
    });

    card.querySelector('.manage-records-button').addEventListener('click', () => {
        const hasUnsavedChanges = [...container.children].some((c) => {
            return c.dataset.currentOrder !== c.dataset.originalOrder;
        });

        const confirmNavigate = !hasUnsavedChanges || confirm("You have unsaved changes. Are you sure you want to leave this page?");
        if (confirmNavigate) {
            window.location.href = `/manage_sections?gameId=${gameId}&sectionGroupId=${sectionGroup.ID}`;
        }
    });

    return card;
}

function renderSectionGroups(sectionGroups, container, gameId) {
    container.innerHTML = '';
    sectionGroups.forEach(sg => container.appendChild(createSectionGroupCard(sg, gameId, container)));
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
            draggedItem.classList.add('dropped');
            setTimeout(() => {
                if (draggedItem && draggedItem.classList) {
                    draggedItem.classList.remove('dropped');
                }
            }, 150);

            const droppedItem = draggedItem;
            draggedItem = null;
            updateDroppedOrder(droppedItem);
            highlightChangedCards(container);
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

function updateDroppedOrder(droppedCard) {
    const prev = droppedCard.previousElementSibling;
    const newOrder = prev ? Number(prev.dataset.currentOrder) + 1 : 1;
    const orderInput = droppedCard.querySelector('.list-order');
    orderInput.value = newOrder;
    droppedCard.dataset.currentOrder = newOrder;
}

function highlightChangedCards(container) {
    [...container.children].forEach((card) => {
        const originalOrder = Number(card.dataset.originalOrder);
        const currentOrder = Number(card.dataset.currentOrder);
        if (originalOrder !== currentOrder) {
            card.classList.add('changed');
        } else {
            card.classList.remove('changed');
        }
    });
}

async function initializeSectionGroupsReorder(gameId, containerId, resetButtonId) {
    const container = document.getElementById(containerId);
    const resetButton = document.getElementById(resetButtonId);
    if (!container || !resetButton) return;

    const sectionGroups = await dbUtils.getSectionGroupsByGameId(gameId, false);
    renderSectionGroups(sectionGroups, container, gameId);
    enableDragAndDrop(container);

    resetButton.addEventListener('click', () => {
        renderSectionGroups(sectionGroups, container, gameId);
        highlightChangedCards(container);
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const updated = [...container.children]
            .map((card) => ({
                ID: Number(card.dataset.id),
                ListOrder: Number(card.dataset.currentOrder),
                OriginalOrder: Number(card.dataset.originalOrder)
            }))
            .filter((sg) => sg.ListOrder !== sg.OriginalOrder);

        if (updated.length > 0) {
            const success = await dbUtils.updateSectionGroupsListOrder(updated);
            if (success) {
                alert('List order updated successfully!');
                const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
                renderSectionGroups(fresh, container, gameId);
            } else {
                alert('Failed to update list order.');
            }
        } else {
            alert('No changes to save.');
        }
    });
}
