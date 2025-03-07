const sendGridUrl = '/api/send-email';
const googleSheetsAppendUrl = '/api/google-sheets-append';
const excelFilePath = '/games/' + gameName + '/' + gameName + '_data.xlsx';
const linkToHomePage = '../../';
const linkToGamePage = '/games/' + gameName + '/' + gameName + '.html';

var debugLogging = false;

$(document).ready(function() {
    //set the title field that's in the head using the variable from the game's HTML
    const titleElement = document.querySelector('title');
    titleElement.textContent = gameNameFriendly + ' 100% Completion Checklist';

    //.append() puts data inside an element at last index and .prepend() puts the prepending elem at first index.
    const mainContainer = $('#container');
    
    mainContainer.prepend('<p id="total-completion">Total Completion: 0%</p>');
    mainContainer.prepend('<h1>' + gameNameFriendly + ' 100% Completion Checklist</h1>');

    mainContainer.prepend(`<div class="link-container"> </div>`);
    const linkContainerDiv = $('.link-container');
    if(hasTablePage){
        linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');
    }
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');


    fetch(excelFilePath).then(response => response.arrayBuffer()).then(data => {
        const workbook = XLSX.read(data, {type: 'array'});
        processWorkbook(workbook);
        initializeCheckboxesFromLocalStorage(); // Initialize checkboxes after processing workbook
        updateAllSectionsCompletion(); // Update section percentages
        updateTotalCompletion(); // Calculate initial total completion percentage
    }).catch(error => {
        console.error('Error fetching the Excel file:', error);
    });
    
    //https://chatgpt.com/share/67c0f24e-db90-8004-be01-0dec495fc388
    // 🔥 This line prevents multiple event bindings by using event delegation
    //Previously, I was using Direct Binding, and every time new elements were added dynamically (i.e., checkboxes were added inside generateChecklist), the listener got 
    //reattached.
    //This line changes from Direct Binding to Event Delegation. 
    //The event is attached to the parent element, and the event is delegated to the children.
    //It needs to be inside the document ready function, so it's only called once. And it needs to happen after generateChecklist() is defined, but before any 
    //checkboxes are clicked.
    $('#grid-checklist-container').on('change', 'input[type="checkbox"]', updateCompletion);

});

async function sendEmail(thisSubject, thisText) {
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
}


async function sendDataToSheets(gameName, sectionName, itemName, action, checkboxNumberClicked) {
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
}

function processWorkbook(workbook) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
    generateChecklist(rows);
}

//Generate the checklist using the Excel data
function generateChecklist(rows) {
    const gridContainer = $('#grid-checklist-container');
    gridContainer.empty();
    let sectionCount = 0;

    // Determine total sections
    while (rows[0][sectionCount * 4] !== undefined) {
        sectionCount++;
    }

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
        const sectionTitle = rows[0][sectionIndex * 4];
        if (!sectionTitle) break;

        // Create section template with the section header and the section body
        const sectionTemplate = `
            <div class="section-header" data-section="${sectionIndex}">
                <span class="section-header-text" data-section="${sectionIndex}" data-section-title="${sectionTitle}">
                    ${sectionTitle} (0%)
                </span>
                <span class="section-header-icon">
                    <i class="fas fa-chevron-down"></i>
                </span>
            </div>
            <div class="section" data-section="${sectionIndex}" style="display: none;"></div>
        `;
        gridContainer.append(sectionTemplate);

        const sectionContent = gridContainer.find(`.section[data-section="${sectionIndex}"]`);
        const items = extractItems(rows, sectionIndex);

        // Add items to section
        items.forEach((item, index) => {
            const itemTemplate = `
                <div class="grid-item-${item.description ? '2' : '1'}-row">
                    <div class="column1">
                        <div class="label">${item.name}</div>
                        ${item.description ? `<div class="description">${item.description}</div>` : ''}
                    </div>
                    <div class="column2">
                        ${generateCheckboxes(sectionIndex, index, item.numOfCheckboxes, item.numAlreadyChecked)}
                    </div>
                </div>
            `;
            sectionContent.append(itemTemplate);
        });

        // Add toggle functionality to section header
        $(`.section-header[data-section="${sectionIndex}"]`).on('click', function () {
            $(this).next('.section').toggle();
        });
        
        
    }
}

// Helper function to extract items from rows from Excel data
function extractItems(rows, sectionIndex) {
    const items = [];
    for (let i = 1; i < rows.length; i++) {
        const name = rows[i][sectionIndex * 4];
        const description = rows[i][sectionIndex * 4 + 1] || '';
        const numOfCheckboxes = rows[i][sectionIndex * 4 + 2] || 0;
        const numAlreadyChecked = rows[i][sectionIndex * 4 + 3] || 0;
        if (!name) break;
        items.push({ name, description, numOfCheckboxes, numAlreadyChecked });
    }
    return items;
}

