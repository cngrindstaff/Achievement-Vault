
# Achievement Vault



Initially based on [this](https://github.com/jcguigue/HadesCompletion), but highly modified to support multiple games, changes in excel, and more.



## Accessing the excel files locally
When running this locally, by default there will be a CORS error when the JS tries to access the excel file. The file needs to be hosted on a local web server.

Install node.js

Install http-server (use command line/bash):
```
npm install http-server
```
Navigate to your project directory and run:
```
npm install http-server --cors
```
*By default, `http-server` doesn’t enable CORS headers. You need to explicitly allow them by running the server with the `--cors` flag*
Access your files at `http://localhost:8080`





## Random notes
### Rider
Auto-compile SASS to CSS using a [FileWatch in Jetbrains]( https://www.jetbrains.com/help/rider/Transpiling_SASS_LESS_and_SCSS_to_CSS.html#less_sass_scss_compiling_to_css)

If sass isn't installed, run
```npm install -g sass```

Bug: Must set FileWatch Scope to "Current File". [Fix ](https://youtrack.jetbrains.com/issue/RIDER-55683/Unknown-scope-sign-for-Project-scope-in-SCSS-new-file-watcher)