var sendGridUrl = '/send-email';
var googleSheetsAppendUrl = '/google-sheets-append';


$(document).ready(function() {
    //Paths are different when running locally. Check if it's local by whether or not it's loaded with a "file" path
    var isRunningLocally = false;
    if(location.href.startsWith('file:')){
        //alert("It's a local server!");
        isRunningLocally = true;
    }

    //set the title field that's in the head, from the game's HTML
    const titleElement = document.querySelector('title');
    titleElement.textContent = gameNameFriendly + ' 100% Completion Checklist';
    
    var file = '/games/' + gameName + '/' + gameName + '_data.xlsx';
    var linkToHomePage = '../../';
    if(isRunningLocally) 
    {
        file = 'http://localhost:8080/games/' + gameName + '/' + gameName + '_data.xlsx';
        linkToHomePage = '../../index.html';
        sendGridUrl = 'http://localhost:3000/send-email'
        googleSheetsAppendUrl = 'http://localhost:3000/google-sheets-append'
    }
    console.log('sendGridUrl: ' + sendGridUrl);
    console.log('googleSheetsAppendUrl: ' + googleSheetsAppendUrl);



    
    // Add sibling elements before grid-checklist-container
    const containerParent = $('#grid-checklist-container').parent();
    containerParent.prepend('<p id="total-completion">Total Completion: 0%</p>');
    containerParent.prepend('<h1>' + gameNameFriendly + ' 100% Completion Checklist</h1>');
    containerParent.prepend('<div class="home-link"><a href="' + linkToHomePage + '" class="home-link-text"><i class="fa-solid fa-house fa-lg" ></i></a></div>');
    //containerParent.prepend('<div class="home-link"><i class="fa-solid fa-house fa-lg" onclick="sendEmail(\'test\',\'added\',)"></i></div>');

    fetch(file).then(response => response.arrayBuffer()).then(data => {
        const workbook = XLSX.read(data, {type: 'array'});
        processWorkbook(workbook);
        initializeCheckboxes(); // Initialize checkboxes after processing workbook
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
        console.log('sendGridUrl: ' + sendGridUrl);
        const response = await fetch(sendGridUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: thisSubject,
                text: thisText
            })
        });

        const data = await response.json();
        console.log("Response:", data);
    } catch (error) {
        console.error("Error:", error);
    }
}


async function sendDataToSheets(gameName, sectionName, itemName, action) {
    var dateTimeNowUtc = new Date().toISOString()
    console.log('dateTimeNowUtc: ' + dateTimeNowUtc);
    const data = [dateTimeNowUtc, gameName, sectionName, itemName, action]; 

    const response = await fetch(googleSheetsAppendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ rowData: data }),
    });

    const result = await response.json();
    console.log(result);
}

function processWorkbook(workbook) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
    generateChecklist(rows);
}

function generateChecklist(rows) {
    const container = $('#grid-checklist-container');
    container.empty();
    let sectionCount = 0;

    // Determine total sections
    while (rows[0][sectionCount * 4] !== undefined) {
        sectionCount++;
    }

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
        const sectionTitle = rows[0][sectionIndex * 4];
        if (!sectionTitle) break;

        // Create section template
        const sectionTemplate = `
            <div class="section-header" data-section="${sectionIndex}">
                <span class="section-header-text" data-section="${sectionIndex}">
                    ${sectionTitle} (0%)
                </span>
                <span class="section-header-icon">
                    <i class="fas fa-chevron-down"></i>
                </span>
            </div>
            <div class="section" data-section="${sectionIndex}" style="display: none;"></div>
        `;
        container.append(sectionTemplate);

        const sectionContent = container.find(`.section[data-section="${sectionIndex}"]`);
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
            //console.log('made it here - after calling generateCheckboxes');
            sectionContent.append(itemTemplate);
            
            //THIS IS THE OLD METHOD! See the comment regarding Event Delegation in the document.ready for more information.    
            // Attach the event listener to the checkboxes within the newly appended content
            //sectionContent.find(`input[type="checkbox"][data-section="${sectionIndex}"]`).on('change', updateCompletion);
        });

        // Add toggle functionality to section header
        $(`.section-header[data-section="${sectionIndex}"]`).on('click', function () {
            $(this).next('.section').toggle();
        });
        
        
    }
}

// Helper function to extract items from rows
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

// Helper function to generate checkboxes
function generateCheckboxes(sectionIndex, itemIndex, total, checked) {
    const checkboxes = [];
    for (let i = 1; i <= total; i++) {
        const isChecked = i <= checked ? 'checked' : '';
        checkboxes.push(`
            <input type="checkbox" 
                class="checkbox-${sectionIndex}-${itemIndex}-${i}" 
                data-section="${sectionIndex}" 
                data-item="${itemIndex}" 
                data-num="${i}" 
                ${isChecked}>
        `);
    }
    return checkboxes.join('');
}

