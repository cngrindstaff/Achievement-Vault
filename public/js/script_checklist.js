import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';
import {getSectionGroupsByGameId} from "./script_db_helper.js";

const sendGridUrl = '/api/send-email';
const googleSheetsAppendUrl = '/api/google-sheets-append';
const linkToHomePage = './';

var debugLogging = false;

// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let hasDataTables = false;
let linkToGamePage = null;
let sectionGroupId = null;
let sectionGroupName = null;
let sectionGroupFriendlyName = null;

$(document).ready(async function () {
    var gameId = utils.getQueryParam('gameId');
    var sectionGroupId = utils.getQueryParam('sectionGroupId');
if (debugLogging) console.log('sectionGroupId: ' + sectionGroupId);
    // Fetch game data first
    const gameData = await dbUtils.getGameData(gameId);
    //console.log('gameData:', gameData);
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;
    linkToGamePage = '/game?id=' + gameId;

    const sectionGroupData = await dbUtils.getSectionGroupById(sectionGroupId);
    if (debugLogging) console.log('sectionGroupData:', sectionGroupData);
    sectionGroupName = sectionGroupData.Name;
    sectionGroupFriendlyName = sectionGroupData.FriendlyName;
    
    //set the title field that's in the head using the variable from the game's HTML
    const titleElement = document.querySelector('title');
    titleElement.textContent = gameNameFriendly + ' 100% Completion Checklist';

    //.append() puts data inside an element at last index and .prepend() puts the prepending elem at first index.
    const mainContainer = $('#container');

    mainContainer.append('<div class="link-container"> </div>');
    const linkContainerDiv = $('.link-container');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.append('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');

    mainContainer.append('<h1>' + gameNameFriendly + '</h1>');
    mainContainer.append('<h2>100% Completion Checklist</h2>');
    mainContainer.append('<h3>Section: ' + sectionGroupFriendlyName + '</h3>'); 

    mainContainer.append('<p id="total-completion">Total Completion: 0%</p>');
    mainContainer.append('<div style="display: flex; justify-content: flex-end; width: 100%;"><input id="filter-input" type="text" placeholder="Filter by name or description..." class="filter-input" style="width:33%;"></div>');
    mainContainer.append('<div style="display: flex; justify-content: flex-end; width: 100%; margin-bottom: 10px;"><label class="switch"><input type="checkbox" id="hide-completed-toggle" checked><span class="slider"></span>Show Completed</label></div>');
    mainContainer.append('<div style="display: flex; justify-content: flex-end; width: 100%; margin-bottom: 16px;"><label class="switch"><input type="checkbox" id="expand-all-toggle"><span class="slider"></span>Expand All</label></div>');
    mainContainer.append('<div id="grid-checklist-container"></div>');
    


    /*
        mainContainer.prepend('<p id="total-completion">Total Completion: 0%</p>');
        mainContainer.prepend('<h1>' + gameNameFriendly + ' 100% Completion Checklist</h1>');
    
        mainContainer.prepend(`<div class="link-container"> </div>`);
        const linkContainerDiv = $('.link-container');
        if(hasDataTables){
            linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');
        }
        linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');
    */


    // Fetch sections for that game
    const sections = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);

    await processData(sections);
    updateAllSectionsCompletion(); // Update section percentages
    updateTotalCompletion(); // Calculate initial total completion percentage    


    //https://chatgpt.com/share/67c0f24e-db90-8004-be01-0dec495fc388
    // 🔥 This line prevents multiple event bindings by using event delegation
    //Previously, I was using Direct Binding, and every time new elements were added dynamically (i.e., checkboxes were added inside generateChecklist), the listener got 
    //reattached.
    //This line changes from Direct Binding to Event Delegation. 
    //The event is attached to the parent element, and the event is delegated to the children.
    //It needs to be inside the document ready function, so it's only called once. And it needs to happen after generateChecklist() is defined, but before any 
    //checkboxes are clicked.
    $('#grid-checklist-container').on('change', 'input[type="checkbox"]', updateCompletion); 

    // --- FILTER AND EXPAND LOGIC ---
    function getHideCompleted() {
        // Now: checked means show completed, unchecked means hide completed
        return !$("#hide-completed-toggle").is(":checked");
    }

    async function applyFilterAndRender() {
        const filterValue = $('#filter-input').val().toLowerCase();
        const hideCompleted = getHideCompleted();
        // Re-fetch sections and records
        const sections = await dbUtils.getSectionsBySectionGroupId(sectionGroupId, false);
        const recordsPromises = sections.map(section =>
            dbUtils.getRecordsBySectionIdV2(section.ID, section.RecordOrderPreference || null, false)
                .catch(() => [])
        );
        const allRecordsBySection = await Promise.all(recordsPromises);

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
        renderFilteredChecklist(filteredSections, filteredRecordsBySection, filterValue);
        updateAllSectionsCompletion();
        updateTotalCompletion();
        // After rendering, apply hide completed if toggle is checked
        applyHideCompletedToDOM();
        // Apply expand all if checked
        if ($('#expand-all-toggle').is(':checked')) {
            applyExpandAllToDOM();
        }
    }

    function applyHideCompletedToDOM() {
        const hideCompleted = getHideCompleted();
        $('.section').each(function() {
            $(this).find('.grid-item-1-row, .grid-item-2-row').each(function() {
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
        const expandAll = $("#expand-all-toggle").is(":checked");
        $('.section').each(function() {
            if (expandAll) {
                $(this).show();
                $(this).prev('.section-header').find('i').removeClass('fa-chevron-down').addClass('fa-chevron-up');
            } else {
                $(this).hide();
                $(this).prev('.section-header').find('i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
            }
        });
    }

    $('#container').on('input', '#filter-input', applyFilterAndRender);
    $('#container').on('change', '#hide-completed-toggle', applyHideCompletedToDOM);
    $('#container').on('change', '#expand-all-toggle', applyExpandAllToDOM);

    async function renderFilteredChecklist(sections, allRecordsBySection, filterValue) {
        const gridContainer = $('#grid-checklist-container');
        gridContainer.empty();
        const sectionFragments = [];
        sections.forEach((section, sectionIndex) => {
            const sectionId = section.ID;
            const sectionTitle = section.Name;
            const sectionTitleClean = utils.createSlug(sectionTitle);
            const sectionHeader = $(`
                <div class="section-header" data-section="${sectionIndex}">
                    <span class="section-header-text" data-section="${sectionIndex}" data-section-title="${sectionTitle}" data-section-title-clean="${sectionTitleClean}">
                        ${sectionTitle} (0%)
                    </span>
                    <span class="section-header-icon">
                        <i class="fas fa-chevron-up"></i>
                    </span>
                </div>
            `);
            // Section body is visible for filtered
            const sectionBody = $(`<div class="section" data-section="${sectionIndex}" style="display: block;"></div>`);
            const records = allRecordsBySection[sectionIndex] || [];
            if (records.length === 0) {
                sectionBody.append(`<div class="no-records">No checklist items found for this section.</div>`);
            } else {
                records.forEach((record, recordIndex) => {
                    const recordName = record.Name;
                    const recordId = record.ID;
                    const recordDescription = record.Description;
                    const totalCheckboxes = record.NumberOfCheckboxes || 0;
                    const completedCheckboxes = record.NumberAlreadyCompleted || 0;
                    const recordNameClean = utils.createSlug(recordName);
                    const checkboxesHTML = generateCheckboxes(
                        sectionIndex,
                        recordIndex,
                        totalCheckboxes,
                        completedCheckboxes,
                        sectionTitleClean,
                        recordNameClean,
                        recordId
                    );
                    // Highlight match
                    let labelHTML = recordName;
                    let descHTML = recordDescription ? recordDescription : '';
                    if (filterValue) {
                        const re = new RegExp(`(${filterValue.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                        labelHTML = recordName.replace(re, '<mark>$1</mark>');
                        if (descHTML) descHTML = descHTML.replace(re, '<mark>$1</mark>');
                    }
                    const recordHTML = `
                        <div class="grid-item-${recordDescription ? '2' : '1'}-row">
                            <div class="column1">
                                <div class="label">${labelHTML}</div>
                                ${descHTML ? `<div class="description">${descHTML}</div>` : ''}
                            </div>
                            <div class="column2">
                                ${checkboxesHTML}
                            </div>
                        </div>
                    `;
                    sectionBody.append(recordHTML);
                });
            }
            sectionHeader.on('click', function () {
                $(this).next('.section').toggle();
                // Toggle icon
                const icon = $(this).find('i');
                icon.toggleClass('fa-chevron-down fa-chevron-up');
            });
            sectionFragments.push(sectionHeader, sectionBody);
        });
        gridContainer.append(sectionFragments);
    }

});

async function processData(sections) {
    const gridContainer = $('#grid-checklist-container');
    gridContainer.empty();

    // Pre-fetch all records in parallel
    const recordsPromises = sections.map(section =>
        dbUtils.getRecordsBySectionIdV2(section.ID, section.RecordOrderPreference || null, false)
            .catch(err => {
                console.error(`Failed to load records for section ${section.Name} (ID: ${section.ID})`, err);
                return []; // Fallback to empty array on error
            })
    );
    const allRecordsBySection = await Promise.all(recordsPromises);

    const sectionFragments = [];

    sections.forEach((section, sectionIndex) => {
        const sectionId = section.ID;
        const sectionTitle = section.Name;
        const sectionTitleClean = utils.createSlug(sectionTitle);

        const sectionHeader = $(`
            <div class="section-header" data-section="${sectionIndex}">
                <span class="section-header-text" data-section="${sectionIndex}" data-section-title="${sectionTitle}" data-section-title-clean="${sectionTitleClean}">
                    ${sectionTitle} (0%)
                </span>
                <span class="section-header-icon">
                    <i class="fas fa-chevron-down"></i>
                </span>
            </div>
        `);

        const sectionBody = $(`<div class="section" data-section="${sectionIndex}" style="display: none;"></div>`);

        const records = allRecordsBySection[sectionIndex] || [];
        if (records.length === 0) {
            sectionBody.append(`<div class="no-records">No checklist items found for this section.</div>`);
        } else {
            records.forEach((record, recordIndex) => {
                const recordName = record.Name;
                const recordId = record.ID;
                const recordDescription = record.Description;
                const totalCheckboxes = record.NumberOfCheckboxes || 0;
                const completedCheckboxes = record.NumberAlreadyCompleted || 0;
                const recordNameClean = utils.createSlug(recordName);

                const checkboxesHTML = generateCheckboxes(
                    sectionIndex,
                    recordIndex,
                    totalCheckboxes,
                    completedCheckboxes,
                    sectionTitleClean,
                    recordNameClean,
                    recordId
                );

                const recordHTML = `
                    <div class="grid-item-${recordDescription ? '2' : '1'}-row">
                        <div class="column1">
                            <div class="label">${recordName}</div>
                            ${recordDescription ? `<div class="description">${recordDescription}</div>` : ''}
                        </div>
                        <div class="column2">
                            ${checkboxesHTML}
                        </div>
                    </div>
                `;

                sectionBody.append(recordHTML);
            });
        }

        sectionHeader.on('click', function () {
            $(this).next('.section').toggle();
        });

        sectionFragments.push(sectionHeader, sectionBody);
    });

    gridContainer.append(sectionFragments);
}


/*async function sendEmail(thisSubject, thisText) {
    try {
        const response = await fetch(sendGridUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: thisSubject,
                text: thisText
            })
        });

        const emailResponse = await response.json();
        if (debugLogging) console.log("Response:", emailResponse);
    } catch (error) {
        console.error("Error:", error);
    }
}*/


/*async function sendDataToSheets(gameName, sectionName, itemName, action, checkboxNumberClicked) {
    const dateTimeNowUtc = new Date().toISOString()
    const data = [dateTimeNowUtc, gameName, sectionName, itemName, action, checkboxNumberClicked]; 

    const response = await fetch(googleSheetsAppendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ rowData: data }),
    });

    const sheetsResponse = await response.json();
    if (debugLogging) console.log(sheetsResponse);
}*/

function createStorageItemName(gameName, sectionNameClean, itemNameClean, i) {
    var storageItemName = `${gameName}--checkbox--${sectionNameClean}--${itemNameClean}--${i}`;
    return storageItemName;
}


// Helper function to generate checkboxes, using the DB info for if the item has been checked or not
function generateCheckboxes(sectionIndex, itemIndex, item_checkboxes_total, item_checkboxes_checked, sectionTitleClean, 
                            itemNameClean, recordId) {
    const checkboxes = [];
    for (let i = 1; i <= item_checkboxes_total; i++) {
        const isChecked = i <= item_checkboxes_checked ? 'checked' : '';
        var checkboxName = createStorageItemName(gameId, sectionTitleClean, itemNameClean, i);
        checkboxes.push(`
            <input type="checkbox" 
                class="checkbox-${checkboxName}" 
                data-section="${sectionIndex}" 
                data-item="${itemIndex}" 
                data-num-checkbox-clicked="${i}" 
                data-num-total-checkboxes="${item_checkboxes_total}" 
                data-section-title-clean="${sectionTitleClean}" 
                data-item-name-clean="${itemNameClean}" 
                data-record-id="${recordId}" 
                ${isChecked}>
        `);
    }
    return checkboxes.join('');
}


function updateCompletion() {
    const sectionIndex = $(this).data('section');
    const itemIndex = $(this).data('item');
    const checkboxNum = $(this).data('num-checkbox-clicked');
    const sectionTitleClean = $(this).data('section-title-clean');
    const itemNameClean = $(this).data('item-name-clean');
    const recordId = $(this).data('record-id');
    
    if (debugLogging) {
        console.log("updateCompletion called - sectionIndex " + sectionIndex + ". itemIndex " + itemIndex + ". checkboxNum " + checkboxNum +
            ". sectionTitleClean " + sectionTitleClean + ". itemNameClean " + itemNameClean + ". recordId " + recordId);
    }
    
    //get the section-header-text div
    var sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    
    // Get the text inside the "section-header-text" element
    const sectionHeaderText = sectionHeaderTextDiv.text().trim();
    if (debugLogging) console.log("Section Header Text:", sectionHeaderText);

    // Get the sectionTitle data attribute value from "section-header-text" element
    const sectionTitle = sectionHeaderTextDiv.attr('data-section-title');
    if (debugLogging) console.log('sectionTitle: ' + sectionTitle);

    // Get the sectionTitleClean data attribute value from "section-header-text" element
/*    const sectionTitleClean = sectionHeaderTextDiv.attr('data-section-title-clean');
    if (debugLogging) console.log('sectionTitleClean: ' + sectionTitleClean);*/

    // Get the text inside the sibling element's label
    const checkboxItemName = $(this).closest('.grid-item-2-row, .grid-item-1-row').find('.label').text().trim();
    if (debugLogging) console.log("checkboxItemName:", checkboxItemName);
    
    // Is this the first, second, third, etc checkbox?
    const checkboxNumberClicked = $(this).attr('data-num-checkbox-clicked');
    if (debugLogging) console.log('checkboxNumberClicked: ' + checkboxNumberClicked);

    //How many checkboxes are there for this item?
    const numberOfCheckboxes = $(this).attr('data-num-total-checkboxes');
    if (debugLogging) console.log('numberOfCheckboxes: ' + numberOfCheckboxes);

    let action = ''; // Will be either "added" or "removed"
    
    
    if ($(this).is(':checked')) {
        if (debugLogging) console.log('this item is checked. CheckboxNum: ' + checkboxNum);
        for (let i = 1; i <= checkboxNum; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', true);
            //var storageItemName = createStorageItemName(gameId, sectionTitleClean, itemNameClean, checkboxNum);
            //localStorage.setItem(storageItemName, 'checked');
            //if (debugLogging) console.log('checked item in local storage. storageItemName: ' + storageItemName);
        }
        action = 'added';
    } else {
        if (debugLogging) console.log('this item is not checked. CheckboxNum: ' + checkboxNum);
        for (let i = checkboxNum; i <= $(`input[data-section="${sectionIndex}"][data-item="${itemIndex}"]`).length; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', false);
            //var storageItemName = createStorageItemName(gameId, sectionTitleClean, itemNameClean, checkboxNum);
            //localStorage.removeItem(storageItemName);
            //if (debugLogging) console.log('removed item from local storage. storageItemName: ' + storageItemName);
        }
        action = 'removed';
    }

    var subject = `Record updated for ${gameNameFriendly}`
    var emailText = `A record was ${action} for ${gameNameFriendly}.\nSection: ${sectionTitle}\nItem: ${checkboxItemName}`
    if(numberOfCheckboxes > 1){
        emailText += `\nCheckbox Number Clicked: ${checkboxNumberClicked}`
    }

    var numberAlreadyCompleted = "";
    
    if (action) {
        //sendEmail(subject, emailText);

        if(action === "added"){
            numberAlreadyCompleted = checkboxNumberClicked;
        }
        else {//action === "removed"
            if(checkboxNumberClicked === 1) numberAlreadyCompleted = 0;
            else numberAlreadyCompleted = checkboxNumberClicked - 1;
            
        }
        dbUtils.updateRecordCompletion(recordId, numberAlreadyCompleted);
/*        if(numberOfCheckboxes > 1) {
            sendDataToSheets(gameNameFriendly, sectionTitle, checkboxItemName, action, checkboxNumberClicked);
        }
        else {
            sendDataToSheets(gameNameFriendly, sectionTitle, checkboxItemName, action, null);
        }*/
    }

    updateSectionCompletion(sectionIndex);
    updateTotalCompletion();
}

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
        if (debugLogging) console.log('updateTotalCompletion - made it here')
        let totalCompletionPercent = 0;
        var totalCompletionText = '';
        const sections = $('div.section-header');
        const totalSections = sections.length;
        if (debugLogging) console.log('updateTotalCompletion - totalSections ' + totalSections)

        var totalCheckedCheckboxes = 0;
        var totalCheckboxes = 0;
        sections.each(function() {
            var thisSectionTitle = $(this).text();
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
    $('span.section-header-text').each(function() {
        const sectionIndex = $(this).data('section');
        updateSectionCompletion(sectionIndex);
    });
}
