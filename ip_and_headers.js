/**
 * Get the IP address and Http headers of the current browsers.
 *
 * Good for debugging reasons.
 *
 * @param item: dummy item, not used
 * @param options: Holds all configuration data and options
 */
async function Worker(item, options) {
    const results = {};

    await page.goto('https://ipinfo.io/json', {
        waitLoad: true,
        waitNetworkIdle: true
    });

    await page.waitFor(500);

    results.ipdata = await page.evaluate(() => {
        return JSON.parse(document.querySelector('pre').innerText);
    });

    await page.goto('https://httpbin.org/get', {
        waitLoad: true,
        waitNetworkIdle: true
    });

    await page.waitFor(500);

    results.headers = await page.evaluate(() => {
        return JSON.parse(document.querySelector('pre').innerText);
    });

    return results;
}