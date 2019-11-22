/**
 * Makes a reverse image search on Google.
 *
 * @param item: url that points to an image.
 * @param options: Holds all configuration data and options
 */
async function Worker(url, options) {
    const results = {
      html: null,
    };

    try {
      await page.goto(url, {
        waitUntil: 'networkidle0', // zero open connections
        timeout: 20000, // don't wait forever, it's better to return an error
      });

      results.html = await page.content();
      results.status = 200;
    } catch (err) {
      results.error = err.toString();
      results.status = 400;
    }

    return results;
}
