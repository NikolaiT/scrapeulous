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
class Pdf {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    let options = {
      format: 'A4',
      printBackground: true,
    };

    if (this.options && this.options.pdf_options) {
      options = this.options.pdf_options;
    }

    let pdf = await this.page.pdf(options);

    return {
      pdf_base64: Buffer.from(pdf).toString('base64'),
      html: await this.page.content(),
    };
  }
}
