/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified March 2020
 * @website: scrapeulous.com
 *
 * Searches a product on amazon and obtains product meta data
 * such as price and asin.
 *
 * Supported options:
 *
 * @param options.amazon_domain: string, the domain of Amazon
 * @param keyword: The keyword that is searched on Amazon
 */
class Amazon extends BrowserWorker {
  async crawl(keyword) {
    let amazon_domain = this.options.amazon_domain || 'www.amazon.com';
    await this.page.goto(`https://${amazon_domain}/`);
    await this.page.waitForSelector('#nav-search');
    await this.page.waitFor(200);

    const input = await this.page.$('input[name="field-keywords"]');
    await this.page.evaluate((value) => {
      document.querySelector('input[name="field-keywords"]').value = value;
    }, keyword);
    await input.focus();
    await this.page.keyboard.press("Enter");
    await this.page.waitForSelector('.s-result-list');
    await this.page.waitFor(500);

    // parse product information
    return await this.page.evaluate(() => {
      let products =  document.querySelectorAll('.s-result-list .s-result-item');
      const data = [];
      products.forEach((el) => {
        let obj = {
          asin:  el.getAttribute('data-asin'),
        };
        let linkElement = el.querySelector('div > h2 > a');
        try {
          if (linkElement) {
            obj.url = linkElement.getAttribute('href');
            obj.title = linkElement.querySelector('span').innerText;
          }
          obj.price = el.querySelector('.a-price span').innerText;
          try {
            obj.stars = el.querySelector('.a-size-small [aria-label]:nth-child(1)').innerText.trim();
            obj.num_ratings = el.querySelector('.a-size-small [aria-label]:nth-child(2)').innerText.trim();
          } catch (err) {
          }
          data.push(obj);
        } catch (e) {
        }
      });
      return data;
    });
  }
}