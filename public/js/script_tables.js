import { createSlug } from "./script_utilities.js";

const excelFilePath = '/games/' + gameName + '/' + gameName + '_tables.xlsx';
const linkToHomePage = '../../';
const linkToGamePage = '/games/' + gameName + '/' + gameName + '.html';

$(document).ready(function() {
    //set the title field that's in the head, from the game's HTML
    const titleElement = document.querySelector('title');
    titleElement.textContent = gameNameFriendly + ' Other Tables';
    
    // Add sibling elements before grid-checklist-container
    //.append() puts data inside an element at last index and .prepend() puts the prepending elem at first index.
    const mainContainer = $('#container');

    mainContainer.prepend('<h1>' + gameNameFriendly + ': Other Tables</h1>');
    mainContainer.prepend(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');


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

            const gridContainer = document.getElementById('grid-tables-container');
            gridContainer.innerHTML = ''; // Clear previous data

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
            if (gridContainer.innerHTML.trim() === '') {
                showNoTablesMessage();
            }
        })
        .catch(error => {
            console.error("Error loading the Excel file:", error);
            showNoTablesMessage();
        });    });

function showNoTablesMessage() {
    document.getElementById('grid-tables-container').innerHTML = 
            `
            <div class="no-tables">No tables available</div>
            `;
}

    function createSection(sectionTitle, sectionIndex, data) {
        const gridContainer = document.getElementById('grid-tables-container');

        var sectionTitleClean = createSlug(sectionTitle);
        // Create section header
        const sectionHeader = document.createElement('div');
        sectionHeader.classList.add('section-header');
        sectionHeader.dataset.section = sectionIndex;
        sectionHeader.innerHTML = `
                <span class="section-header-text" data-section="${sectionIndex}" data-section-title="${sectionTitle}" 
                    data-section-title-clean="${sectionTitleClean}">${sectionTitle}</span>
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
        gridContainer.appendChild(sectionHeader);
        gridContainer.appendChild(section);

        // Toggle section visibility on header click
        sectionHeader.addEventListener('click', () => {
            const isVisible = section.style.display === 'block';
            section.style.display = isVisible ? 'none' : 'block';
            sectionHeader.querySelector('i').classList.toggle('fa-chevron-down', isVisible);
            sectionHeader.querySelector('i').classList.toggle('fa-chevron-up', !isVisible);
        });
    }

    function displayTable(gridTablesContainer, data) {
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
        gridTablesContainer.appendChild(table);
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