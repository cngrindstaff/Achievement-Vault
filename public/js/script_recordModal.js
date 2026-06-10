/**
 * Shared Add/Edit Record Modal
 * 
 * Usage:
 *   import { initRecordModal } from './script_recordModal.js';
 * 
 *   const modal = initRecordModal({
 *       gameId: 1,
 *       defaultAlreadyCompleted: 0,   // checklist page uses 0, admin uses 1
 *       onSave: async (sectionId) => { ... refresh your page ... },
 *       getRecordIdsForSection: (sectionId) => [1, 2, 3]
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
    let forceCapitalize = true;
    return str.split(/\s+/).map((word) => {
        if (!word) return word;

        const match = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'’-]*)(.*)$/);
        if (!match) {
            forceCapitalize = /[)\].:;!?]$/.test(word);
            return word;
        }

        const prefix = match[1];
        const core = match[2];
        const suffix = match[3];
        const lowerCore = core.toLowerCase();
        const shouldLowercaseMinor = !forceCapitalize && lowercaseWords.has(lowerCore);
        const normalizedCore = shouldLowercaseMinor
            ? lowerCore
            : lowerCore.charAt(0).toUpperCase() + lowerCore.slice(1);

        const rebuilt = `${prefix}${normalizedCore}${suffix}`;
        forceCapitalize = /[)\].:;!?]$/.test(rebuilt);
        return rebuilt;
    }).join(' ');
}

// ─── Modal Factory ───────────────────────────────────────────────

export function initRecordModal({ gameId, defaultAlreadyCompleted = 0, onSave, getRecordIdsForSection }) {

    // Inject modal HTML into the DOM
    const modalHTML = `
        <div id="add-record-modal" class="modal hidden">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="record-modal-heading">
                    <h3 id="modal-section-name"></h3>
                    <div class="record-edit-navigation">
                        <button type="button" id="record-edit-previous" class="record-edit-nav hidden" aria-label="Edit previous record" title="Previous record">
                            <i class="fas fa-chevron-left" aria-hidden="true"></i>
                        </button>
                        <span id="record-edit-position" class="record-edit-position hidden"></span>
                        <button type="button" id="record-edit-next" class="record-edit-nav hidden" aria-label="Edit next record" title="Next record">
                            <i class="fas fa-chevron-right" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
                <form id="new-record-form" class="add-record-container">
                    <label class="modern-checkbox add-record">
                        <input type="checkbox" id="preserve-casing">
                        <span class="checkmark"></span>
                        Override auto-casing
                    </label>
                    <label class="add-record hidden" id="single-name-label">Name:<input type="text" id="recordName" class="add-record"></label>
                    <label class="add-record" id="multi-name-label">Name(s) (one per line):<textarea id="recordNames" class="add-record" rows="6" placeholder="Record One&#10;Record Two&#10;Record Three" required></textarea></label>
                    <label class="add-record">Description:<textarea id="description" class="add-record" rows="2"></textarea></label>
                    <div class="add-record-row">
                        <label class="add-record">Number of Checkboxes:<input type="number" id="numberOfCheckboxes" class="add-record default-value" min="0" value="1" required></label>
                        <label class="add-record">Number Already Completed:<input type="number" id="numberAlreadyCompleted" class="add-record default-value" min="0" value="${defaultAlreadyCompleted}" required></label>
                    </div>
                    <label class="add-record">List Order:<input type="number" id="listOrder" class="add-record default-value" min="0" value="1" required></label>
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
    const singleNameLabel = document.getElementById('single-name-label');
    const multiNameLabel = document.getElementById('multi-name-label');
    const recordNameInput = document.getElementById('recordName');
    const recordNamesTextarea = document.getElementById('recordNames');
    const preserveCasingInput = document.getElementById('preserve-casing');
    const modalSectionHeading = document.getElementById('modal-section-name');
    const deleteButton = document.getElementById('delete-record-button');
    const previousButton = document.getElementById('record-edit-previous');
    const nextButton = document.getElementById('record-edit-next');
    const positionText = document.getElementById('record-edit-position');

    let currentSectionId = null;
    let initialFormState = null;
    let sectionRecordIds = [];
    let navigationInProgress = false;

    function captureFormState() {
        return JSON.stringify([
            recordNameInput.value,
            recordNamesTextarea.value,
            document.getElementById('description').value,
            document.getElementById('numberOfCheckboxes').value,
            document.getElementById('numberAlreadyCompleted').value,
            document.getElementById('listOrder').value,
            document.getElementById('longDescription').value,
            document.getElementById('hidden').checked
        ]);
    }

    function formIsDirty() {
        return initialFormState !== null && captureFormState() !== initialFormState;
    }

    // ─── Title Case (only after the user focuses a name field) ───

    let nameFieldTouched = false;

    function resetNameFieldTouched() {
        nameFieldTouched = false;
    }

    function applyNameTitleCase() {
        if (preserveCasingInput.checked || !nameFieldTouched) return;
        if (form.dataset.editId) {
            recordNameInput.value = toTitleCase(recordNameInput.value.trim());
        } else {
            recordNamesTextarea.value = recordNamesTextarea.value.split('\n').map(line => {
                const trimmed = line.trim();
                return trimmed ? toTitleCase(trimmed) : '';
            }).join('\n');
        }
    }

    recordNameInput.addEventListener('focus', () => { nameFieldTouched = true; });
    recordNamesTextarea.addEventListener('focus', () => { nameFieldTouched = true; });
    recordNameInput.addEventListener('blur', applyNameTitleCase);
    recordNamesTextarea.addEventListener('blur', applyNameTitleCase);

    function setAddNameFieldsVisible(isAdd) {
        singleNameLabel.classList.toggle('hidden', isAdd);
        multiNameLabel.classList.toggle('hidden', !isAdd);
        recordNameInput.required = !isAdd;
        recordNamesTextarea.required = isAdd;
    }

    // ─── Default Value Styling ───────────────────────────────────

    form.querySelectorAll('.default-value').forEach(field => {
        field.addEventListener('focus', () => field.classList.remove('default-value'));
    });

    function restoreDefaults() {
        document.getElementById('numberOfCheckboxes').classList.add('default-value');
        document.getElementById('numberAlreadyCompleted').classList.add('default-value');
        document.getElementById('listOrder').classList.add('default-value');
        preserveCasingInput.checked = false;
        resetNameFieldTouched();
        setAddNameFieldsVisible(true);
        deleteButton.classList.add('hidden');
        setRecordNavigation([]);
    }

    function setRecordNavigation(recordIds, currentRecordId = null) {
        sectionRecordIds = Array.isArray(recordIds)
            ? recordIds.map((id) => String(id))
            : [];
        const currentIndex = sectionRecordIds.indexOf(String(currentRecordId));
        const showNavigation = currentIndex >= 0 && sectionRecordIds.length > 1;

        previousButton.classList.toggle('hidden', !showNavigation);
        nextButton.classList.toggle('hidden', !showNavigation);
        positionText.classList.toggle('hidden', !showNavigation);
        previousButton.disabled = !showNavigation || currentIndex === 0;
        nextButton.disabled = !showNavigation || currentIndex === sectionRecordIds.length - 1;
        positionText.textContent = showNavigation
            ? `Record ${currentIndex + 1} of ${sectionRecordIds.length}`
            : '';
    }

    // ─── Open / Close ────────────────────────────────────────────

    function closeModal(force = false) {
        if (!force && formIsDirty()) {
            if (!confirm('You have unsaved changes. Discard them?')) return;
        }
        modal.classList.add('hidden');
        form.reset();
        delete form.dataset.editId;
        restoreDefaults();
        initialFormState = null;
        const successMessage = document.getElementById('success-message');
        successMessage.classList.add('hidden');
        successMessage.classList.remove('fade-out');
    }

    closeBtn.addEventListener('click', () => closeModal());
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById('reset-record-button').addEventListener('click', async () => {
        const editId = form.dataset.editId;
        if (editId) {
            await openForEdit(editId, sectionRecordIds);
            return;
        }
        form.reset();
        delete form.dataset.editId;
        restoreDefaults();
    });

    function openForAdd(sectionId, sectionName) {
        currentSectionId = sectionId;
        modalSectionHeading.textContent = 'Add to: ' + sectionName;
        setAddNameFieldsVisible(true);
        resetNameFieldTouched();
        modal.classList.remove('hidden');
        initialFormState = captureFormState();
    }

    async function openForEdit(recordId, recordIds = null) {
        const recordData = await dbUtils.getGameRecordById(recordId);
        if (!recordData) return;

        currentSectionId = recordData.SectionID;
        modalSectionHeading.textContent = 'Edit Record: ' + recordData.Name;

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

        setAddNameFieldsVisible(false);
        deleteButton.classList.remove('hidden');
        resetNameFieldTouched();

        // Store edit ID
        form.dataset.editId = recordId;

        const ids = recordIds || (
            typeof getRecordIdsForSection === 'function'
                ? getRecordIdsForSection(currentSectionId)
                : []
        );
        setRecordNavigation(ids, recordId);
        modal.classList.remove('hidden');
        initialFormState = captureFormState();
    }

    function getEditPayload() {
        applyNameTitleCase();
        return {
            recordName: recordNameInput.value.trim(),
            description: document.getElementById('description').value.trim(),
            sectionId: parseInt(currentSectionId),
            gameId: parseInt(gameId),
            numberOfCheckboxes: parseInt(document.getElementById('numberOfCheckboxes').value),
            numberAlreadyCompleted: parseInt(document.getElementById('numberAlreadyCompleted').value),
            listOrder: parseInt(document.getElementById('listOrder').value),
            longDescription: document.getElementById('longDescription').value.trim(),
            hidden: document.getElementById('hidden').checked ? 1 : 0
        };
    }

    function editPayloadIsValid(recordData) {
        if (!form.reportValidity()) return false;
        if (recordData.numberAlreadyCompleted > recordData.numberOfCheckboxes) {
            const completedInput = document.getElementById('numberAlreadyCompleted');
            const checkboxesInput = document.getElementById('numberOfCheckboxes');
            completedInput.classList.add('invalid-input', 'shake');
            checkboxesInput.classList.add('invalid-input', 'shake');
            setTimeout(() => {
                completedInput.classList.remove('shake');
                checkboxesInput.classList.remove('shake');
            }, 300);
            alert("Error: 'Number Already Completed' cannot be greater than 'Number of Checkboxes'.");
            return false;
        }
        document.getElementById('numberAlreadyCompleted').classList.remove('invalid-input');
        document.getElementById('numberOfCheckboxes').classList.remove('invalid-input');

        if (!recordData.recordName) {
            alert('Please enter a name.');
            return false;
        }
        return true;
    }

    async function saveCurrentEdit() {
        const editId = form.dataset.editId;
        if (!editId) return false;
        const recordData = getEditPayload();
        if (!editPayloadIsValid(recordData)) return false;

        const success = await dbUtils.updateGameRecord(editId, recordData);
        if (!success) {
            alert('Failed to save record. Please try again.');
            return false;
        }
        initialFormState = captureFormState();
        if (onSave) await onSave(currentSectionId);
        return true;
    }

    async function navigateToRecord(offset) {
        if (navigationInProgress) return;
        const currentIndex = sectionRecordIds.indexOf(String(form.dataset.editId));
        const targetId = sectionRecordIds[currentIndex + offset];
        if (!targetId) return;

        navigationInProgress = true;
        previousButton.disabled = true;
        nextButton.disabled = true;
        try {
            if (formIsDirty()) {
                const saved = await saveCurrentEdit();
                if (!saved) {
                    setRecordNavigation(sectionRecordIds, form.dataset.editId);
                    return;
                }
            }
            await openForEdit(targetId, sectionRecordIds);
        } catch (error) {
            alert('An error occurred while changing records.');
            console.error(error);
            setRecordNavigation(sectionRecordIds, form.dataset.editId);
        } finally {
            navigationInProgress = false;
        }
    }

    previousButton.addEventListener('click', () => navigateToRecord(-1));
    nextButton.addEventListener('click', () => navigateToRecord(1));

    // ─── Form Submission ─────────────────────────────────────────

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const editId = form.dataset.editId;
        applyNameTitleCase();
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

        if (!editId) {
            const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            if (names.length === 0) { alert('Please enter at least one name.'); return; }
        } else if (!recordNameInput.value.trim()) {
            alert('Please enter a name.');
            return;
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
            const sectionIdInt = parseInt(currentSectionId);
            const gameIdInt = parseInt(gameId);

            if (!editId) {
                const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
                const records = names.map(name => ({
                    name, description,
                    sectionId: sectionIdInt, gameId: gameIdInt,
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                }));
                success = await dbUtils.insertMultipleGameRecords(records);
            } else {
                const recordData = {
                    recordName: recordNameInput.value.trim(), description,
                    sectionId: sectionIdInt, gameId: gameIdInt,
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                };
                success = await dbUtils.updateGameRecord(editId, recordData);
            }

            if (success) {
                successMessage.classList.remove('hidden');
                setTimeout(async () => {
                    successMessage.classList.add('fade-out');
                    setTimeout(async () => {
                        const savedSectionId = currentSectionId;
                        closeModal(true);
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
                closeModal(true);
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
