
# Achievement Vault
This program allows you to track achievements in video games. 
It supports multiple games. Just add a new folder, html file, and excel sheet, then add a link to it on the main page.

## How it works
Each game uses its own excel file. In it, list the achievements (and descriptions if you want). 
Achievements/trackable items can be separated into sections. Each section will expand into a different area 
on the page, for organization's sake. As items are checked off, they will be stored in local storage. To prevent loss 
of data, the excel file is also set up to support having items already marked as checked. 
For trackable items that have degrees, more than one checkbox can be added per item. For example, the Keepsakes items in 
Hades increase in level up to 3 times, so for each of these, there are 3 checkboxes next to each item. 




## Accessing the excel files locally
When running this locally, by default there will be a CORS error when the JS tries to access the excel file. The file needs to be hosted on a local web server.

Install node.js

Install http-server (use command line/bash):
```
npm install -g http-server
```
Navigate to your project directory and run:
```
http-server --cors
```
*By default, `http-server` doesn’t enable CORS headers. You need to explicitly allow them by running the server with the `--cors` flag*

Access your files at `http://localhost:8080`


## Node server
This has been modified to include a node server for email and password 

Run the server with:
```node backend/server.js```

Alternatively, use the following to make the server automatically restart when files are modified: 
```npm install -g nodemon```
```nodemon backend/server.js``` 

## Random notes
### Rider
Auto-compile SASS to CSS using a [FileWatch in Jetbrains]( https://www.jetbrains.com/help/rider/Transpiling_SASS_LESS_and_SCSS_to_CSS.html#less_sass_scss_compiling_to_css)

If sass isn't installed, run
```npm install -g sass```

Bug: Must set FileWatch Scope to "Current File". [Bug info](https://youtrack.jetbrains.com/issue/RIDER-55683/Unknown-scope-sign-for-Project-scope-in-SCSS-new-file-watcher)
