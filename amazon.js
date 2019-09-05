/**
 * Scrape amazon product data.
 *
 * @param options: Holds all configuration data and options
 * @param options.chunk: The chunk that this Worker was assigned
 * @param page: A puppeteer like page object. See here:
 *  https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page
 */
async function Worker(page, options) {
    const results = {};
    await page.goto('https://www.amazon.com/');
    await page.waitForSelector('#nav-search');
    await page.waitFor(200);

    for (let product of options.chunk) {
        // search product
        const input = await page.$('input[name="field-keywords"]');
        await page.evaluate((value) => {
            document.querySelector('input[name="field-keywords"]').value = value;
        }, product);
        await input.focus();
        await page.keyboard.press("Enter");
        await page.waitForSelector('.s-result-list');
        await page.waitFor(1000);

        // parse product information
        results[product] = await page.evaluate(() => {
            let products =  document.querySelectorAll('.s-result-list .s-result-item');
            const data = [];
            products.forEach((el) => {
                let obj = {};
                let linkElement = el.querySelector('div > h2 > a');
                try {
                    if (linkElement) {
                        obj.link = linkElement.getAttribute('href');
                        obj.title = linkElement.querySelector('span').innerText;
                    }
                    obj.price = el.querySelector('.a-price span').innerText;
                    data.push(obj);
                } catch (e) {
                }
            });
            return data;
        });
    }

    return results;
}