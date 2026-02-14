import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';

var debugLogging = false;

// Page-level state
let gameId = null;
let gameNameFriendly = null;
let linkToGamePage = null;
let sectionGroupId = null;
let sectionGroupFriendlyName = null;

// Template references (cached on load)
let sectionHeaderTemplate = null;
let sectionBodyTemplate = null;
let checklistItemTemplate = null;

$(document).ready(async function () {
    // Cache template references
    sectionHeaderTemplate = document.getElementById('section-header-template');
    sectionBodyTemplate = document.getElementById('section-body-template');
    checklistItemTemplate = document.getElementById('checklist-item-template');

    // Read query params — no 'var' so we set the module-level variables
    gameId = utils.getQueryParam('gameId');
    sectionGroupId = utils.getQueryParam('sectionGroupId');
    if (debugLogging) console.log('sectionGroupId: ' + sectionGroupId);

    // Fetch game data, section group data, and sections in parallel
    const [gameData, sectionGroupData, sections] = await Promise.all([
        dbUtils.getGameData(gameId),
        dbUtils.getSectionGroupById(sectionGroupId),
        dbUtils.getSectionsBySectionGroupId(sectionGroupId, false)
    ]);

    gameNameFriendly = gameData.FriendlyName;
    linkToGamePage = '/game?id=' + gameId;
    if (debugLogging) console.log('sectionGroupData:', sectionGroupData);
    sectionGroupFriendlyName = sectionGroupData.FriendlyName;

    // Populate static page elements (these already exist in the HTML)
    document.title = gameNameFriendly + ' 100% Completion Checklist';
    document.getElementById('game-name').textContent = gameNameFriendly;
    document.getElementById('section-group-name').textContent = sectionGroupFriendlyName;
    document.getElementById('back-link').href = linkToGamePage;

    // Fetch all section records in parallel
    const allRecordsBySection = await fetchAllRecords(sections);
    renderChecklist(sections, allRecordsBySection, { startExpanded: false, filterValue: null });
    updateAllSectionsCompletion();
    updateTotalCompletion();

    // Event delegation for checkbox changes
    // https://chatgpt.com/share/67c0f24e-db90-8004-be01-0dec495fc388
    // This prevents multiple event bindings by using event delegation.
    // The event is attached to the parent element and delegated to the children.
    $('#grid-checklist-container').on('change', 'input[type="checkbox"]', updateCompletion);

    // Event delegation for section header clicks (toggle collapse)
    // Ignore clicks on the add button
    $('#grid-checklist-container').on('click', '.section-header', function (e) {
        if ($(e.target).closest('.section-add-btn').length) return;
        $(this).next('.section').slideToggle(250);
        $(this).toggleClass('open');
    });

    // Event delegation for add-record button in section headers
    $('#grid-checklist-container').on('click', '.section-add-btn', function (e) {
        e.stopPropagation();
        const header = $(this).closest('.section-header');
        const sectionId = header.data('sectionId');
        const sectionName = header.find('.section-header-text').data('sectionTitle');
        openAddRecordModal(sectionId, sectionName);
    });

    // --- FILTER AND TOGGLE LOGIC ---
    $('#container').on('input', '#filter-input', applyFilterAndRender);
    $('#container').on('change', '#hide-completed-toggle', applyHideCompletedToDOM);
    $('#container').on('change', '#expand-all-toggle', applyExpandAllToDOM);

    function getHideCompleted() {
        // checked = show completed, unchecked = hide completed
        return !$('#hide-completed-toggle').is(':checked');
    } 

    async function applyFilterAndRender() {
        const filterValue = $('#filter-input').val().toLowerCase();
        // Re-fetch sections and records
        const sections = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);
        const allRecordsBySection = await fetchAllRecords(sections);

        // Filter records by name/description
        const filteredSections = [];
        const filteredRecordsBySection = [];
        sections.forEach((section, sectionIndex) => {
            let records = allRecordsBySection[sectionIndex] || [];
            let filteredRecords = !filterValue ? records : records.filter(record => {
                return (record.Name && record.Name.toLowerCase().includes(filterValue)) ||
                       (record.Description && record.Description.toLowerCase().includes(filterValue));
            });
            if (filteredRecords.length > 0) {
                filteredSections.push(section);
                filteredRecordsBySection.push(filteredRecords);
            }
        });

        renderChecklist(filteredSections, filteredRecordsBySection, { startExpanded: true, filterValue });
        updateAllSectionsCompletion();
        updateTotalCompletion();
        applyHideCompletedToDOM();
        if ($('#expand-all-toggle').is(':checked')) {
            applyExpandAllToDOM();
        }
    }

    function applyHideCompletedToDOM() {
        const hideCompleted = getHideCompleted();
        $('.section').each(function () {
            $(this).find('.grid-item-1-row, .grid-item-2-row').each(function () {
                const checkboxes = $(this).find('input[type="checkbox"]');
                const numTotal = checkboxes.length;
                const numChecked = checkboxes.filter(':checked').length;
                if (hideCompleted && numTotal === numChecked) {
                    $(this).hide();
                } else {
                    $(this).show();
                }
            });
        });
    }

    function applyExpandAllToDOM() {
        const expandAll = $('#expand-all-toggle').is(':checked');
        $('.section').each(function () {
            if (expandAll) {
                $(this).slideDown(250);
                $(this).prev('.section-header').addClass('open');
            } else {
                $(this).slideUp(250);
                $(this).prev('.section-header').removeClass('open');
            }
        });
    }

    // --- ADD RECORD MODAL LOGIC ---
    const modal = document.getElementById('add-record-modal');
    const closeModal = document.querySelector('.close-modal');
    const newRecordForm = document.getElementById('new-record-form');
    const multiModeToggle = document.getElementById('multi-mode-toggle');
    const singleNameLabel = document.getElementById('single-name-label');
    const multiNameLabel = document.getElementById('multi-name-label');
    const recordNameInput = document.getElementById('recordName');
    const recordNamesTextarea = document.getElementById('recordNames');
    let modalSectionId = null;

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

    recordNameInput.addEventListener('blur', function () {
        this.value = toTitleCase(this.value);
    });

    recordNamesTextarea.addEventListener('blur', function () {
        this.value = this.value.split('\n').map(line => {
            const trimmed = line.trim();
            return trimmed ? toTitleCase(trimmed) : '';
        }).join('\n');
    });

    // Multi-mode toggle
    multiModeToggle.addEventListener('change', () => {
        const isMulti = multiModeToggle.checked;
        singleNameLabel.classList.toggle('hidden', isMulti);
        multiNameLabel.classList.toggle('hidden', !isMulti);
        recordNameInput.required = !isMulti;
        if (isMulti) recordNameInput.value = '';
        else recordNamesTextarea.value = '';
    });

    function openAddRecordModal(sectionId, sectionName) {
        modalSectionId = sectionId;
        document.getElementById('modal-section-name').textContent = 'Add to: ' + sectionName;
        modal.classList.remove('hidden');
    }

    function closeAddRecordModal() {
        modal.classList.add('hidden');
        newRecordForm.reset();
        restoreModalDefaults();
    }

    function restoreModalDefaults() {
        document.getElementById('numberOfCheckboxes').classList.add('default-value');
        document.getElementById('numberAlreadyCompleted').classList.add('default-value');
        document.getElementById('listOrder').classList.add('default-value');
        multiModeToggle.checked = false;
        singleNameLabel.classList.remove('hidden');
        multiNameLabel.classList.add('hidden');
        recordNameInput.required = true;
    }

    closeModal.addEventListener('click', closeAddRecordModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeAddRecordModal();
    });

    // Default-value styling removal on focus
    newRecordForm.querySelectorAll('.default-value').forEach(field => {
        field.addEventListener('focus', () => field.classList.remove('default-value'));
    });

    document.getElementById('reset-record-button').addEventListener('click', () => {
        newRecordForm.reset();
        restoreModalDefaults();
    });

    // Form submission
    newRecordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const isMultiMode = multiModeToggle.checked;
        const description = document.getElementById('description').value.trim();
        const numberOfCheckboxes = parseInt(document.getElementById('numberOfCheckboxes').value);
        const numberAlreadyCompleted = parseInt(document.getElementById('numberAlreadyCompleted').value);
        const listOrder = parseInt(document.getElementById('listOrder').value);
        const longDescription = document.getElementById('longDescription').value.trim();
        const hidden = document.getElementById('hidden').checked ? 1 : 0;

        if (numberAlreadyCompleted > numberOfCheckboxes) {
            alert("Error: 'Number Already Completed' cannot be greater than 'Number of Checkboxes'.");
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

            if (isMultiMode) {
                const names = recordNamesTextarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
                if (names.length === 0) { alert('Please enter at least one name.'); return; }
                const records = names.map(name => ({
                    name, description,
                    sectionId: parseInt(modalSectionId), gameId: parseInt(gameId),
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                }));
                success = await dbUtils.insertMultipleGameRecords(records);
            } else {
                const recordName = recordNameInput.value.trim();
                if (!recordName) { alert('Please enter a name.'); return; }
                success = await dbUtils.insertGameRecord({
                    recordName, description,
                    sectionId: parseInt(modalSectionId), gameId: parseInt(gameId),
                    numberOfCheckboxes, numberAlreadyCompleted, listOrder, longDescription, hidden
                });
            }

            if (success) {
                successMessage.classList.remove('hidden');
                setTimeout(async () => {
                    successMessage.classList.add('fade-out');
                    setTimeout(async () => {
                        closeAddRecordModal();
                        // Re-fetch and re-render — only expand the section that was added to
                        const sections = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);
                        const allRecordsBySection = await fetchAllRecords(sections);
                        renderChecklist(sections, allRecordsBySection, { startExpanded: false, expandSectionId: modalSectionId });
                        updateAllSectionsCompletion();
                        updateTotalCompletion();
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
});


/*************************************** DATA FETCHING ***************************************/

// Fetch all records for all sections in parallel
async function fetchAllRecords(sections) {
    const recordsPromises = sections.map(section =>
        dbUtils.getRecordsBySectionIdV2(section.ID, section.RecordOrderPreference || null, false)
            .catch(err => {
                console.error(`Failed to load records for section ${section.Name} (ID: ${section.ID})`, err);
                return [];
            })
    );
    return await Promise.all(recordsPromises);
}


/*************************************** RENDERING ***************************************/

// Single unified render function — replaces both processData() and renderFilteredChecklist()
function renderChecklist(sections, allRecordsBySection, options) {
    const { startExpanded = false, filterValue = null, expandSectionId = null } = options;
    const gridContainer = document.getElementById('grid-checklist-container');
    gridContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    sections.forEach((section, sectionIndex) => {
        const sectionTitle = section.Name;
        const sectionTitleClean = utils.createSlug(sectionTitle);

        // Clone and populate section header template
        const headerClone = sectionHeaderTemplate.content.cloneNode(true);
        const headerDiv = headerClone.querySelector('.section-header');
        headerDiv.dataset.section = sectionIndex;
        headerDiv.dataset.sectionId = section.ID;

        const headerText = headerClone.querySelector('.section-header-text');
        headerText.dataset.section = sectionIndex;
        headerText.dataset.sectionTitle = sectionTitle;
        headerText.dataset.sectionTitleClean = sectionTitleClean;
        headerText.textContent = sectionTitle + ' (0%)';

        // Set open state based on whether sections start expanded or this specific section should expand
        const shouldExpand = startExpanded || (expandSectionId != null && String(section.ID) === String(expandSectionId));
        if (shouldExpand) {
            headerDiv.classList.add('open');
        }

        // Clone and populate section body template
        const bodyClone = sectionBodyTemplate.content.cloneNode(true);
        const bodyDiv = bodyClone.querySelector('.section');
        bodyDiv.dataset.section = sectionIndex;
        bodyDiv.style.display = shouldExpand ? 'block' : 'none';

        // Populate with records
        const records = allRecordsBySection[sectionIndex] || [];
        if (records.length === 0) {
            const noRecords = document.createElement('div');
            noRecords.className = 'no-records';
            noRecords.textContent = 'No checklist items found for this section.';
            bodyDiv.appendChild(noRecords);
        } else {
            records.forEach((record, recordIndex) => {
                bodyDiv.appendChild(
                    createChecklistItem(record, recordIndex, sectionIndex, sectionTitleClean, filterValue)
                );
            });
        }

        fragment.appendChild(headerClone);
        fragment.appendChild(bodyClone);
    });

    gridContainer.appendChild(fragment);
}


// Create a single checklist item by cloning the template
function createChecklistItem(record, recordIndex, sectionIndex, sectionTitleClean, filterValue) {
    const clone = checklistItemTemplate.content.cloneNode(true);

    const recordName = record.Name;
    const recordDescription = record.Description;
    const totalCheckboxes = record.NumberOfCheckboxes || 0;
    const completedCheckboxes = record.NumberAlreadyCompleted || 0;
    const recordNameClean = utils.createSlug(recordName);

    // Set the outer div class: 2-row if there's a description, 1-row if not
    const itemDiv = clone.querySelector('.checklist-item');
    itemDiv.className = recordDescription ? 'grid-item-2-row' : 'grid-item-1-row';

    // Populate label and description
    const labelDiv = clone.querySelector('.label');
    const descDiv = clone.querySelector('.description');

    if (filterValue) {
        // Highlight matching text with <mark> tags
        const re = new RegExp(`(${filterValue.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        labelDiv.innerHTML = recordName.replace(re, '<mark>$1</mark>');
        if (recordDescription) {
            descDiv.innerHTML = recordDescription.replace(re, '<mark>$1</mark>');
        } else {
            descDiv.remove();
        }
    } else {
        labelDiv.textContent = recordName;
        if (recordDescription) {
            descDiv.textContent = recordDescription;
        } else {
            descDiv.remove();
        }
    }

    // Create checkbox elements
    const column2 = clone.querySelector('.column2');
    for (let i = 1; i <= totalCheckboxes; i++) {
        column2.appendChild(
            createCheckbox(sectionIndex, recordIndex, i, totalCheckboxes, i <= completedCheckboxes, sectionTitleClean, recordNameClean, record.ID)
        );
    }

    return clone;
}


// Create a single checkbox input element with all data attributes
function createCheckbox(sectionIndex, itemIndex, checkboxNumber, totalCheckboxes, isChecked, sectionTitleClean, itemNameClean, recordId) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    const checkboxName = createStorageItemName(gameId, sectionTitleClean, itemNameClean, checkboxNumber);
    checkbox.className = 'checkbox-' + checkboxName;

    checkbox.dataset.section = sectionIndex;
    checkbox.dataset.item = itemIndex;
    checkbox.dataset.numCheckboxClicked = checkboxNumber;
    checkbox.dataset.numTotalCheckboxes = totalCheckboxes;
    checkbox.dataset.sectionTitleClean = sectionTitleClean;
    checkbox.dataset.itemNameClean = itemNameClean;
    checkbox.dataset.recordId = recordId;
    checkbox.checked = isChecked;

    return checkbox;
}


function createStorageItemName(gameName, sectionNameClean, itemNameClean, i) {
    return `${gameName}--checkbox--${sectionNameClean}--${itemNameClean}--${i}`;
}


/*************************************** CHECKBOX INTERACTION ***************************************/

function updateCompletion() {
    const sectionIndex = $(this).data('section');
    const itemIndex = $(this).data('item');
    const checkboxNum = $(this).data('numCheckboxClicked');
    const sectionTitleClean = $(this).data('sectionTitleClean');
    const itemNameClean = $(this).data('itemNameClean');
    const recordId = $(this).data('recordId');

    if (debugLogging) {
        console.log("updateCompletion called - sectionIndex " + sectionIndex + ". itemIndex " + itemIndex + ". checkboxNum " + checkboxNum +
            ". sectionTitleClean " + sectionTitleClean + ". itemNameClean " + itemNameClean + ". recordId " + recordId);
    }

    var sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    const sectionTitle = sectionHeaderTextDiv.attr('data-section-title');
    if (debugLogging) console.log('sectionTitle: ' + sectionTitle);

    const checkboxItemName = $(this).closest('.grid-item-2-row, .grid-item-1-row').find('.label').text().trim();
    if (debugLogging) console.log("checkboxItemName:", checkboxItemName);

    const checkboxNumberClicked = $(this).attr('data-num-checkbox-clicked');
    const numberOfCheckboxes = $(this).attr('data-num-total-checkboxes');
    if (debugLogging) console.log('checkboxNumberClicked: ' + checkboxNumberClicked);
    if (debugLogging) console.log('numberOfCheckboxes: ' + numberOfCheckboxes);

    let action = '';

    if ($(this).is(':checked')) {
        if (debugLogging) console.log('this item is checked. CheckboxNum: ' + checkboxNum);
        for (let i = 1; i <= checkboxNum; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', true);
        }
        action = 'added';
    } else {
        if (debugLogging) console.log('this item is not checked. CheckboxNum: ' + checkboxNum);
        for (let i = checkboxNum; i <= $(`input[data-section="${sectionIndex}"][data-item="${itemIndex}"]`).length; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', false);
        }
        action = 'removed';
    }

    var numberAlreadyCompleted = "";

    if (action) {
        if (action === "added") {
            numberAlreadyCompleted = checkboxNumberClicked;
        }
        else {
            if (checkboxNumberClicked === 1) numberAlreadyCompleted = 0;
            else numberAlreadyCompleted = checkboxNumberClicked - 1;
        }
        dbUtils.updateRecordCompletion(recordId, numberAlreadyCompleted);
    }

    updateSectionCompletion(sectionIndex);
    updateTotalCompletion();
}


/*************************************** COMPLETION TRACKING ***************************************/

function updateSectionCompletion(sectionIndex) {
    const sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    const checkboxes = $(`input[data-section="${sectionIndex}"]`);
    const checkedCheckboxes = checkboxes.filter(':checked').length;
    const totalCheckboxes = checkboxes.length;
    const sectionCompletion = `${checkedCheckboxes}/${totalCheckboxes}`;

    const sectionTitle = sectionHeaderTextDiv.attr('data-section-title');

    let displayText = `${sectionTitle} (${sectionCompletion})`;
    if (totalCheckboxes > 0) {
        const sectionCompletionPercent = ((checkedCheckboxes / totalCheckboxes) * 100).toFixed(2);
        displayText += ` (${sectionCompletionPercent}%)`;
    }

    sectionHeaderTextDiv.text(displayText);

    // Update data attributes used in total completion
    const sectionHeaderDiv = $(`div.section-header[data-section="${sectionIndex}"]`);
    sectionHeaderDiv.attr("checked-checkboxes", checkedCheckboxes);
    sectionHeaderDiv.attr("total-checkboxes", totalCheckboxes);
}


function updateTotalCompletion() {
    try {
        if (debugLogging) console.log('updateTotalCompletion - made it here');
        let totalCompletionPercent = 0;
        var totalCompletionText = '';
        const sections = $('div.section-header');
        const totalSections = sections.length;
        if (debugLogging) console.log('updateTotalCompletion - totalSections ' + totalSections);

        var totalCheckedCheckboxes = 0;
        var totalCheckboxes = 0;
        sections.each(function () {
            var sectionCheckedCheckboxesInt = parseInt($(this).attr('checked-checkboxes'));
            var sectionTotalCheckboxesInt = parseInt($(this).attr('total-checkboxes'));
            if (debugLogging) console.log('sectionCheckedCheckboxesInt ' + sectionCheckedCheckboxesInt);
            if (debugLogging) console.log('sectionTotalCheckboxesInt ' + sectionTotalCheckboxesInt);

            totalCheckedCheckboxes = totalCheckedCheckboxes + sectionCheckedCheckboxesInt;
            totalCheckboxes = totalCheckboxes + sectionTotalCheckboxesInt;
            if (debugLogging) console.log('totalCheckedCheckboxes ' + totalCheckedCheckboxes);
            if (debugLogging) console.log('totalCheckboxes ' + totalCheckboxes);
        });
        totalCompletionText = totalCheckedCheckboxes + '/' + totalCheckboxes;
        totalCompletionPercent = ((totalCheckedCheckboxes / totalCheckboxes) * 100).toFixed(2);
        $('#total-completion').text(`Total Completion: (${totalCompletionText}) ${totalCompletionPercent}%`);
    } catch (error) {
        console.error(error);
        $('#total-completion').text(`Total Completion: 0.00%`);
    }
}

function updateAllSectionsCompletion() {
    $('span.section-header-text').each(function () {
        const sectionIndex = $(this).data('section');
        updateSectionCompletion(sectionIndex);
    });
}
