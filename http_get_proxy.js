/**
 *
 * The worker function contains your scraping/crawling logic.
 *
 * Each Worker() function is executed on a distributed unique machine
 * with dedicated CPU, memory and browser instance. A unique IP is not guaranteed, but it is the norm.
 *
 *
 * @param url: The url that is requested with axios
 * @param options: Holds all configuration data and options
 */
async function Worker(url, options) {
    var result = null;

    await request_promise({
        url: url,
        proxy: options.proxy,
    }).then(function(data){ result = data; }, function(err){ result = err; });

    return result;
}