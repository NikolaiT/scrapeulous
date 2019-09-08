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
 * @param axios: A axios http library object
 * @param options: Holds all configuration data and options
 * @param options.chunk: The chunk that this Worker was assigned
 */
async function Worker(url, axios, options) {
    var result = null;
    await axios.get(url)
        .then(function (response) {
            result = response.data;
        });
    return result;
}
