import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';
import { initNav } from './script_nav.js';

let gameId = null;
let gameNameFriendly = null;
let sectionId = null;
let sectionGroupId = null;

$(document).ready(async function () {
    const passed_gameId = utils.getQueryParam('gameId');
    const passed_sectionId = utils.getQueryParam('sectionId');
    sectionGroupId = utils.getQueryParam('sectionGroupId');

    const [gameData, sectionData] = await Promise.all([
        dbUtils.getGameData(passed_gameId),
        dbUtils.getSectionById(passed_sectionId)
    ]);

    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;
    sectionId = passed_sectionId;
    const sectionName = sectionData.Name;

    $("title").text(gameNameFriendly + ': Reorder Records');

    initNav({ currentPage: 'reorder_records', gameId, gameNameFriendly, sectionGroupId });

    const mainContainer = $('#container');
    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>' + sectionName + ': Reorder Records</h2>');
    mainContainer.append('<span id="record-count" class="record-count"></span>');
    mainContainer.append('<div id="grid-reorder-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    await initializeReorder(sectionId, 'grid-reorder-container', 'reset-button');
});

function createCard(record, container) {
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
        </div>
    `;

    card.querySelector('.list-order').addEventListener('change', function () {
        card.dataset.currentOrder = parseInt(this.value) || 0;
        highlightChanged(container);
    });

    return card;
}

function render(records, container) {
    container.innerHTML = '';
    records.forEach(record => container.appendChild(createCard(record, container)));
    updateRecordCount();
}

function updateRecordCount() {
    const count = document.getElementById('grid-reorder-container').children.length;
    document.getElementById('record-count').textContent = `${count} records`;
}

function enableDragAndDrop(container) {
    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('record-card')) {
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
    const elements = [...container.querySelectorAll('.record-card:not(.dragging)')];
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

async function initializeReorder(sectionId, containerId, resetButtonId) {
    const container = document.getElementById(containerId);
    const resetButton = document.getElementById(resetButtonId);
    if (!container || !resetButton) return;

    const records = await dbUtils.getRecordsBySectionIdV2(sectionId, null, null);
    render(records, container);
    enableDragAndDrop(container);

    resetButton.addEventListener('click', () => {
        render(records, container);
        highlightChanged(container);
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const updated = [...container.children]
            .map(card => ({
                ID: Number(card.dataset.id),
                ListOrder: Number(card.dataset.currentOrder),
                OriginalOrder: Number(card.dataset.originalOrder)
            }))
            .filter(r => r.ListOrder !== r.OriginalOrder);

        if (updated.length > 0) {
            const success = await dbUtils.updateSectionRecordsListOrder(updated);
            if (success) {
                alert('List order updated successfully!');
                const fresh = await dbUtils.getRecordsBySectionIdV2(sectionId, null, null);
                render(fresh, container);
            } else {
                alert('Failed to update list order.');
            }
        } else {
            alert('No changes to save.');
        }
    });
}