// Helper function to generate checkboxes, using the Excel info for if the item has been checked or not
function generateCheckboxes(sectionIndex, itemIndex, total, checked) {
    const checkboxes = [];
    for (let i = 1; i <= total; i++) {
        const isChecked = i <= checked ? 'checked' : '';
        checkboxes.push(`
            <input type="checkbox" 
                class="checkbox-${sectionIndex}-${itemIndex}-${i}" 
                data-section="${sectionIndex}" 
                data-item="${itemIndex}" 
                data-num-checkbox-clicked="${i}" 
                data-num-total-checkboxes="${total}" 
                ${isChecked}>
        `);
    }
    return checkboxes.join('');
}

function updateCompletion() {
    const sectionIndex = $(this).data('section');
    const itemIndex = $(this).data('item');
    const checkboxNum = $(this).data('num-checkbox-clicked');
    
    if (debugLogging) console.log("updateCompletion called - sectionIndex " + sectionIndex + "itemIndex " + itemIndex + "checkboxNum " + checkboxNum)

    //get the section-header-text div
    var sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    
    // 1️⃣ Get the text inside the "section-header-text" element
    const sectionHeaderText = sectionHeaderTextDiv.text().trim();
    if (debugLogging) console.log("Section Header Text:", sectionHeaderText);

    // 1️⃣ Get the sectionTitle data attribute value from "section-header-text" element
    const sectionTitle = sectionHeaderTextDiv.attr('data-section-title');
    if (debugLogging) console.log('sectionTitle: ' + sectionTitle);
    
    // 2️⃣ Get the text inside the sibling element's label
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
            var storageItemName = `${gameName}-checkbox-${sectionIndex}-${itemIndex}-${i}`;
            localStorage.setItem(storageItemName, 'checked');
            if (debugLogging) console.log('checked item in local storage. storageItemName: ' + storageItemName);
        }
        action = 'added';
    } else {
        if (debugLogging) console.log('this item is not checked. CheckboxNum: ' + checkboxNum);
        for (let i = checkboxNum; i <= $(`input[data-section="${sectionIndex}"][data-item="${itemIndex}"]`).length; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', false);
            var storageItemName = `${gameName}-checkbox-${sectionIndex}-${itemIndex}-${i}`;
            localStorage.removeItem(storageItemName);
            if (debugLogging) console.log('removed item from local storage. storageItemName: ' + storageItemName);
        }
        action = 'removed';
    }

    var subject = `Record updated for ${gameNameFriendly}`
    var emailText = `A record was ${action} for ${gameNameFriendly}.\nSection: ${sectionTitle}\nItem: ${checkboxItemName}`
    if(numberOfCheckboxes > 1){
        emailText += `\nCheckbox Number Clicked: ${checkboxNumberClicked}`
    }
    // Call sendEmail function after updating localStorage
    if (action) {
        sendEmail(subject, emailText);
        if(numberOfCheckboxes > 1) {
            sendDataToSheets(gameNameFriendly, sectionTitle, checkboxItemName, action, checkboxNumberClicked);
        }
        else {
            sendDataToSheets(gameNameFriendly, sectionTitle, checkboxItemName, action, null);
        }
    }

    updateSectionCompletion(sectionIndex);
    updateTotalCompletion();
}

function updateSectionCompletion(sectionIndex) {
    var sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    const checkboxes = $(`input[data-section="${sectionIndex}"]`);
    const checkedCheckboxes = checkboxes.filter(':checked').length;
    const totalCheckboxes = checkboxes.length;
    const sectionCompletion = checkedCheckboxes + '/' + totalCheckboxes;
    const sectionCompletionPercent = ((checkedCheckboxes / totalCheckboxes) * 100).toFixed(2);

    const sectionTitle = sectionHeaderTextDiv.attr('data-section-title');
    if (debugLogging) console.log('sectionTitle' + sectionTitle);
    
    sectionHeaderTextDiv.text(`${sectionTitle} (${sectionCompletion}) (${sectionCompletionPercent}%)`);
    
    //get the header, add the # of checkboxes for that section
    const sectionHeaderDiv = $(`div.section-header[data-section="${sectionIndex}"]`);
    sectionHeaderDiv.attr("checked-checkboxes",checkedCheckboxes);
    sectionHeaderDiv.attr("total-checkboxes",totalCheckboxes);
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

//Local Storage might have updated checkboxes. Initialize them on top of what was in Excel.
function initializeCheckboxesFromLocalStorage() {
    $('input[type="checkbox"]').each(function() {
        const sectionIndex = $(this).data('section');
        const itemIndex = $(this).data('item');
        const checkboxNum = $(this).data('num-checkbox-clicked');
        const storageItemName = `${gameName}-checkbox-${sectionIndex}-${itemIndex}-${checkboxNum}`;
        
        if (localStorage.getItem(storageItemName) === 'checked') {
            $(this).prop('checked', true);
        }
    });
}


function updateAllSectionsCompletion() {
    $('span.section-header-text').each(function() {
        const sectionIndex = $(this).data('section');
        updateSectionCompletion(sectionIndex);
    });
}
