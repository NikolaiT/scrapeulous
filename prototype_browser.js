/**
 *
 * The worker function contains your scraping/crawling logic.
 *
 * Each Worker() function is executed on a distributed unique machine
 * with dedicated CPU, memory and browser instance. A unique IP is not guaranteed,
 * but it is the norm.
 *
 * Scraping workers time out after 120 seconds. So the function
 * should return before this hard limit.
 *
 * Each Worker has a `page` param: A puppeteer like page object. See here:
 * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page
 *
 * @param item: The item that this Worker callback is responsible for
 * @param options: Holds all configuration data and options
 */
async function Worker(item, options) {
    // implement your crawling logic with `page`, a puppeteer handle
}