function updateCompletion() {
    //console.log('updatecompletion - made it here');
    const sectionIndex = $(this).data('section');
    const itemIndex = $(this).data('item');
    const checkboxNum = $(this).data('num');
    
    
    console.log("updateCompletion called - sectionIndex " + sectionIndex + "itemIndex " + itemIndex + "checkboxNum " + checkboxNum)

    // 1️⃣ Get the text inside the parent "section-header-text" element
    const sectionHeaderText = $(`span.section-header-text[data-section="${sectionIndex}"]`).text().trim();
    //console.log("Section Header Text:", sectionHeaderText);

    // 2️⃣ Get the text inside the sibling element's label
    const labelText = $(this).closest('.grid-item-2-row, .grid-item-1-row').find('.label').text().trim();
    //console.log("Label Text:", labelText);
    
    let action = ''; // Will be either "added" or "removed"
    
    
    if ($(this).is(':checked')) {
        //console.log('this item is checked');
        for (let i = 1; i <= checkboxNum; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', true);
            localStorage.setItem(`${gameName}-checkbox-${sectionIndex}-${itemIndex}-${i}`, 'checked');
            console.log('checked item in local storage');
        }
        action = 'added';
    } else {
        //console.log('this item is not checked');
        for (let i = checkboxNum; i <= $(`input[data-section="${sectionIndex}"][data-item="${itemIndex}"]`).length; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', false);
            localStorage.removeItem(`${gameName}-checkbox-${sectionIndex}-${itemIndex}-${i}`);
            console.log('removed item from local storage');
        }
        action = 'removed';
    }

    var subject = `Record updated for ${gameNameFriendly}`
    var emailText = `A record was ${action} for ${gameNameFriendly}.\nSection: ${sectionHeaderText}\nItem: ${labelText}`

    // Call sendEmail function after updating localStorage
    if (action) {
        sendEmail(subject, emailText);
        sendDataToSheets(gameNameFriendly, sectionHeaderText, labelText, action);
    }

    updateSectionCompletion(sectionIndex);
    updateTotalCompletion();
}
function trimBeforeParenthesis(str) {
    const index = str.indexOf('('); // Find the first index of '('
    if (index === -1) {
        return str; // Return the original string if '(' is not found
    }
    return str.substring(0, index).trim(); // Trim and return everything before '('
}
function removeTrailingSpace (str){
    if(str.endsWith(" ")){
        console.log('trimming end space')
        str = str.trimEnd();
    }
    return str;
}
function updateSectionCompletion(sectionIndex) {
    const sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    const checkboxes = $(`input[data-section="${sectionIndex}"]`);
    const checkedCheckboxes = checkboxes.filter(':checked').length;
    const totalCheckboxes = checkboxes.length;
    const sectionCompletion = checkedCheckboxes + '/' + totalCheckboxes;
    const sectionCompletionPercent = ((checkedCheckboxes / totalCheckboxes) * 100).toFixed(2);
    var sectionHeaderText = sectionHeaderTextDiv.text();
    sectionTitle = trimBeforeParenthesis(sectionHeaderText);
    sectionTitle = removeTrailingSpace(sectionTitle);
    
    //var lastIndex = sectionHeaderText.lastIndexOf(' ');
    //const sectionTitle = sectionHeaderText.substr(0, lastIndex);
    sectionHeaderTextDiv.text(`${sectionTitle} (${sectionCompletion}) (${sectionCompletionPercent}%)`);
    
    //get the header, add the # of checkboxes for that section
    const sectionHeaderDiv = $(`div.section-header[data-section="${sectionIndex}"]`);
    sectionHeaderDiv.attr("checked-checkboxes",checkedCheckboxes);
    sectionHeaderDiv.attr("total-checkboxes",totalCheckboxes);

}

function updateTotalCompletion() {
    try {
        //console.log('updateTotalCompletion - made it here')
        let totalCompletionPercent = 0;
        var totalCompletionText = '';
        const sections = $('div.section-header');
        const totalSections = sections.length;
        //console.log('updateTotalCompletion - totalSections ' + totalSections)

        var totalCheckedCheckboxes = 0;
        var totalCheckboxes = 0;
        sections.each(function() {
            //const sectionCompletion = parseFloat($(this).text().match(/\(([^)]+)%\)/)[1]); //this gets the percentage from the header, ex: 58.47%
            var thisSectionTitle = $(this).text();
            //logAllAttributes($(this));
            //console.log('updateTotalCompletion sectiontitle ' + thisSectionTitle);
            var sectionCheckedCheckboxesInt = parseInt($(this).attr('checked-checkboxes'));
            var sectionTotalCheckboxesInt = parseInt($(this).attr('total-checkboxes'));
            //console.log('sectionCheckedCheckboxesInt ' + sectionCheckedCheckboxesInt);
            //console.log('sectionTotalCheckboxesInt ' + sectionTotalCheckboxesInt);

            totalCheckedCheckboxes = totalCheckedCheckboxes + sectionCheckedCheckboxesInt;
            totalCheckboxes = totalCheckboxes + sectionTotalCheckboxesInt;
            //console.log('totalCheckedCheckboxes ' + totalCheckedCheckboxes);
            //console.log('totalCheckboxes ' + totalCheckboxes);
        });
        totalCompletionText = totalCheckedCheckboxes + '/' + totalCheckboxes;
        totalCompletionPercent = ((totalCheckedCheckboxes / totalCheckboxes) * 100).toFixed(2);
        $('#total-completion').text(`Total Completion: (${totalCompletionText}) ${totalCompletionPercent}%`);
    } catch (error) {
        console.error(error);
        $('#total-completion').text(`Total Completion: 0.00%`);
    }
}

function initializeCheckboxes() {
    $('input[type="checkbox"]').each(function() {
        const sectionIndex = $(this).data('section');
        const itemIndex = $(this).data('item');
        const checkboxNum = $(this).data('num');

        if (localStorage.getItem(`${gameName}-checkbox-${sectionIndex}-${itemIndex}-${checkboxNum}`) === 'checked') {
            $(this).prop('checked', true);
        }
    });
}

//log all attributes of an element.
function logAllAttributes(thisElement){
    const attributes = {};
    $.each(thisElement[0].attributes, function() {
        attributes[this.name] = this.value;
    });
    console.log('attributes');
    console.log(attributes);
}
function updateAllSectionsCompletion() {
    $('span.section-header-text').each(function() {
        const sectionIndex = $(this).data('section');
        updateSectionCompletion(sectionIndex);
    });
}
