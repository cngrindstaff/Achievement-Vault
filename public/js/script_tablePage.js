import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';

var debugLogging = false;

let gameId = null;
let gameNameFriendly = null;

const tableSectionHeaderTemplate = document.getElementById('table-section-header-template');
const tableSectionBodyTemplate = document.getElementById('table-section-body-template');

$(document).ready(async function () {
    gameId = utils.getQueryParam('id');

    // Fetch game data
    const gameData = await dbUtils.getGameData(gameId);
    gameId = gameData.ID;
    gameNameFriendly = gameData.FriendlyName;
    const linkToGamePage = `/game?id=${gameId}`;

    // Populate static page elements
    document.title = gameNameFriendly + ': Other Tables';
    document.getElementById('game-name').textContent = gameNameFriendly;
    document.getElementById('back-link').href = linkToGamePage;

    // Fetch and render game tables
    const gridContainer = document.getElementById('grid-tables-container');
    const gameTables = await dbUtils.getGameTablesByGameId(gameId);

    if (!gameTables || gameTables.length === 0) {
        console.log('No game tables found for this game ID.');
        showNoTablesMessage(gridContainer);
        return;
    }

    for (const gameTable of gameTables) {
        const index = gameTables.indexOf(gameTable);
        await createTableSection(gridContainer, gameTable, index);
    }

    // If no valid tables were created, show the "No tables available" message
    if (gridContainer.innerHTML.trim() === '') {
        console.log('gridContainer is empty, showing no tables message');
        showNoTablesMessage(gridContainer);
    }

    // Event delegation for section header clicks (toggle collapse)
    gridContainer.addEventListener('click', function (e) {
        const header = e.target.closest('.section-header');
        if (!header) return;
        const sectionBody = header.nextElementSibling;
        if (!sectionBody) return;
        $(sectionBody).slideToggle(250);
        header.classList.toggle('open');
    });
});


function showNoTablesMessage(container) {
    const div = document.createElement('div');
    div.className = 'no-tables';
    div.textContent = 'No tables available';
    container.appendChild(div);
}


async function createTableSection(gridContainer, gameTable, tableIndex) {
    const tableName = gameTable.Name;
    const tableNameClean = utils.createSlug(tableName);

    // Clone and populate section header template
    const headerClone = tableSectionHeaderTemplate.content.cloneNode(true);
    const headerDiv = headerClone.querySelector('.section-header');
    headerDiv.dataset.section = tableIndex;

    const headerText = headerClone.querySelector('.section-header-text');
    headerText.dataset.section = tableIndex;
    headerText.dataset.sectionTitle = tableName;
    headerText.dataset.sectionTitleClean = tableNameClean;
    headerText.textContent = tableName;

    // Clone and populate section body template
    const bodyClone = tableSectionBodyTemplate.content.cloneNode(true);
    const sectionDiv = bodyClone.querySelector('.section-table');
    sectionDiv.dataset.section = tableIndex;

    // Fetch table records and populate the table
    const tableRecords = await dbUtils.getTableRecordsByTableId(gameTable.ID);
    if (tableRecords === null) {
        return;
    }
    displayTable(sectionDiv, gameTable, tableRecords);

    // Append to container
    gridContainer.appendChild(headerClone);
    gridContainer.appendChild(bodyClone);
}


function displayTable(sectionDiv, gameTable, tableRecords) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Build header array from available fields
    const headerArray = [];
    if (gameTable.FieldName_01) { headerArray.push(gameTable.FieldName_01); }
    if (gameTable.FieldName_02) { headerArray.push(gameTable.FieldName_02); }
    if (gameTable.FieldName_03) { headerArray.push(gameTable.FieldName_03); }
    if (gameTable.FieldName_04) { headerArray.push(gameTable.FieldName_04); }
    if (gameTable.FieldName_05) { headerArray.push(gameTable.FieldName_05); }
    if (gameTable.FieldName_06) { headerArray.push(gameTable.FieldName_06); }

    const headerCount = headerArray.length;
    if (debugLogging) console.log('There are ' + headerCount + ' headers');

    // Create header row
    const headerRow = document.createElement('tr');
    headerArray.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header;
        th.dataset.index = index;
        th.addEventListener('click', () => sortTable(table, index));
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create data rows
    tableRecords.forEach((record) => {
        if (debugLogging) console.log('record:', record);

        const tr = document.createElement('tr');
        for (let i = 0; i < headerCount; i++) {
            const td = document.createElement('td');
            // Force field name to always have 2 digits (Field_01, Field_02, etc.)
            const fieldName = 'Field_' + String(i + 1).padStart(2, '0');
            td.textContent = record[fieldName];
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    sectionDiv.appendChild(table);
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
