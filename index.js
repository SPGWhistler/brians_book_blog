const puppeteer = require('puppeteer');
const download = require('download-file');

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

let ids = [];
process.argv.forEach(function (val, index, array) {
    if (index > 1) {
        ids.push(val);
    }
});

ids.forEach((id) => {
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.audible.com/pd/' + id);
        const resultsSelector = '#center-1';
        await page.waitForSelector(resultsSelector);
        let title = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li:nth-child(1) > h1').innerText)
        let author = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.authorLabel').innerText)
        let narrator = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.narratorLabel').innerText)
        let publisher = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.publisherLabel').innerText)
        let description = await page.evaluate(() => document.querySelector('#center-8 > div > div > div:nth-child(2)').innerText)
        const imgUrl = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-3 > div > div:nth-child(1) > img').src)
	title = stripStuff(title);
	author = stripStuff(author);
	narrator = stripStuff(narrator);
	publisher = stripStuff(publisher);
	description = stripStuff(description);

        console.log("<hr />");
        console.log("<h3>IMAGE HERE</H3>");
        console.log("<strong>" + title + " " + author + "</strong>");
        console.log(narrator);
        console.log(publisher);
        console.log(description);
        await downloadFile(imgUrl, encodeURIComponent(title + ".jpg"));

        await browser.close();
    })();
});
