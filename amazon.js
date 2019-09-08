/**
 * Scrape amazon product data.
 *
 * @param keyword: The keyword that is requested on Amazon
 * @param options: Holds all configuration data and options
 */
async function Worker(keyword, options) {
    await page.goto('https://www.amazon.com/');
    await page.waitForSelector('#nav-search');
    await page.waitFor(200);

    // search product
    const input = await page.$('input[name="field-keywords"]');
    await page.evaluate((value) => {
        document.querySelector('input[name="field-keywords"]').value = value;
    }, keyword);
    await input.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('.s-result-list');
    await page.waitFor(1000);

    // parse product information
    return await page.evaluate(() => {
        let products =  document.querySelectorAll('.s-result-list .s-result-item');
        const data = [];
        products.forEach((el) => {
            let obj = {};
            let linkElement = el.querySelector('div > h2 > a');
            try {
                if (linkElement) {
                    obj.url = linkElement.getAttribute('href');
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
