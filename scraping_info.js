/**
 * Get all information that is of importance when scraping various websites.
 *
 * 1. public IP address
 * 2. http headers
 * 3. location as displayed by google
 * 4. bot detection: https://fingerprintjs.com/demo
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

    // google location
    // search "what is my location"
    await page.goto('https://www.google.com/search?q=what+is+my+location', {
        waitUntil: 'networkidle2',
    });
    await page.waitFor(500);

    results.google_location = await page.evaluate(() => {
        let obj = {
            location_map_serp: null,
            location_footer: null,
        };

        try {
            obj.location_map_serp = document.querySelector('.ibk').innerText;
        } catch (e) {
        }

        try {
            obj.location_footer = document.getElementById('swml').innerText;
        } catch (e) {
        }

        return obj;
    });

    // bot detection test
    // use this open source lib: https://github.com/Valve/fingerprintjs2
    await page.goto('https://fingerprintjs.com/demo', {
        waitUntil: 'networkidle0',
    });
    await page.waitFor(1000);

    // wait until the loading disappears
    try {

      await page.waitForFunction(
          '!document.querySelector("body").innerText.includes("LOADING...")'
      );

      results.fingerprintjs = await page.evaluate(() => {
          try {
              return document.getElementById('demo').querySelector('table').innerText;
          } catch (e) {
              return ':(';
          }
      });

    } catch (e) {

    }

    return results;
}
