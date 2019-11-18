/**
 * Searches on Google and extracts url and titles from the SERP.
 *
 * @param keyword: The keyword that is requested on Google
 * @param options: Holds all configuration data and options
 */
async function Worker(keyword, options) {
    await page.goto('https://scrapeulous.com');
    await page.waitFor('#not-existant-hopefully', {timeout: 2000});
}
