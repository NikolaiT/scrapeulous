/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified Feb 2020
 * @website: incolumitas.com
 *
 * Navigates to a url and stores the base64 encoded screenshot.
 *
 * @param.screenshot_options: object, all the screenshot options
 */
class Screenshot extends BrowserWorker {
  async crawl(url) {

    await this.page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 40000,
    });

    let options = {
      type: 'png',
      fullPage: false,
      encoding: 'base64'
    };

    if (this.options && this.options.screenshot_options) {
      options = this.options.screenshot_options;
    }

    return await this.page.screenshot(options);
  }
}