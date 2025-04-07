import * as utils from './script_utilities.js';
import * as dbUtils from './script_db_helper.js';

const linkToHomePage = './';

var debugLogging = false;


// Define these at the top level so they can be reused
let gameId = null;
let gameNameFriendly = null;
let gameName = null;
let hasDataTables = false;
let linkToGamePage = null;
let htmlTitle = null;
$(document).ready(async function () {
    var passed_gameId = utils.getQueryParam('id');
    var passed_gameName = utils.getQueryParam('name');

    // Fetch game data first
    
    const gameData = await dbUtils.loadGameData(passed_gameId);
    //if(debugLogging) console.log('gameData:', gameData);
    gameId = gameData.ID;
    gameName = gameData.Name;
    gameNameFriendly = gameData.FriendlyName;
    hasDataTables = gameData.HasDataTables;
    linkToGamePage = `/game?id=${gameId}&name=${gameName}`;
    htmlTitle = gameNameFriendly + ': Other Tables';

    //set the title field that's in the head using the variable from the game's HTML
    $("title").text(htmlTitle);
    
    // Add sibling elements before grid-checklist-container
    //.append() puts data inside an element at last index and .prepend() puts the prepending elem at first index.
    const mainContainer = $('#container');

    mainContainer.prepend('<h1>' + htmlTitle + '</h1>');

    mainContainer.prepend(`<div class="link-container"> </div>`);

    const linkContainerDiv = $('.link-container');
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToGamePage + '" class="link-icon-text" title="Return to Game Page"><i class="fa fa-arrow-left fa-lg fa-border" ></i></a></div>');
    linkContainerDiv.prepend('<div class="link-icon"><a href="' + linkToHomePage + '" class="link-icon-text"><i class="fa fa-solid fa-house fa-lg fa-border" ></i></a></div>');

    const gridContainer = document.getElementById('grid-tables-container');
    gridContainer.innerHTML = ''; // Clear previous data
    // get the game tables
    const gameTables = await dbUtils.loadGameTablesByGameId(passed_gameId);
    
    let gameTableCount = gameTables.length;
    if(gameTableCount === 0){
        console.log('No game tables found for this game ID.');
        showNoTablesMessage();
        return;       
    }

/*    gameTables.forEach((gameTable, index) => {
        createTableSection(gameTable, index);
    });*/
    
    for (const gameTable of gameTables) {
        const index = gameTables.indexOf(gameTable);
        await createTableSection(gameTable, index);
    }

    // If no valid tables were created, show the "No tables available" message
    if (gridContainer.innerHTML.trim() === '') {
        console.log('gridContainer is empty, showing no tables message');
        showNoTablesMessage();
    }
    

});

function showNoTablesMessage() {
    document.getElementById('grid-tables-container').innerHTML = 
            `
            <div class="no-tables">No tables available</div>
            `;
}


async function createTableSection(gameTable, tableIndex) {
    const gridContainer = document.getElementById('grid-tables-container');
    var tableName = gameTable.Name;
    var tableNameClean = utils.createSlug(tableName);


    // Create section header
    const sectionHeader = document.createElement('div');
    sectionHeader.classList.add('section-header');
    sectionHeader.dataset.section = tableIndex;
    sectionHeader.innerHTML = `
                <span class="section-header-text" data-section="${tableIndex}" data-section-title="${tableName}" 
                    data-section-title-clean="${tableNameClean}">${tableName}</span>
                <span class="section-header-icon">
                    <i class="fas fa-chevron-down"></i>
                </span>
            `;
    // Create collapsible section
    const sectionDiv = document.createElement('div');
    sectionDiv.classList.add('section-table');
    sectionDiv.dataset.section = tableIndex;

    // Populate section with table
    var tableRecords = await dbUtils.loadTableRecordsByTableId(gameTable.ID);
    if(tableRecords === null){
        return;
    }
    displayTable(sectionDiv, gameTable, tableRecords);

    // Append elements to container
    gridContainer.appendChild(sectionHeader);
    gridContainer.appendChild(sectionDiv);

    // Toggle section visibility on header click
    sectionHeader.addEventListener('click', () => {
        const isVisible = sectionDiv.style.display === 'block';
        sectionDiv.style.display = isVisible ? 'none' : 'block';
        sectionHeader.querySelector('i').classList.toggle('fa-chevron-down', isVisible);
        sectionHeader.querySelector('i').classList.toggle('fa-chevron-up', !isVisible);
    });
}




    function displayTable(sectionDiv, gameTable, tableRecords) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create headers
        let headerArray = [];
        if(gameTable.FieldName_01) { headerArray.push(gameTable.FieldName_01); }
        if(gameTable.FieldName_02) { headerArray.push(gameTable.FieldName_02); }
        if(gameTable.FieldName_03) { headerArray.push(gameTable.FieldName_03); }
        if(gameTable.FieldName_04) { headerArray.push(gameTable.FieldName_04); }
        if(gameTable.FieldName_05) { headerArray.push(gameTable.FieldName_05); }
        if(gameTable.FieldName_06) { headerArray.push(gameTable.FieldName_06); }
        
        let headerCount = headerArray.length;

        if(debugLogging) console.log('There are ' + headerCount + ' headers');
        
        const headerRow = document.createElement('tr');
        headerArray.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            th.dataset.index = index;
            th.addEventListener('click', () => sortTable(table, index));
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        //Create records
        tableRecords.forEach((record, index) =>
        {
            //console.log('record' + record);
            if(debugLogging) console.log('record:', record);
            //Using the "+" makes everything treated as strings, and thus outputs "[output output]"
            //Using the "," treats "record" as an object and logs it properly

            const tr = document.createElement('tr');
            for(let i = 0; i < headerCount; i++){
                const td = document.createElement('td');

                //force it to always have 2 digits
                var recordName = 'Field_' + String(i + 1).padStart(2, '0');
                td.textContent = record[recordName];
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