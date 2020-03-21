/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified March 2020
 * @website: incolumitas.com
 *
 * Load a url and get page metrics.
 */
class Render extends BrowserWorker {
  async crawl(url) {
    await this.page.goto(url);
    const metrics = await this.page.metrics();
    let contents = await this.page.content();
    const crypto = require('crypto');
    let hash = crypto.createHash('md5').update(contents).digest("hex");
    return {
      md5: hash,
      metrics: metrics
    }
  }
}
