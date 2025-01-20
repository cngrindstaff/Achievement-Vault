$(document).ready(function() {
    //set this to "true" when running locally, so the correct paths are retrieved
    var isRunningLocally = false;

    //set the title field that's in the head, from the game's HTML
    const titleElement = document.querySelector('title');
    titleElement.textContent = gameNameFriendly + ' 100% Completion Checklist';
    
    var file = '/Achievement-Vault/games/' + gameName + '/' + gameName + '_data.xlsx';
    var linkToHomePage = '../../';
    if(isRunningLocally) 
    {
        file = 'http://localhost:8080/games/' + gameName + '/' + gameName + '_data.xlsx';
        linkToHomePage = '../../index.html';
    }
    //console.log('file: ' + file);



    
    // Add sibling elements before grid-checklist-container
    const containerParent = $('#grid-checklist-container').parent();
    containerParent.prepend('<p id="total-completion">Total Completion: 0%</p>');
    containerParent.prepend('<h1>' + gameNameFriendly + ' 100% Completion Checklist</h1>');
    containerParent.prepend('<div class="home-link"><a href="' + linkToHomePage + '" class="home-link-text"><i class="fa-solid fa-house fa-lg"></i></a></div>');

    fetch(file).then(response => response.arrayBuffer()).then(data => {
        const workbook = XLSX.read(data, {type: 'array'});
        processWorkbook(workbook);
        initializeCheckboxes(); // Initialize checkboxes after processing workbook
        updateAllSectionsCompletion(); // Update section percentages
        updateTotalCompletion(); // Calculate initial total completion percentage
    }).catch(error => {
        console.error('Error fetching the Excel file:', error);
    });
});

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
            sectionContent.append(itemTemplate);
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
    let checkboxes = '';
    for (let i = 1; i <= total; i++) {
        const isChecked = i <= checked ? 'checked' : '';
        checkboxes += `
            <input type="checkbox" 
                class="checkbox-${sectionIndex}-${itemIndex}-${i}" 
                data-section="${sectionIndex}" 
                data-item="${itemIndex}" 
                data-num="${i}" 
                ${isChecked}>
        `;
    }
    return checkboxes;
}

function updateCompletion() {
    const sectionIndex = $(this).data('section');
    const itemIndex = $(this).data('item');
    const checkboxNum = $(this).data('num');

    if ($(this).is(':checked')) {
        for (let i = 1; i <= checkboxNum; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', true);
            localStorage.setItem(`checkbox-${sectionIndex}-${itemIndex}-${i}`, 'checked');
        }
    } else {
        for (let i = checkboxNum; i <= $(`input[data-section="${sectionIndex}"][data-item="${itemIndex}"]`).length; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', false);
            localStorage.removeItem(`checkbox-${sectionIndex}-${itemIndex}-${i}`);
        }
    }

    updateSectionCompletion(sectionIndex);
    updateTotalCompletion();
}

function updateSectionCompletion(sectionIndex) {
    const sectionHeaderTextDiv = $(`span.section-header-text[data-section="${sectionIndex}"]`);
    const checkboxes = $(`input[data-section="${sectionIndex}"]`);
    const checkedCheckboxes = checkboxes.filter(':checked').length;
    const totalCheckboxes = checkboxes.length;
    const sectionCompletion = checkedCheckboxes + '/' + totalCheckboxes;
    const sectionCompletionPercent = ((checkedCheckboxes / totalCheckboxes) * 100).toFixed(2);
    var sectionHeaderText = sectionHeaderTextDiv.text();
    if(sectionHeaderText.endsWith(" ")){
        console.log('trimming end space')
        sectionHeaderText = sectionHeaderText.trimEnd();
    }    
    var lastIndex = sectionHeaderText.lastIndexOf(' ');
    const sectionTitle = sectionHeaderText.substr(0, lastIndex);
    sectionHeaderTextDiv.text(`${sectionTitle} (${sectionCompletion}) (${sectionCompletionPercent}%)`);
    
    //get the header, add the # of checkboxes for that section
    const sectionHeaderDiv = $(`div.section-header[data-section="${sectionIndex}"]`);
    sectionHeaderDiv.attr("data-checkedCheckboxes",checkedCheckboxes);
    sectionHeaderDiv.attr("data-totalCheckboxes",totalCheckboxes);

}

function updateTotalCompletion() {
    try {
        let totalCompletionPercent = 0;
        var totalCompletionText = '';
        const sections = $('div.section-header');
        const totalSections = sections.length;

        var totalCheckedCheckboxes = 0;
        var totalCheckboxes = 0;
        sections.each(function() {
            //const sectionCompletion = parseFloat($(this).text().match(/\(([^)]+)%\)/)[1]); //this gets the percentage from the header, ex: 58.47%
            const sectionCheckedCheckboxesInt = parseInt($(this).data('checkedcheckboxes'));
            const sectionTotalCheckboxesInt = parseInt($(this).data('totalcheckboxes'));

            totalCheckedCheckboxes = totalCheckedCheckboxes + sectionCheckedCheckboxesInt;
            totalCheckboxes = totalCheckboxes + sectionTotalCheckboxesInt;
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

        if (localStorage.getItem(`checkbox-${sectionIndex}-${itemIndex}-${checkboxNum}`) === 'checked') {
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
