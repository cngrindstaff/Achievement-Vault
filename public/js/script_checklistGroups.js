import * as dbUtils from './script_db_helper.js';
import * as utils from './script_utilities.js';
import { initNav } from './script_nav.js';

var debugLogging = false;

let gameId = null;
let gameNameFriendly = null;
let isReorderMode = false;

const sectionGroupItemTemplate = document.getElementById('section-group-item-template');

$(document).ready(async function () {
    gameId = utils.getQueryParam('gameId');

    const [gameData, sectionGroups] = await Promise.all([
        dbUtils.getGameData(gameId),
        dbUtils.getSectionGroupsByGameId(gameId, false)
    ]);

    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;
    if (debugLogging) console.log('linkToGamePage:', `/game?id=${gameId}`);

    document.title = gameNameFriendly + ': Checklist Groups';
    document.getElementById('game-name').textContent = gameNameFriendly;

    initNav({ currentPage: 'checklistGroups', gameId, gameNameFriendly });

    renderSectionGroups(sectionGroups);

    // --- TOGGLE REORDER MODE ---
    const toggleBtn = document.getElementById('toggle-reorder-btn');
    const listView = document.getElementById('section-group-list-container');
    const reorderView = document.getElementById('reorder-view');

    toggleBtn.addEventListener('click', async () => {
        isReorderMode = !isReorderMode;
        if (isReorderMode) {
            toggleBtn.textContent = 'Done';
            listView.classList.add('hidden');
            reorderView.classList.remove('hidden');
            const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
            initReorder(fresh);
        } else {
            toggleBtn.textContent = 'Reorder';
            reorderView.classList.add('hidden');
            listView.classList.remove('hidden');
            const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
            listView.innerHTML = '';
            renderSectionGroups(fresh);
        }
    });

    // --- SAVE / RESET ---
    document.getElementById('save-order-btn').addEventListener('click', async () => {
        const container = document.getElementById('grid-reorder-container');
        const updated = [...container.children]
            .map(card => ({
                ID: Number(card.dataset.id),
                ListOrder: Number(card.dataset.currentOrder),
                OriginalOrder: Number(card.dataset.originalOrder)
            }))
            .filter(sg => sg.ListOrder !== sg.OriginalOrder);

        if (updated.length > 0) {
            const success = await dbUtils.updateSectionGroupsListOrder(updated);
            if (success) {
                alert('List order updated successfully!');
                const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
                initReorder(fresh);
            } else {
                alert('Failed to update list order.');
            }
        } else {
            alert('No changes to save.');
        }
    });

    document.getElementById('reset-order-btn').addEventListener('click', async () => {
        const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
        initReorder(fresh);
    });
});

function renderSectionGroups(sectionGroups) {
    if (debugLogging) console.log('SectionGroups:', sectionGroups);
    const container = document.getElementById('section-group-list-container');
    const fragment = document.createDocumentFragment();

    sectionGroups.forEach(sectionGroup => {
        const clone = sectionGroupItemTemplate.content.cloneNode(true);
        const p = clone.querySelector('.game-list-item');
        p.textContent = sectionGroup.FriendlyName;
        p.onclick = () => window.location.href = `checklist?gameId=${gameId}&sectionGroupId=${sectionGroup.ID}`;
        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
}


// ===================== REORDER LOGIC =====================

function initReorder(sectionGroups) {
    const container = document.getElementById('grid-reorder-container');
    container.innerHTML = '';
    sectionGroups.forEach(sg => container.appendChild(createReorderCard(sg, container)));
    enableDragAndDrop(container);
}

function createReorderCard(sg, container) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.draggable = true;
    card.dataset.id = sg.ID;
    card.dataset.originalOrder = sg.ListOrder;
    card.dataset.currentOrder = sg.ListOrder;
    card.innerHTML = `
        <div class="section-card-content">
            <input type="number" class="list-order" value="${sg.ListOrder}" min="0" />
            <span class="section-name">${sg.FriendlyName}</span>
        </div>
    `;

    card.querySelector('.list-order').addEventListener('change', function () {
        card.dataset.currentOrder = parseInt(this.value) || 0;
        highlightChanged(container);
    });

    return card;
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
                if (draggedItem && draggedItem.classList) draggedItem.classList.remove('dropped');
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
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateDroppedOrder(card) {
    const prev = card.previousElementSibling;
    const newOrder = prev ? Number(prev.dataset.currentOrder) + 1 : 1;
    card.querySelector('.list-order').value = newOrder;
    card.dataset.currentOrder = newOrder;
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
