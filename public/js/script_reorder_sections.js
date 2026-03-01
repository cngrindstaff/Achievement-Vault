import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';
import { initNav } from './script_nav.js';

let gameId = null;
let gameNameFriendly = null;
let sectionGroupId = null;

$(document).ready(async function () {
    const passed_gameId = utils.getQueryParam('gameId');
    sectionGroupId = utils.getQueryParam('sectionGroupId');

    const [gameData, sectionGroupData] = await Promise.all([
        dbUtils.getGameData(passed_gameId),
        dbUtils.getSectionGroupById(sectionGroupId)
    ]);

    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;
    const sectionGroupName = sectionGroupData.FriendlyName;

    $("title").text(gameNameFriendly + ': Reorder Sections');

    initNav({ currentPage: 'reorder_sections', gameId, gameNameFriendly, sectionGroupId });

    const mainContainer = $('#container');
    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>' + sectionGroupName + ': Reorder Sections</h2>');
    mainContainer.append('<div id="grid-reorder-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    await initializeReorder(sectionGroupId, 'grid-reorder-container', 'reset-button');
});

async function getAllSections(sectionGroupId) {
    const [visible, hidden] = await Promise.all([
        dbUtils.getSectionsBySectionGroupId(sectionGroupId, false),
        dbUtils.getSectionsBySectionGroupId(sectionGroupId, true)
    ]);
    const all = [...(visible || []), ...(hidden || [])];
    all.sort((a, b) => (a.ListOrder || 0) - (b.ListOrder || 0));
    return all;
}

function createCard(section, container) {
    const card = document.createElement('div');
    card.className = 'section-card' + (section.Hidden ? ' hidden-card' : '');
    card.draggable = true;
    card.dataset.id = section.ID;
    card.dataset.originalOrder = section.ListOrder;
    card.dataset.currentOrder = section.ListOrder;
    const hiddenBadge = section.Hidden ? '<span class="hidden-badge">Hidden</span>' : '';
    card.innerHTML = `
        <div class="section-card-content">
            <input type="number" class="list-order" value="${section.ListOrder}" min="0" />
            <span class="section-name">${section.Name}${hiddenBadge}</span>
        </div>
    `;

    card.querySelector('.list-order').addEventListener('change', function () {
        card.dataset.currentOrder = parseInt(this.value) || 0;
        highlightChanged(container);
    });

    return card;
}

function render(sections, container) {
    container.innerHTML = '';
    sections.forEach(section => container.appendChild(createCard(section, container)));
}

function enableDragAndDrop(container) {
    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('section-card')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    container.addEventListener('dragend', () => {
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
            highlightChanged(container);
        }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(dragging);
        } else {
            container.insertBefore(dragging, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll('.section-card:not(.dragging)')];
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateDroppedOrder(droppedCard) {
    const prev = droppedCard.previousElementSibling;
    const newOrder = prev ? Number(prev.dataset.currentOrder) + 1 : 1;
    droppedCard.querySelector('.list-order').value = newOrder;
    droppedCard.dataset.currentOrder = newOrder;
}

function highlightChanged(container) {
    [...container.children].forEach(card => {
        if (Number(card.dataset.originalOrder) !== Number(card.dataset.currentOrder)) {
            card.classList.add('changed');
        } else {
            card.classList.remove('changed');
        }
    });
}

async function initializeReorder(sectionGroupId, containerId, resetButtonId) {
    const container = document.getElementById(containerId);
    const resetButton = document.getElementById(resetButtonId);
    if (!container || !resetButton) return;

    const sections = await getAllSections(sectionGroupId);
    render(sections, container);
    enableDragAndDrop(container);

    resetButton.addEventListener('click', () => {
        render(sections, container);
        highlightChanged(container);
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const updated = [...container.children]
            .map(card => ({
                ID: Number(card.dataset.id),
                ListOrder: Number(card.dataset.currentOrder),
                OriginalOrder: Number(card.dataset.originalOrder)
            }))
            .filter(s => s.ListOrder !== s.OriginalOrder);

        if (updated.length > 0) {
            const success = await dbUtils.updateGameSectionsListOrder(updated);
            if (success) {
                alert('List order updated successfully!');
                const fresh = await getAllSections(sectionGroupId);
                render(fresh, container);
            } else {
                alert('Failed to update list order.');
            }
        } else {
            alert('No changes to save.');
        }
    });
}
