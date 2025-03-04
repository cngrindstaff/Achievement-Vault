var excelFilePath = '/games/' + gameName + '/' + gameName + '_data_2.xlsx';
var linkToHomePage = '../../';

$(document).ready(function() {
    //set the title field that's in the head, from the game's HTML
    const titleElement = document.querySelector('title');
    titleElement.textContent = gameNameFriendly + ' Other Tables';
    

    
    // Add sibling elements before grid-checklist-container
    const containerParent = $('#grid-tables-container').parent();
    containerParent.prepend('<h1>' + gameNameFriendly + ': Other Tables</h1>');
    containerParent.prepend('<div class="home-link"><a href="' + linkToHomePage + '" class="home-link-text"><i class="fa-solid fa-house fa-lg" ></i></a></div>');


    // Fetch and process the Excel file
    fetch(excelFilePath, { method: 'HEAD' })
        .then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return fetch(excelFilePath).then(res => res.arrayBuffer());
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });

            const container = document.getElementById('grid-tables-container');
            container.innerHTML = ''; // Clear previous data

            if (workbook.SheetNames.length === 0) {
                showNoTablesMessage();
                return;
            }
            
            workbook.SheetNames.forEach((sheetName, index) => {
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (jsonData.length > 0) {
                    createSection(sheetName, index, jsonData);
                }
            });

            // If no valid tables were created, show the "No tables available" message
            if (container.innerHTML.trim() === '') {
                showNoTablesMessage();
            }
        })
        .catch(error => {
            console.error("Error loading the Excel file:", error);
            showNoTablesMessage();
        });    });

function showNoTablesMessage() {
    console.log('made it here');
    document.getElementById('grid-tables-container').innerHTML = `
                <div class="no-tables">No tables available</div>
            `;
}

    function createSection(sectionTitle, sectionIndex, data) {
        const container = document.getElementById('grid-tables-container');

        // Create section header
        const sectionHeader = document.createElement('div');
        sectionHeader.classList.add('section-header');
        sectionHeader.dataset.section = sectionIndex;
        sectionHeader.innerHTML = `
                <span class="section-header-text" data-section="${sectionIndex}" data-section-title="${sectionTitle}">${sectionTitle}</span>
                <span class="section-header-icon">
                    <i class="fas fa-chevron-down"></i>
                </span>
            `;

        // Create collapsible section
        const section = document.createElement('div');
        section.classList.add('section-table');
        section.dataset.section = sectionIndex;

        // Populate section with table
        displayTable(section, data);

        // Append elements to container
        container.appendChild(sectionHeader);
        container.appendChild(section);

        // Toggle section visibility on header click
        sectionHeader.addEventListener('click', () => {
            const isVisible = section.style.display === 'block';
            section.style.display = isVisible ? 'none' : 'block';
            sectionHeader.querySelector('i').classList.toggle('fa-chevron-down', isVisible);
            sectionHeader.querySelector('i').classList.toggle('fa-chevron-up', !isVisible);
        });
    }

    function displayTable(container, data) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create headers
        const headers = data[0];
        const headerRow = document.createElement('tr');
        headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            th.dataset.index = index;
            th.addEventListener('click', () => sortTable(table, index));
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create body
        data.slice(1).forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    function sortTable(table, colIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.rows);
        const isAscending = table.dataset.sortOrder === `asc-${colIndex}`;

        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[colIndex].textContent.trim();
            const cellB = rowB.cells[colIndex].textContent.trim();
            return isAscending
                ? cellA.localeCompare(cellB, undefined, { numeric: true })
                : cellB.localeCompare(cellA, undefined, { numeric: true });
        });

        tbody.append(...rows);
        table.dataset.sortOrder = isAscending ? `desc-${colIndex}` : `asc-${colIndex}`;
    }