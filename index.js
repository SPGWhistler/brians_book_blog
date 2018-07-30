const puppeteer = require('puppeteer');

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
	  const title = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.bc-spacing-small > h1').innerText)
	  const author = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.authorLabel').innerText)
	  const narrator = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.narratorLabel').innerText)
	  const publisher = await page.evaluate(() => document.querySelector('#center-1 > div > div > div > div.bc-col-responsive.bc-col-5 > span > ul > li.bc-list-item.publisherLabel').innerText)
	  const description = await page.evaluate(() => document.querySelector('#center-8 > div > div > div:nth-child(2)').innerText)
	  console.log("<hr />");
	  console.log("<h3>IMAGE HERE</H3>");
	  console.log("<strong>" + title + " " + author + "</strong>");
	  console.log(narrator);
	  console.log(publisher);
	  console.log(description);

	  await browser.close();
	})();
});
