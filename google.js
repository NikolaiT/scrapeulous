/**
 *
 * The worker function contains your scraping/crawling logic.
 *
 * Each Worker() function is executed on a distributed unique machine
 * with dedicated CPU, memory and browser instance. A unique IP is not guaranteed, but it is the norm.
 *
 * Scraping workers time out after 120 seconds. So the function
 * should return before this hard limit.
 *
 * @param options: Holds all configuration data and options
 * @param options.chunk: The chunk that this Worker was assigned
 * @param page: A puppeteer like page object. See here:
 *  https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page
 */
async function Worker(page, options) {
    const results = {};
    let selector = '[name="q"]';
    await page.goto('https://www.google.com/webhp?num=10');
    await page.waitForSelector('#main');

    for (let keyword of options.chunk) {
        const input = await page.$('input[name="q"]');
        await page.evaluate((value, selector) => {
            document.querySelector(selector).value = value;
        }, keyword, selector);
        await input.focus();
        await page.keyboard.press("Enter");
        await page.waitForSelector('.g .r');
        await page.waitFor(500);

        results[keyword] = await page.evaluate(() => {
            let res =  document.querySelectorAll('.g .r a');
            const data = [];
            res.forEach((linkElement) => {
                let obj = {};
                try {
                    if (linkElement) {
                        obj.url = linkElement.getAttribute('href');
                        obj.title = linkElement.innerText;
                        if (obj.title) {
                            data.push(obj);
                        }
                    }
                } catch (e) {
                }
            });
            return data;
        });
    }

    return results;
}