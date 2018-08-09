var express = require('express');
var app = express();
var path = require('path');
var http = require('http');
var requestHttps = require('request');

var penthouse = require('penthouse'),
    path = require('path'),
    fs = require('fs'),
    __basedir = './';

app.use('/css', express.static('css'))

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/testpage.html'));
});

app.get('/generate', function (req, res) {

    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled Rejection at: Promise');
        // application specific logging, throwing an error, or other logic here
      });

    console.log("start response");

    var hostView = req.query.host;
    var cssPath = req.query.css;
    var token = req.query.token;

    var host = cssPath.replace("http://", "").replace("https://", "");
    host = host.substring(0, host.indexOf("/"));
    host = host.replace(":","");


    var pageHeader = {
        'Accept-Encoding': 'identity', // add if getting compression errors like 'Data corrupted'
    }

    if(token){
        console.log("token: ", req.query.token);
        pageHeader.Token = req.query.token;
    }

    var fileName = cssPath.substring(cssPath.lastIndexOf("/") + 1).replace(".css");
    var f = fileName.substr(0, fileName.indexOf("?"))
    var ver = fileName.substring(fileName.lastIndexOf("?") + 1);
    if (ver){
        f += "{" + ver + "}";
    }

    var width = req.query.width;
    var height = req.query.height;

    if (!width) width = 1200;
    if (!height) height = 1000;

    if (!fs.existsSync("cached/" + host + "/" + f + ".css") || fs.statSync("cached/" + host + "/" + f + ".css").size == 0) {

        try {
            fs.mkdirSync("cached");
        }
        catch (error) { }
    
        try {
            fs.mkdirSync("cached/" + host);
        }
        catch (error) { }

        console.log("start download css");
        var file = fs.createWriteStream("cached/" + host + "/" + f + ".css");

		var request = requestHttps(cssPath, function(error, response, body) {
            console.log("start write css");
			
			file.write(body);
			file.end();
            
            console.log("end write css");

             callPenhouse(hostView, host, f, width, height, res, pageHeader);

        });
    }

    else {
        callPenhouse(hostView, host, f, width, height, res, pageHeader);
    }

});

var callPenhouse = function(hostView, host, f, width, height, res, pageHeader){


    console.log("start generate: ", hostView);
    console.log("css: ", "cached/" + host + "/" + f + ".css");

    try{
        penthouse({
            url: hostView,       // can also use file:/// protocol for local files
            css: "cached/" + host + "/" + f + ".css",//'http://bnv.manaodev/bundles/master-css?v=Ok5WYmEr0c4ijPCulYIVfPou95buK0Wn9tqcYmMWTk01',
            //cssString: 'body { color; red }', // the original css to extract critcial css from
            // css: 'pathTo/main.css',      // path to original css file on disk

            // OPTIONAL params
            width: width,                    // viewport width
            height: height,                    // viewport height
            keepLargerMediaQueries: false,  // when true, will not filter out larger media queries
            forceInclude: [ // selectors to keep
                '.keepMeEvenIfNotSeenInDom',
                /^\.regexWorksToo/
            ],
            propertiesToRemove: [
                '(.*)transition(.*)',
                'cursor',
                'pointer-events',
                '(-webkit-)?tap-highlight-color',
                '(.*)user-select'
            ],
            timeout: 120000,                 // ms; abort critical CSS generation after this timeout
            pageLoadSkipTimeout: 0,         // ms; stop waiting for page load after this timeout (for sites with broken page load event timings)
            maxEmbeddedBase64Length: 1000,  // characters; strip out inline base64 encoded resources larger than this
            userAgent: 'Penthouse Critical Path CSS Generator', // specify which user agent string when loading the page
            renderWaitTime: 1000,            // ms; render wait timeout before CSS processing starts (default: 100)
            blockJSRequests: true,          // set to false to load (external) JS (default: true)
            customPageHeaders: pageHeader,
            strict: false,                  // set to true to throw on CSS errors
            screenshots: {
                // turned off by default
                // basePath: 'homepage', // absolute or relative; excluding file extension
                // type: 'jpeg', // jpeg or png, png default
                // quality: 20 // only applies for jpeg type
                // -> these settings will produce homepage-before.jpg and homepage-after.jpg
            },

            puppeteer: {
                getBrowser: undefined,        // A function that resolves with a puppeteer browser to use instead of launching a new browser session
            }
        })
            .then(criticalCss => {
                try{
                console.log("Generated successful");

                res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
                res.write(criticalCss); // You Can Call Response.write Infinite Times BEFORE response.end
                res.end("");

                }
                catch(errs){
                    console.log("ERROR : ", errs);
                }
            })
            .catch(err => {
                console.log(err);
                res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
                res.end("Generate error");
            });

        }
        catch(err){
            console.log("ERROR promise : ", err);
        }
}

app.listen(process.env.PORT || 8000, function () {
    console.log('App listening on port 8000!')
});