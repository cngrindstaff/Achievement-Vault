
# Achievement Vault
This program allows you to track achievements in video games. 

## How it works
Each game uses its own excel file. In it, list the achievements (and descriptions if you want). 
Achievements/trackable items can be separated into sections. Each section will expand into a different area 
on the page, for organization's sake. As items are checked off, they will be stored in local storage. To prevent loss 
of data, the excel file is also set up to support having items already marked as checked. 
For trackable items that have degrees, more than one checkbox can be added per item. For example, the Keepsakes items in 
Hades increase in level up to 3 times, so for each of these, there are 3 checkboxes next to each item. 

## Node server
This has been modified to include a node server for 3 new features:
1. Email and password log-in
2. Sending an email when an item is checked/unchecked
3. Making a record in Google sheets when an item is checked/unchecked

## Running Locally
1. Run the server with: ```node backend/server.js```

2. Alternatively, use these commands to make the server automatically restart when files are modified: 
   * Install nodemon: ```npm install -g nodemon```
   * Use nodemon to start the server: ```nodemon backend/server.js``` 
3. Load http://localhost:3000/

Alternatively, create a CMD file with the following content and put it in the project's root directory:
```
start chrome http://localhost:3000/
nodemon backend/server.js
```

## Random notes
This uses ES Modules instead of CommonJS
### Rider
Auto-compile SASS to CSS using a [FileWatch in Jetbrains]( https://www.jetbrains.com/help/rider/Transpiling_SASS_LESS_and_SCSS_to_CSS.html#less_sass_scss_compiling_to_css)

If sass isn't installed, run
```npm install -g sass```

Bug: Must set FileWatch Scope to "Current File". [Bug info](https://youtrack.jetbrains.com/issue/RIDER-55683/Unknown-scope-sign-for-Project-scope-in-SCSS-new-file-watcher)

