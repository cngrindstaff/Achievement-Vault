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
    const container = $('#grid-checklist-container');
    container.empty();
    let sectionCount = 0;
    let totalSections = 0;

    while (rows[0][sectionCount * 4] !== undefined) {
        totalSections++;
        sectionCount++;
    }

    sectionCount = 0;

    while (rows[0][sectionCount * 4] !== undefined) {
        //console.log('rows[0][sectionCount * 4] - ' + rows[0][sectionCount * 4])
        const sectionTitle = rows[0][sectionCount * 4];
        //console.log('sectionTitle - ' + sectionTitle)
		if(sectionTitle == "undefined"){
			break;
		}
		
        const sectionContent = $('<div class="section"></div>');
        const sectionHeader = $('<div class="section-header"></div>');
        const sectionHeaderText = $('<span class="section-header-text"></div>').text(`${sectionTitle} (0%)`);
        sectionHeader.append(sectionHeaderText);
        const sectionHeaderIcon = $('<span class="section-header-icon"><i class="fas fa-chevron-down"></i></span>');
        sectionHeader.append(sectionHeaderIcon);

        sectionHeader.on('click', function() {
            $(this).next('.section').toggle();
        });

        const items = {};
        for (let i = 1; i < rows.length; i++) {
            const itemName = rows[i][sectionCount * 4];
			//console.log('itemName - ' + itemName);
			const description = rows[i][sectionCount * 4 + 1]; //todo, make html safe
			//console.log('description - ' + description);
            const numOfCheckboxes = rows[i][sectionCount * 4 + 2];
            const numAlreadyChecked = rows[i][sectionCount * 4 + 3];
            if(numAlreadyChecked === null) numAlreadyChecked = 0;
            if (!itemName) break;
            if (!items[itemName]) {
                items[itemName] = description + ";" + numAlreadyChecked + ";" + numOfCheckboxes;
            } else {
                items[itemName] += description + ";" + numAlreadyChecked + ";" + numOfCheckboxes;
            }
        }

        const itemContainer = $('<div></div>');

        Object.keys(items).forEach((itemName, index) => {
            const checks = items[itemName].split(";");
            let description = checks[0];
            let numAlreadyChecked = checks[1];
            let numOfCheckboxes = checks[2];
			
			
            var gridItemDiv = $('<div class="grid-item-1-row"></div>');
			var column1LabelAndDescriptionDiv = $(`<div class="column1"><div class="label">${itemName}</div></div>`);
			
			//if there's a description, make sure it's there, and change gridItemDiv class to the 2-row version
			if(description != "undefined") {
				gridItemDiv = $('<div class="grid-item-2-row"></div>');
				column1LabelAndDescriptionDiv = $(`<div class="column1"><div class="label">${itemName}</div><div class="description">${description}</div></div>`);
				
			}

            const checkboxContainer = $('<div class="column2"></div>');


            for (let j = 1; j <= numOfCheckboxes; j++) {
                let checkbox = "";
                if(j <= numAlreadyChecked) {
                    checkbox = $(`<label class="modern-checkbox"><input type="checkbox" class="checkbox-${sectionCount}-${index}-${j}" data-section="${sectionCount}" data-item="${index}" data-num="${j}" checked><span class="checkmark"></span>`);
                }
                else {
                    checkbox = $(`<label class="modern-checkbox"><input type="checkbox" class="checkbox-${sectionCount}-${index}-${j}" data-section="${sectionCount}" data-item="${index}" data-num="${j}"><span class="checkmark"></span>`);
                }
				//console.log('checkbox html - ' + checkbox);
                checkbox.on('change', updateCompletion);
                checkboxContainer.append(checkbox);
           		//console.log('checkboxContainer html - ' + checkboxContainer);
}

            gridItemDiv.append(column1LabelAndDescriptionDiv).append(checkboxContainer);
            itemContainer.append(gridItemDiv);
        });

        sectionContent.append(itemContainer);
        const sectionPercentage = (100 / Object.keys(items).length).toFixed(2);
        sectionHeaderText.attr('data-percentage', sectionPercentage);
        sectionHeaderText.attr('data-section', sectionCount);
        container.append(sectionHeader);
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
	//console.log("updateSectionCompletion");
    const sectionHeaderTextDiv = $(`.section-header-text[data-section="${sectionIndex}"]`);
    const checkboxes = $(`input[data-section="${sectionIndex}"]`);
    const checkedCheckboxes = checkboxes.filter(':checked').length;
    const totalCheckboxes = checkboxes.length;
    const sectionCompletion = ((checkedCheckboxes / totalCheckboxes) * 100).toFixed(2);
    var lastIndex = sectionHeaderTextDiv.text().lastIndexOf(' ');
    const sectionTitle = sectionHeaderTextDiv.text().substr(0, lastIndex);
    sectionHeaderTextDiv.text(`${sectionTitle} (${sectionCompletion}%)`);
}

function updateTotalCompletion() {
	try
	{
		let totalCompletion = 0;
		const sections = $('div.section-header');
		const totalSections = sections.length;

		sections.each(function() {
			const sectionCompletion = parseFloat($(this).text().match(/\(([^)]+)%\)/)[1]);
			totalCompletion += sectionCompletion / totalSections;
		});
		$('#total-completion').text(`Total Completion: ${totalCompletion.toFixed(2)}%`);		
	}
	catch (error) 
	{
		console.error(error);
		$('#total-completion').text(`Total Completion: 0.00%`);		
	}

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
    $('div.section-header').each(function() {
        const sectionIndex = $(this).data('section');
        updateSectionCompletion(sectionIndex);
    });
}
