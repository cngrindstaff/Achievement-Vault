# Achievement Vault
This program allows you to track achievements in video games. 

## How it works
This uses a MySql Database to maintain records of Games and Trackable Items, such as Achievements. 

These can be separated into sections. Each section will expand into a different area 
on the page, for organization's sake. 

For trackable items that have degrees, more than one checkbox can be added per item. For example, the Keepsakes items in 
Hades increase in level up to 3 times, so for each of these, there are 3 checkboxes next to each item. 

## Node server
This requires a node server for authentication and database management.

## Variables
This project requires environment variables. See ```sample.env``` for the fields that are needed. 
Fill them out and rename the file to ```.env``` 
Alternatively, these can be set up as actual Environment Variables.

## Running Locally
1. To simply run the server, run the following command: ```node backend/server.js```
2. Alternatively, use nodemon to make the server automatically restart when files are modified: 
   * Install nodemon: ```npm install -g nodemon```
   * Use nodemon to start the server: ```nodemon backend/server.js``` 
3. Load http://localhost:3000/

The ```runlocal.cmd``` file runs the server and opens Chrome to the localhost page.


## Random notes
This uses ES Modules instead of CommonJS
### Rider
Auto-compile SASS to CSS using a [FileWatch in Jetbrains]( https://www.jetbrains.com/help/rider/Transpiling_SASS_LESS_and_SCSS_to_CSS.html#less_sass_scss_compiling_to_css)

If sass isn't installed, run
```npm install -g sass```

Bug: Must set FileWatch Scope to "Current File". [Bug info](https://youtrack.jetbrains.com/issue/RIDER-55683/Unknown-scope-sign-for-Project-scope-in-SCSS-new-file-watcher)

## V3
This now uses a My SQL Database

Main page is `index.html`. It loads `script_home.js`. The script calls an endpoint in db.js, which calls the GetAllGames stored procedure. It then creates a list of the games and generates links to them. 

Each item listed will link to the game page - `game?id=${game.ID}`. 

The `game.html` file creates a landing page for the game. It then calls `script_gamePage.js`, which creates links to the main checklist - `checklist?id=${gameId}` - and the page with additional tables - `tables?id=${gameId}`.

**Sorting options:**
* order-name  = ListOrder ASC, Name ASC
* name = Name ASC
* completed-order-name = NumberAlreadyCompleted ASC, ListOrderASC, Name ASC
* completed-name = NumberAlreadyCompleted ASC, Name ASC
* null = same as order-name

# Future Updates
-[ ] Refresh Section Order page on save
-[ ] Allow editing of existing Sections
-[ ] Allow editing of existing Records
-[ ] Allow deleting existing Sections
-[x] Allow deleting existing Records
-[ ] Validate checkbox info on Adding records
-[x] Trim beginning/ending whitespace when adding new sections/records
-[ ] Optimize how records/sections are auto-numbered when re-ordering
-[ ] Change New Record/Section pages to modals?
-[ ] Auto-fill new Record/Section form with 0 completed, 1 available, and order set to 1
-[ ] Edit/Add records/sections need to support Section Groups]

## Adding a new Route
1. Create the new HTML file in the root directory
2. Create the new JS file and put it in js/script_(page).js
3. Add the path in server.js

## Pages
1. index.html - Home page, lists all games
2. game.html - Game landing page, links to checklist and tables
3. checklist.html - Main checklist page
4. table.html - Additional tables page
5. manage_sectionRecords.html - Page to add a new record
6. manage_sections.html - Page to add a new section