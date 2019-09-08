/**
 * Searches on Google and extracts url and titles from the SERP.
 *
 * @param keyword: The keyword that is requested on Google
 * @param options: Holds all configuration data and options
 */
async function Worker(keyword, options) {
    let selector = '[name="q"]';
    await page.goto('https://www.google.com/webhp?num=10');
    await page.waitForSelector('#main');

    const input = await page.$('input[name="q"]');
    await page.evaluate((value, selector) => {
        document.querySelector(selector).value = value;
    }, keyword, selector);
    await input.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('.g .r');
    await page.waitFor(500);

    return await page.evaluate(() => {
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
