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
 * @param url: The url that is requested with axios
 * @param options: Holds all configuration data and options
 */
async function Worker(url, options) {
    var result = null;
    await got(url)
        .then(function (response) {
            result = response.body;
        });
    return result;
}
