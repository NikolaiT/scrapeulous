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
class Screenshot {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    let options = {
      type: 'png',
      fullPage: false,
      encoding: 'base64'
    };

    if (this.options && this.options.screenshot_options) {
      options = this.options.screenshot_options;
    }

    return {
      screen_base64: await this.page.screenshot(options),
      html: await this.page.content(),
    };
  }
}
