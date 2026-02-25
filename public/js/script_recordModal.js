/**
 * Shared Add/Edit Record Modal
 * 
 * Usage:
 *   import { initRecordModal } from './script_recordModal.js';
 * 
 *   const modal = initRecordModal({
 *       gameId: 1,
 *       defaultAlreadyCompleted: 0,   // checklist page uses 0, admin uses 1
 *       onSave: async (sectionId) => { ... refresh your page ... }
 *   });
 * 
 *   modal.openForAdd(sectionId, sectionName);
 *   modal.openForEdit(recordId);
 */

import * as dbUtils from './script_db_helper.js';

// ─── Title Case Logic ────────────────────────────────────────────

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

// ─── Modal Factory ───────────────────────────────────────────────

export function initRecordModal({ gameId, defaultAlreadyCompleted = 0, onSave }) {

    // Inject modal HTML into the DOM
    const modalHTML = `
        <div id="add-record-modal" class="modal hidden">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3 id="modal-section-name" style="margin-bottom: 12px;"></h3>
                <form id="new-record-form" class="add-record-container">
                    <label class="switch multi-toggle">
                        <input type="checkbox" id="multi-mode-toggle">
                        <span class="slider"></span>Add Multiple
                    </label>
                    <label class="add-record" id="single-name-label">Name:<input type="text" id="recordName" class="add-record" required></label>
                    <label class="add-record hidden" id="multi-name-label">Names (one per line):<textarea id="recordNames" class="add-record" rows="6" placeholder="Record One&#10;Record Two&#10;Record Three"></textarea></label>
                    <label class="add-record">Description:<textarea id="description" class="add-record" rows="2"></textarea></label>
                    <div class="add-record-row">
                        <label class="add-record">Number of Checkboxes:<input type="number" id="numberOfCheckboxes" class="add-record default-value" min="0" value="1" required></label>
                        <label class="add-record">Number Already Completed:<input type="number" id="numberAlreadyCompleted" class="add-record default-value" min="0" value="${defaultAlreadyCompleted}" required></label>
                    </div>
                    <label class="add-record">List Order:<input type="number" id="listOrder" class="add-record default-value" min="0" value="100" required></label>
                    <label class="add-record">Long Description:<textarea id="longDescription" class="add-record" rows="2"></textarea></label>
                    <label class="modern-checkbox add-record">
                        <input type="checkbox" id="hidden">
                        <span class="checkmark"></span>
                        Hidden
                    </label>
                    <div class="button-container">
                        <button type="submit" id="save-record-button" class="save-button">Save Record</button>
                        <button type="button" id="reset-record-button" class="reset-button">Reset Changes</button>
                        <button type="button" id="delete-record-button" class="delete-button hidden">Delete Record</button>
                    </div>
                    <div id="loading-spinner" class="spinner hidden"></div>
                    <div id="success-message" class="success-message hidden">Record saved successfully!</div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Cache DOM references
    const modal = document.getElementById('add-record-modal');
    const form = document.getElementById('new-record-form');
    const closeBtn = modal.querySelector('.close-modal');
    const multiToggle = document.getElementById('multi-mode-toggle');
    const singleNameLabel = document.getElementById('single-name-label');
    const multiNameLabel = document.getElementById('multi-name-label');
    const recordNameInput = document.getElementById('recordName');
    const recordNamesTextarea = document.getElementById('recordNames');
    const multiToggleLabel = modal.querySelector('.multi-toggle');
    const modalSectionHeading = document.getElementById('modal-section-name');
    const deleteButton = document.getElementById('delete-record-button');

    let currentSectionId = null;

    // ─── Title Case ──────────────────────────────────────────────

    recordNameInput.addEventListener('blur', function () {
        this.value = toTitleCase(this.value);
    });

    recordNamesTextarea.addEventListener('blur', function () {
        this.value = this.value.split('\n').map(line => {
            const trimmed = line.trim();
            return trimmed ? toTitleCase(trimmed) : '';
        }).join('\n');
    });

    // ─── Multi-mode Toggle ───────────────────────────────────────

    multiToggle.addEventListener('change', () => {
        const isMulti = multiToggle.checked;
        singleNameLabel.classList.toggle('hidden', isMulti);
        multiNameLabel.classList.toggle('hidden', !isMulti);
        recordNameInput.required = !isMulti;
        if (isMulti) recordNameInput.value = '';
        else recordNamesTextarea.value = '';
    });

    // ─── Default Value Styling ───────────────────────────────────

    form.querySelectorAll('.default-value').forEach(field => {
        field.addEventListener('focus', () => field.classList.remove('default-value'));
    });

    function restoreDefaults() {
        document.getElementById('numberOfCheckboxes').classList.add('default-value');
        document.getElementById('numberAlreadyCompleted').classList.add('default-value');
        document.getElementById('listOrder').classList.add('default-value');
        multiToggle.checked = false;
        singleNameLabel.classList.remove('hidden');
        multiNameLabel.classList.add('hidden');
        recordNameInput.required = true;
        multiToggleLabel.classList.remove('hidden');
        deleteButton.classList.add('hidden');
    }

    // ─── Open / Close ────────────────────────────────────────────

    function closeModal() {
        modal.classList.add('hidden');
        form.reset();
        delete form.dataset.editId;
        restoreDefaults();
        // Reset success message state
        const successMessage = document.getElementById('success-message');
        successMessage.classList.add('hidden');
        successMessage.classList.remove('fade-out');
    }

    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById('reset-record-button').addEventListener('click', () => {
        form.reset();
        delete form.dataset.editId;
        restoreDefaults();
    });

    function openForAdd(sectionId, sectionName) {
        currentSectionId = sectionId;
        modalSectionHeading.textContent = 'Add to: ' + sectionName;
        modal.classList.remove('hidden');
    }

    async function openForEdit(recordId) {
        const recordData = await dbUtils.getGameRecordById(recordId);
        if (!recordData) return;

        currentSectionId = recordData.SectionID;
        modalSectionHeading.textContent = 'Edit Record';

        // Populate form with existing data
        recordNameInput.value = recordData.Name;
        document.getElementById('description').value = recordData.Description || '';
        document.getElementById('numberOfCheckboxes').value = recordData.NumberOfCheckboxes;
        document.getElementById('numberAlreadyCompleted').value = recordData.NumberAlreadyCompleted;
        document.getElementById('listOrder').value = recordData.ListOrder;
        document.getElementById('longDescription').value = recordData.LongDescription || '';
        document.getElementById('hidden').checked = recordData.Hidden === 1;

        // Remove default styling — these are real values
        document.getElementById('numberOfCheckboxes').classList.remove('default-value');
        document.getElementById('numberAlreadyCompleted').classList.remove('default-value');
        document.getElementById('listOrder').classList.remove('default-value');

        // Hide multi toggle when editing, show delete button
        multiToggleLabel.classList.add('hidden');
        deleteButton.classList.remove('hidden');

        // Store edit ID
        form.dataset.editId = recordId;

        modal.classList.remove('hidden');
    }

    // ─── Form Submission ─────────────────────────────────────────

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const isMultiMode = multiToggle.checked;
        const description = document.getElementById('description').value.trim();
        const numberOfCheckboxes = parseInt(document.getElementById('numberOfCheckboxes').value);
        const numberAlreadyCompleted = parseInt(document.getElementById('numberAlreadyCompleted').value);
        const listOrder = parseInt(document.getElementById('listOrder').value);
        const longDescription = document.getElementById('longDescription').value.trim();
        const hidden = document.getElementById('hidden').checked ? 1 : 0;

        // Validation
        if (numberAlreadyCompleted > numberOfCheckboxes) {
            const completedInput = document.getElementById('numberAlreadyCompleted');
            const checkboxesInput = document.getElementById('numberOfCheckboxes');
            completedInput.classList.add('invalid-input', 'shake');
            checkboxesInput.classList.add('invalid-input', 'shake');
            setTimeout(() => {
                completedInput.classList.remove('shake');
                checkboxesInput.classList.remove('shake');
            }, 300);
            alert("Error: 'Number Already Completed' cannot be greater than 'Number of Checkboxes'.");
            return;
        } else {
            document.getElementById('numberAlreadyCompleted').classList.remove('invalid-input');
            document.getElementById('numberOfCheckboxes').classList.remove('invalid-input');
        }

        if (isMultiMode && !form.dataset.editId) {
            const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            if (names.length === 0) { alert('Please enter at least one name.'); return; }
        } else if (!form.dataset.editId) {
            if (!recordNameInput.value.trim()) { alert('Please enter a name.'); return; }
        }

        const spinner = document.getElementById('loading-spinner');
        const successMessage = document.getElementById('success-message');
        const saveButton = document.getElementById('save-record-button');

        saveButton.classList.add('bounce');
        setTimeout(() => saveButton.classList.remove('bounce'), 500);
        spinner.classList.remove('hidden');
        successMessage.classList.add('hidden');

        try {
            let success;
            const editId = form.dataset.editId;
            const sectionIdInt = parseInt(currentSectionId);
            const gameIdInt = parseInt(gameId);

            if (isMultiMode && !editId) {
                // Multi-insert
                const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
                const records = names.map(name => ({
                    name, description,
                    sectionId: sectionIdInt, gameId: gameIdInt,
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                }));
                success = await dbUtils.insertMultipleGameRecords(records);
            } else if (editId) {
                // Update existing
                const recordData = {
                    recordName: recordNameInput.value.trim(), description,
                    sectionId: sectionIdInt, gameId: gameIdInt,
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                };
                success = await dbUtils.updateGameRecord(editId, recordData);
            } else {
                // Single insert
                const recordData = {
                    recordName: recordNameInput.value.trim(), description,
                    sectionId: sectionIdInt, gameId: gameIdInt,
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                };
                success = await dbUtils.insertGameRecord(recordData);
            }

            if (success) {
                successMessage.classList.remove('hidden');
                setTimeout(async () => {
                    successMessage.classList.add('fade-out');
                    setTimeout(async () => {
                        const savedSectionId = currentSectionId;
                        closeModal();
                        if (onSave) await onSave(savedSectionId);
                    }, 300);
                }, 500);
            } else {
                alert('Failed to save record. Please try again.');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
            console.error(error);
        } finally {
            spinner.classList.add('hidden');
        }
    });

    // ─── Delete Record ─────────────────────────────────────────

    deleteButton.addEventListener('click', async () => {
        const editId = form.dataset.editId;
        if (!editId) return;

        if (!confirm('Are you sure you want to delete this record? This cannot be undone.')) return;

        try {
            const success = await dbUtils.deleteGameRecord(editId);
            if (success) {
                const savedSectionId = currentSectionId;
                closeModal();
                if (onSave) await onSave(savedSectionId);
            } else {
                alert('Failed to delete record. Please try again.');
            }
        } catch (error) {
            alert('An error occurred while deleting.');
            console.error(error);
        }
    });

    // ─── Public API ──────────────────────────────────────────────

    return { openForAdd, openForEdit, closeModal };
}
