//Include a bunch of stuff we use
const puppeteer = require('puppeteer');
const download = require('download-file');
const fs = require('fs');
const del = require('del');
const util = require('util');
const Handlebars = require('handlebars');
const moment = require('moment');

//These are the selectors we use
const selectors = {
    title: '#center-1 > div > div.hero-content.bc-pub-clearfix.bc-container > div > div > div > div.bc-col.bc-col-6.bc-push-1 > h1',
    author: '#center-1 > div > div.hero-content.bc-pub-clearfix.bc-container > div > div > div > div.bc-col.bc-col-6.bc-push-1 > div:nth-child(4) > span',
    narrator: '#center-1 > div > div.hero-content.bc-pub-clearfix.bc-container > div > div > div > div.bc-col.bc-col-6.bc-push-1 > div:nth-child(5)',
    //publisher: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.publisherLabel',
    description: '#center-8 > div > div > div:nth-child(2)',
    image: '#center-1 > div > div.hero-content.bc-pub-clearfix.bc-container > div > div > div > div.bc-col.bc-col-4.bc-push-1 > div > div:nth-child(1) > img',
				resultsSelector: '#center-1',
				mp3: 'button[data-mp3]'
};

//Clean up from last time
del.sync("images/");
del.sync("output.txt");

//Utility functions
function log(type, msg, ...args) {
    let color;
    switch (type) {
        case "success":
            color = "\x1b[32m%s\x1b[0m"; //yellow
            break;
        case "warn":
            color = "\x1b[33m%s\x1b[0m"; //yellow
            break;
        case "error":
            color = "\x1b[31m%s\x1b[0m"; //red
            break;
        case "log": //reset
        default:
            color = "\x1b[0m%s\x1b[0m"; //reset
            break;
    }
    if (typeof msg === "string") {
        console.log(color, msg);
    } else {
        console.log(util.inspect(msg, {
            showHidden: false,
            depth: null,
            colors: true,
            maxArrayLength: null,
            breakLength: null,
            compact: false
        }));
    }
};
function downloadFile(url, filename) {
    return new Promise(resolve => {
        download(url, {
            'filename': filename,
            'directory':'./images/'
        }, function(err){
            if (err) throw err;
            resolve();
        })
    });
};
function stripStuff(str) {
    str = str.replace(/by:/i, "by");
    //str = str.replace(/publisher: /i, "");
    return str;
}
async function getAttribute(selectorName, attribute, id, page) {
    let val = await page.evaluate((selector, attribute) => {
        let elm = document.querySelector(selector);
        if (elm) {
            return elm.getAttribute(attribute);
        }
        return false;
    }, selectors[selectorName], attribute);
    if (val) {
        return val;
    }
    log('warn', 'Could not find the ' + selectorName + ' element for ' + id + '.\n');
    return "";
}
async function getProperty(selectorName, property, id, page) {
    let val = await page.evaluate((selector, property) => {
        let elm = document.querySelector(selector);
        if (elm && elm[property]) {
            return elm[property];
        }
        return false;
    }, selectors[selectorName], property);
    if (val) {
        return val;
    }
    log('warn', 'Could not find the ' + selectorName + ' element for ' + id + '.\n');
    return "";
}
function writeFile(output) {
    fs.writeFileSync("output.txt", output, {
        flag: "a"
    });
}


//Main script below here

//Read in the template and 'compile' it.
let template = fs.readFileSync('template.html', {
    flag: 'r'
}).toString();
template = Handlebars.compile(template);

//Get the ASIN numbers from the path arguments
let ids = [];
let urls = process.argv[2];
urls = urls.split(" ");
for (let url of urls) {
    let matches = url.match(/(?:[/dp/]|$)([A-Z0-9]{10})/);
    if (matches !== null && matches[1]) {
        ids.push(matches[1]);
    }
}
log('log', "Found " + ids.length + " ids.");

//Asynchronously request the pages (in parallel)
(async () => {
    await Promise.all(ids.map(async (id) => {
        try {
            log('log', "Started " + id);
            const browser = await puppeteer.launch();
            let page = await browser.newPage();
            //Naviage to the page
            let result = await page.goto('https://www.audible.com/pd/' + id);
            if (result.ok()) {
                //Wait until the page is loaded
                await page.waitForSelector(selectors.resultsSelector);

																//Find the elements we care about (in our template)
																let mp3Url = await getAttribute('mp3', 'data-mp3', id, page);
                let title = stripStuff(await getProperty('title', 'innerText', id, page));
                let author = stripStuff(await getProperty('author', 'innerText', id, page));
                let narrator = stripStuff(await getProperty('narrator', 'innerText', id, page));
                //let publisher = stripStuff(await getProperty('publisher', 'innerText', id, page));
                let description = stripStuff(await getProperty('description', 'innerText', id, page));
                let url = await getProperty('image', 'src', id, page);
																let imgSrc = encodeURIComponent(title + ".jpg").replace(/%20/g, "-");

                //Download the image
																await downloadFile(url, imgSrc);
																
																//Downlad the mp3
																await downloadFile(mp3Url, title + ".mp3");

                //All done with this request
                log('success', "Done with " + id);
                return {
                    dateString: moment().format('MMMM Do'),
                    year: moment().format('YYYY'),
                    month: moment().format('MM'),
                    title,
                    author,
                    narrator,
                    //publisher,
                    description,
                    imgSrc
                };
            } else {
                log("error", "Page navigation error. Could not get data from site with id '" + id + "'.", result.status());
            }
            //There is a small bug here. I'll fix it later. (sometimes the script will hang)
            await browser.close();
        } catch (error) {
            log("error", error);
            log("error", "General Error. Could not get data from site with id '" + id + "'.", error);
        }
    })).then((results) => {
        //After all pages have finished, we 'render' the template and save it to a file.
        let vars = {
            dateString: moment().format('MMMM Do'),
            year: moment().format('YYYY'),
            month: moment().format('MM'),
            books: results
        };
        writeFile(template(vars));
        process.exit();
    });
})();
