/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified Feb 2020
 * @website: incolumitas.com
 *
 * Navigates to a url and generates a pdf from the site.
 *
 *  https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#pagepdfoptions
 *
 * @param.pdf_options: object, all the pdf options
 */
class Pdf extends BrowserWorker {
  async crawl(url) {

    await this.page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 40000,
    });

    let options = {
      format: 'A4',
      printBackground: true,
    };

    if (this.options && this.options.pdf_options) {
      options = this.options.pdf_options;
    }

    let pdf = await this.page.pdf(options);

    return Buffer.from(pdf).toString('base64')
  }
}