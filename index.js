const puppeteer = require('puppeteer');
const download = require('download-file');
const fs = require('fs');
const del = require('del');

const selectors = {
    title: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li:nth-child(1) > h1',
    author: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.authorLabel',
    narrator: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.narratorLabel',
    publisher: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.publisherLabel',
    description: '#center-8 > div > div > div:nth-child(2)',
    image: '#center-1 > div > div > div > div.bc-col-responsive.bc-col-3 > div > div:nth-child(1) > img'
};

del.sync("images/");

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
    console.log(color, msg);
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

async function getProperty(selectorName, property) {
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
    log('error', 'Could not find the ' + selectorName + ' element.\n');
    return "";
}

function writeFile(output) {
    fs.writeFileSync("output.txt", output, {
        flag: "w"
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
            await page.goto('https://www.audible.com/pd/' + id);
            const resultsSelector = '#center-1';
            await page.waitForSelector(resultsSelector);
            let title = await getProperty('title', 'innerText');
            let author = await getProperty('author', 'innerText');
            let narrator = await getProperty('narrator', 'innerText');
            let publisher = await getProperty('publisher', 'innerText');
            let description = await getProperty('description', 'innerText');
            const imgUrl = await getProperty('image', 'src');
            title = stripStuff(title);
            author = stripStuff(author);
            narrator = stripStuff(narrator);
            publisher = stripStuff(publisher);
            description = stripStuff(description);

            let output = "";
            output += "<hr />";
            output += "<hr />";
            output += "<p>IMAGE</p>";
            output += "<strong>" + title + " " + author + "</strong>";
            output += narrator;
            output += publisher;
            output += description;
            writeFile(output);
            await downloadFile(imgUrl, encodeURIComponent(title + ".jpg").replace(/%20/g, " "));

            await browser.close();
        } catch (error) {
            console.log("Could not get data from site with id '" + id + "'.", error);
            process.exit();
        }
    })();
});
