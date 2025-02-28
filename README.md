
# Achievement Vault
This program allows you to track achievements in video games. 
It supports multiple games. Just add a new folder, html file, and excel sheet, then add a link to it on the main page.

## How it works
You can have an excel file for each game. In it, list the achievements (and descriptions if you want). 
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





## Random notes
### Rider
Auto-compile SASS to CSS using a [FileWatch in Jetbrains]( https://www.jetbrains.com/help/rider/Transpiling_SASS_LESS_and_SCSS_to_CSS.html#less_sass_scss_compiling_to_css)

If sass isn't installed, run
```npm install -g sass```

Bug: Must set FileWatch Scope to "Current File". [Bug info](https://youtrack.jetbrains.com/issue/RIDER-55683/Unknown-scope-sign-for-Project-scope-in-SCSS-new-file-watcher)


## More random notes

digital ocean > Settings > Components > Commands > Build Command > npm install

Digital Ocean needs an Output Directory. It atomatically scans for _static, dist, public, and build. Because there is no build process for this, we need to define it as "/". This is in the same place as the Command from above

sender email
chelseagrindstaff+av@gmail.com





I'm now getting a 404 when running locally. The main project folder is at Documents/Achievement-Vault. The server.js file lives at Documents/Achievement-Vault/js/server.js. The path defined for the POST inside that server.js file is "/send-email".  I used command prompt to go into the Achievement-Vault directory, and ran "node js/server.js", and it is now running on port 3000

Given this info, what is the correct URL to the api that my frontend javascript needs to call?


Since your Node.js server (server.js) is running on port 3000, and it defines the POST endpoint as "/send-email", your frontend should call:

bash
Copy
Edit
http://localhost:3000/send-email
Why?
Your backend is listening on port 3000 (app.listen(3000)).
/send-email is a relative path, meaning it’s available under http://localhost:3000.
Since you’re running server.js from Documents/Achievement-Vault, its location (js/server.js) does not affect the API's public URL.



npm install @sendgrid/mail

npm init -y


to run the node server locally: 

node js/server.js


for node password, run 

npm install express dotenv cors








Start your Node.js server by running:

sh
Copy
Edit
node server.js
or if you want automatic reloads whenever you make changes:

sh
Copy
Edit
npx nodemon server.js
(Nodemon restarts the server when you modify files.)




digitalocean domain servers
ns1.digitalocean.com 
ns2, ns3


changed back to godaddy 

