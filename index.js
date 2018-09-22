const puppeteer = require('puppeteer');
const download = require('download-file');
const fs = require('fs');
const del = require('del');
const util = require('util');

const selectors = {
    title: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li:nth-child(1) > h1',
    author: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.authorLabel',
    narrator: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.narratorLabel',
    publisher: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.publisherLabel',
    description: '#center-8 > div > div > div:nth-child(2)',
    image: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-3 > div > div:nth-child(1) > img'
};

del.sync("images/");
del.sync("output.txt");

function log(type, msg) {
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
    str = str.replace(/publisher:/i, "Publisher");
    return str;
}

async function getProperty(selectorName, property, id) {
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

let ids = [];
process.argv.forEach(function (val, index, array) {
    if (index > 1) {
        ids.push(val);
    }
});

let page;
ids.forEach((id) => {
    (async () => {
        try {
            const browser = await puppeteer.launch();
            page = await browser.newPage();
            let result = await page.goto('https://www.audible.com/pd/' + id);
            if (result.ok()) {
                const resultsSelector = '#center-1';
                await page.waitForSelector(resultsSelector);
                let title = stripStuff(await getProperty('title', 'innerText', id));
                let author = stripStuff(await getProperty('author', 'innerText', id));
                let narrator = stripStuff(await getProperty('narrator', 'innerText', id));
                let publisher = stripStuff(await getProperty('publisher', 'innerText', id));
                let description = stripStuff(await getProperty('description', 'innerText', id));
                const imgUrl = await getProperty('image', 'src', id);

                let output = "";
                output += "<hr />";
                output += "<hr />";
                output += "<p>IMAGE</p>";
                output += "<strong>" + title + " " + author + "</strong>";
                output += narrator;
                output += publisher;
                output += description;
                output += "\n\n";
                await downloadFile(imgUrl, encodeURIComponent(title + ".jpg").replace(/%20/g, " "));
                //Keep this line below 'downloadFile'.
                writeFile(output);
            } else {
                log("error", "Could not get data from site with id '" + id + "'.", result.status());
            }
            await browser.close();
        } catch (error) {
            log("error", "Could not get data from site with id '" + id + "'.", error);
        }
    })();
});
