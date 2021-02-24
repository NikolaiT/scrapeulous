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
class Amazon {
  async crawl(keyword) {
    let amazon_domain = this.options.amazon_domain || 'www.amazon.com';
    keyword = encodeURIComponent(keyword);
    await this.page.goto(`https://${amazon_domain}/s?k=${keyword}&ref=nb_sb_noss`, {waitUntil: 'domcontentloaded'});
    await this.page.waitForSelector('.s-result-list .s-result-item');

    // parse product information
    let results = await this.page.evaluate(() => {
      let products = document.querySelectorAll('.s-result-list .s-result-item');
      const data = {
        results: []
      };
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

          let info_rows = el.querySelectorAll('.a-section');
          info_rows.forEach((row) => {
            if (!obj.product_info) {
              obj.product_info = [];
            }
            let info = row.innerText.trim();
            if (info) {
              obj.product_info.push(info);
            }
          });

          let prime_el = el.querySelector('.a-icon-prime');
          if (prime_el) {
            obj.prime_delivery = true;
          } else {
            obj.prime_delivery = false;
          }

          let left_in_stock_el = el.querySelector('.a-color-price');
          if (left_in_stock_el) {
            obj.stock = left_in_stock_el.innerText.trim();
          }

          obj.price = el.querySelector('.a-price span').innerText;
          try {
            obj.stars = el.querySelector('.a-size-small [aria-label]:nth-child(1)').innerText.trim();
            obj.num_ratings = el.querySelector('.a-size-small [aria-label]:nth-child(2)').innerText.trim();
          } catch (err) {
          }
          data.results.push(obj);
        } catch (e) {
          console.log(e);
        }
      });
      return data;
    });
    results.html = await this.page.content();
    return results;
  }
}
