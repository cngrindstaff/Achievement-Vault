# Notes from before the change to add a Node.js backend
I don't want to lose this info, so I'm keeping it here.

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

