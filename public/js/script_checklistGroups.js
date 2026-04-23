import * as dbUtils from './script_db_helper.js';
import * as utils from './script_utilities.js';
import { initNav } from './script_nav.js';

var debugLogging = false;

let gameId = null;
let gameNameFriendly = null;
let isReorderMode = false;
let currentSectionGroups = [];
const sectionGroupNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let sectionGroupModalApi = null;

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

    currentSectionGroups = sectionGroups;
    renderSectionGroups(currentSectionGroups);

    const addSectionGroupBtn = document.getElementById('add-section-group-btn');
    sectionGroupModalApi = initSectionGroupModal(addSectionGroupBtn);

    // --- TOGGLE REORDER MODE ---
    const toggleBtn = document.getElementById('toggle-reorder-btn');
    const listView = document.getElementById('section-group-list-container');
    const reorderView = document.getElementById('reorder-view');

    toggleBtn.addEventListener('click', async () => {
        isReorderMode = !isReorderMode;
        if (isReorderMode) {
            toggleBtn.textContent = 'Done';
            addSectionGroupBtn.classList.add('hidden');
            listView.classList.add('hidden');
            reorderView.classList.remove('hidden');
            const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
            currentSectionGroups = fresh;
            initReorder(fresh);
        } else {
            toggleBtn.textContent = 'Reorder';
            addSectionGroupBtn.classList.remove('hidden');
            reorderView.classList.add('hidden');
            listView.classList.remove('hidden');
            const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
            currentSectionGroups = fresh;
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
                currentSectionGroups = fresh;
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
        currentSectionGroups = fresh;
        initReorder(fresh);
    });
});

function initSectionGroupModal(addSectionGroupBtn) {
    const modalHtml = `
        <div id="section-group-edit-modal" class="modal hidden">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3 id="section-group-modal-title">Add Section Group</h3>
                <form id="section-group-edit-form" class="add-record-container">
                    <label class="add-record">Name:<input type="text" id="section-group-edit-name" class="add-record" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use lowercase letters, numbers, and hyphens only." required></label>
                    <label id="section-group-edit-friendly-name-row" class="add-record">Friendly Name:<input type="text" id="section-group-edit-friendly-name" class="add-record" required></label>
                    <label class="add-record">Description:<textarea id="section-group-edit-description" class="add-record" rows="3" maxlength="500"></textarea></label>
                    <label class="add-record">List Order:<input type="number" id="section-group-edit-listorder" class="add-record" min="0" required></label>
                    <button type="submit" class="save-btn">Save</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('section-group-edit-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const modalTitle = document.getElementById('section-group-modal-title');
    const form = document.getElementById('section-group-edit-form');
    const nameInput = document.getElementById('section-group-edit-name');
    const friendlyNameRow = document.getElementById('section-group-edit-friendly-name-row');
    const friendlyNameInput = document.getElementById('section-group-edit-friendly-name');
    const descriptionInput = document.getElementById('section-group-edit-description');
    const listOrderInput = document.getElementById('section-group-edit-listorder');
    let modalMode = 'add';
    let editingSectionGroupId = null;

    function openForAdd() {
        const maxOrder = currentSectionGroups.reduce((max, item) => Math.max(max, item.ListOrder || 0), 0);
        modalMode = 'add';
        editingSectionGroupId = null;
        modalTitle.textContent = 'Add Section Group';
        friendlyNameRow.classList.remove('hidden');
        friendlyNameInput.required = true;
        nameInput.value = '';
        nameInput.setCustomValidity('');
        friendlyNameInput.value = '';
        descriptionInput.value = '';
        listOrderInput.value = maxOrder + 1;
        modal.classList.remove('hidden');
    }

    function openForEdit(sectionGroup) {
        modalMode = 'edit';
        editingSectionGroupId = sectionGroup.ID;
        modalTitle.textContent = `Edit Section Group: ${sectionGroup.FriendlyName}`;
        friendlyNameRow.classList.remove('hidden');
        friendlyNameInput.required = true;
        nameInput.value = sectionGroup.Name || '';
        nameInput.setCustomValidity('');
        friendlyNameInput.value = sectionGroup.FriendlyName || '';
        descriptionInput.value = sectionGroup.Description || '';
        listOrderInput.value = sectionGroup.ListOrder || 0;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    addSectionGroupBtn.addEventListener('click', openForAdd);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const sectionGroupName = nameInput.value.trim();
        const sectionGroupFriendlyName = friendlyNameInput.value.trim();
        const description = descriptionInput.value.trim() || null;
        const listOrder = parseInt(listOrderInput.value, 10) || 0;

        if (!sectionGroupNamePattern.test(sectionGroupName)) {
            nameInput.setCustomValidity('Use lowercase letters, numbers, and hyphens only.');
            nameInput.reportValidity();
            return;
        }
        nameInput.setCustomValidity('');

        if (modalMode === 'add' && (!sectionGroupName || !sectionGroupFriendlyName)) {
            alert('Please provide both Name and Friendly Name.');
            return;
        }
        if (modalMode === 'edit' && (!sectionGroupName || !sectionGroupFriendlyName)) {
            alert('Please provide both Name and Friendly Name.');
            return;
        }

        let result = null;
        if (modalMode === 'add') {
            result = await dbUtils.insertSectionGroup({
                sectionGroupName,
                sectionGroupFriendlyName,
                gameId,
                listOrder,
                hidden: 0,
                description
            });
        } else {
            result = await dbUtils.updateSectionGroup(editingSectionGroupId, gameId, {
                sectionGroupName,
                sectionGroupFriendlyName,
                description,
                listOrder
            });
        }

        if (!result) {
            alert(modalMode === 'add' ? 'Failed to add section group.' : 'Failed to update section group.');
            return;
        }

        closeModal();
        const fresh = await dbUtils.getSectionGroupsByGameId(gameId, false);
        currentSectionGroups = fresh;
        const listView = document.getElementById('section-group-list-container');
        listView.innerHTML = '';
        renderSectionGroups(fresh);
    });

    return { openForEdit };
}

function renderSectionGroups(sectionGroups) {
    if (debugLogging) console.log('SectionGroups:', sectionGroups);
    const container = document.getElementById('section-group-list-container');
    const fragment = document.createDocumentFragment();

    sectionGroups.forEach(sectionGroup => {
        const clone = sectionGroupItemTemplate.content.cloneNode(true);
        const sectionGroupItem = clone.querySelector('.section-group-item');
        const groupLink = clone.querySelector('.section-group-link');
        const editButton = clone.querySelector('.section-group-edit-btn');
        groupLink.textContent = sectionGroup.FriendlyName;
        sectionGroupItem.onclick = () => window.location.href = `checklist?gameId=${gameId}&sectionGroupId=${sectionGroup.ID}`;
        editButton.addEventListener('click', (event) => {
            event.stopPropagation();
            sectionGroupModalApi?.openForEdit(sectionGroup);
        });
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
