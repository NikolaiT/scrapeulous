/**
 * Get the IP address.
 *
 * @param item: dummy item, not used
 * @param options: Holds all configuration data and options
 */
async function Worker(item, options) {
    const results = {};

    // could also use https://ipleak.net/json/
    await page.goto('https://ipinfo.io/json', {
        waitUntil: 'networkidle0',
    });

    results.ipdata = await page.evaluate(() => {
        return JSON.parse(document.querySelector('pre').innerText);
    });
    
    return results;
}
