import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';
import { initNav } from './script_nav.js';


let gameId = null;
let gameNameFriendly = null;
let sectionGroupId = null;
let editingSectionId = null;
let editingSection = null;

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

    $("title").text(gameNameFriendly + ': ' + sectionGroupName + ': Sections');

    initNav({ currentPage: 'manage_sections', gameId, gameNameFriendly });

    const mainContainer = $('#container');
    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>' + sectionGroupName + ': Sections</h2>');

    mainContainer.append('<div id="grid-manage-sections-container"></div>');
    mainContainer.append('<button id="save-button" class="save-button">Save Order</button>');
    mainContainer.append('<button id="reset-button" class="reset-button">Reset Changes</button>');

    await initializeGameSectionsReorder(sectionGroupId, 'grid-manage-sections-container', 'reset-button');

    // --- EDIT SECTION MODAL ---
    const editModalHTML = `
        <div id="edit-section-modal" class="modal hidden">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3 id="edit-section-modal-title">Edit Section</h3>
                <form id="edit-section-form" class="add-record-container">
                    <label class="add-record">Name:<input type="text" id="edit-section-name" class="add-record" required></label>
                    <label class="add-record">Description:<textarea id="edit-section-description" class="add-record" rows="3" maxlength="250"></textarea></label>
                    <label class="add-record">
                        <input type="checkbox" id="edit-section-hidden"> Hidden
                    </label>
                    <button type="submit" class="save-btn">Save</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', editModalHTML);

    const editModal = document.getElementById('edit-section-modal');
    editModal.querySelector('.close-modal').addEventListener('click', () => editModal.classList.add('hidden'));
    window.addEventListener('click', (e) => { if (e.target === editModal) editModal.classList.add('hidden'); });

    document.getElementById('edit-section-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!editingSectionId) return;

        const updateData = {
            sectionName: document.getElementById('edit-section-name').value.trim() || null,
            description: document.getElementById('edit-section-description').value.trim() || null,
            hidden: document.getElementById('edit-section-hidden').checked ? 1 : 0,
            listOrder: editingSection.ListOrder,
            recordOrderPreference: editingSection.RecordOrderPreference
        };

        await dbUtils.updateGameSection(editingSectionId, gameId, updateData);
        editModal.classList.add('hidden');

        const container = document.getElementById('grid-manage-sections-container');
        const fresh = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);
        renderSections(fresh, container, gameId);
    });
})


function openEditModal(section) {
    editingSectionId = section.ID;
    editingSection = section;
    document.getElementById('edit-section-modal-title').textContent = `Edit: ${section.Name}`;
    document.getElementById('edit-section-name').value = section.Name || '';
    document.getElementById('edit-section-description').value = section.Description || '';
    document.getElementById('edit-section-hidden').checked = !!section.Hidden;
    document.getElementById('edit-section-modal').classList.remove('hidden');
}

function createSectionCard(section, gameId, container) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.draggable = true;
    card.dataset.id = section.ID;
    card.dataset.originalOrder = section.ListOrder;
    card.dataset.currentOrder = section.ListOrder;
    card.innerHTML = `
        <div class="section-card-content">
            <input type="number" class="list-order" value="${section.ListOrder}" min="0" />
            <span class="section-name">${section.Name}</span>
            <button class="edit-section-btn edit-button">Edit</button>
            <button class="manage-records-button">Manage Records</button>
        </div>
    `;

    card.querySelector('.list-order').addEventListener('change', function () {
        card.dataset.currentOrder = parseInt(this.value) || 0;
        highlightChangedSections(container);
    });

    card.querySelector('.edit-section-btn').addEventListener('click', () => {
        openEditModal(section);
    });

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

            const droppedItem = draggedItem;
            draggedItem = null;
            updateDroppedOrder(droppedItem);
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

function updateDroppedOrder(droppedCard) {
    const prev = droppedCard.previousElementSibling;
    const newOrder = prev ? Number(prev.dataset.currentOrder) + 1 : 1;
    const orderInput = droppedCard.querySelector('.list-order');
    orderInput.value = newOrder;
    droppedCard.dataset.currentOrder = newOrder;
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

async function initializeGameSectionsReorder(sectionGroupId, containerId, resetButtonId) {
    const container = document.getElementById(containerId);
    const resetButton = document.getElementById(resetButtonId);
    if (!container || !resetButton) return;

    const sections = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);
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
            if (success) {
                alert('List order updated successfully!');
                const fresh = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);
                renderSections(fresh, container, gameId);
            } else {
                alert('Failed to update list order.');
            }
        } else {
            alert('No changes to save.');
        }
    });
}