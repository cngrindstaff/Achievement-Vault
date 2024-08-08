$(document).ready(function() {
	var file = 'data.xlsx';
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
    //console.log('rows - ' + rows);
    generateChecklist(rows);
}

function generateChecklist(rows) {
    const container = $('#checklist-container');
    container.empty();
    let sectionCount = 0;
    let totalSections = 0;

    while (rows[0][sectionCount * 3] !== undefined) {
        totalSections++;
        sectionCount++;
    }

    sectionCount = 0;

    while (rows[0][sectionCount * 3] !== undefined) {
        console.log('rows[0][sectionCount * 3] - ' + rows[0][sectionCount * 3])
        const sectionTitle = rows[0][sectionCount * 3];
        console.log('sectionTitle - ' + sectionTitle)
        const sectionContent = $('<div class="content"></div>');
        const section = $('<button class="collapsible"></button>').text(`${sectionTitle} (0%)`);
        section.on('click', function() {
            $(this).next('.content').toggle();
        });

        const items = {};
        for (let i = 1; i < rows.length; i++) {
            const itemName = rows[i][sectionCount * 3];
			console.log('itemName - ' + itemName);
            const numOfCheckboxes = rows[i][sectionCount * 3 + 1];
            const numAlreadyChecked = rows[i][sectionCount * 3 + 2];
            if(numAlreadyChecked === null) numAlreadyChecked = 0;
            if (!itemName) break;
            if (!items[itemName]) {
                items[itemName] = numAlreadyChecked + "," + numOfCheckboxes;
            } else {
                items[itemName] += numAlreadyChecked + "," + numOfCheckboxes;
            }
        }

        const itemContainer = $('<div></div>');
        Object.keys(items).forEach((itemName, index) => {
            const checks = items[itemName].split(",");
            let numAlreadyChecked = checks[0];
            let numOfCheckboxes = checks[1];
            const itemDiv = $('<div class="item"></div>');
            const itemLabel = $(`<label>${itemName}</label>`);
            const checkboxContainer = $('<div class="checkbox-container"></div>');

            for (let j = 1; j <= numOfCheckboxes; j++) {
                let checkbox = "";
                if(j <= numAlreadyChecked) {
                    checkbox = $(`<input type="checkbox" class="checkbox-${sectionCount}-${index}-${j}" data-section="${sectionCount}" data-item="${index}" data-num="${j}" checked>`);
                }
                else {
                    checkbox = $(`<input type="checkbox" class="checkbox-${sectionCount}-${index}-${j}" data-section="${sectionCount}" data-item="${index}" data-num="${j}">`);
                }
                checkbox.on('change', updateCompletion);
                checkboxContainer.append(checkbox);
            }

            itemDiv.append(itemLabel).append(checkboxContainer);
            itemContainer.append(itemDiv);
        });

        sectionContent.append(itemContainer);
        const sectionPercentage = (100 / Object.keys(items).length).toFixed(2);
        section.attr('data-percentage', sectionPercentage);
        section.attr('data-section', sectionCount);
        container.append(section);
        container.append(sectionContent);

        sectionCount++;
    }
}

function updateCompletion() {
    const sectionIndex = $(this).data('section');
    const itemIndex = $(this).data('item');
    const checkboxNum = $(this).data('num');

    if ($(this).is(':checked')) {
        for (let i = 1; i <= checkboxNum; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', true);
            // Save checkbox state to local storage
            localStorage.setItem(`checkbox-${sectionIndex}-${itemIndex}-${i}`, 'checked');
        }
    } else {
        for (let i = checkboxNum; i <= $(`input[data-section="${sectionIndex}"][data-item="${itemIndex}"]`).length; i++) {
            $(`.checkbox-${sectionIndex}-${itemIndex}-${i}`).prop('checked', false);
            // Remove checkbox state from local storage
            localStorage.removeItem(`checkbox-${sectionIndex}-${itemIndex}-${i}`);
        }
    }

    updateSectionCompletion(sectionIndex);
    updateTotalCompletion();
}

function updateSectionCompletion(sectionIndex) {
    const sectionButton = $(`button[data-section="${sectionIndex}"]`);
    const checkboxes = $(`input[data-section="${sectionIndex}"]`);
    const checkedCheckboxes = checkboxes.filter(':checked').length;
    const totalCheckboxes = checkboxes.length;
    const sectionCompletion = ((checkedCheckboxes / totalCheckboxes) * 100).toFixed(2);
    var lastIndex = sectionButton.text().lastIndexOf(' ');
    const sectionTitle = sectionButton.text().substr(0, lastIndex);
    sectionButton.text(`${sectionTitle} (${sectionCompletion}%)`);
}

function updateTotalCompletion() {
    let totalCompletion = 0;
    const sections = $('button.collapsible');
    const totalSections = sections.length;

    sections.each(function() {
        const sectionCompletion = parseFloat($(this).text().match(/\(([^)]+)%\)/)[1]);
        totalCompletion += sectionCompletion / totalSections;
    });

    $('#total-completion').text(`Total Completion: ${totalCompletion.toFixed(2)}%`);
}

// Function to initialize checkboxes from local storage
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

// Function to update all sections' completion percentages
function updateAllSectionsCompletion() {
    $('button.collapsible').each(function() {
        const sectionIndex = $(this).data('section');
        updateSectionCompletion(sectionIndex);
    });
}
