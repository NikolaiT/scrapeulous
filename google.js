/**
 * Searches on Google and extracts url and titles from the SERP.
 *
 * @param keyword: The keyword that is requested on Google
 * @param options: Holds all configuration data and options
 */
class GoogleSearch extends BrowserWorker {
  async crawl(keyword) {
    let results = {};
    let page = 1;
    let selector = '[name="q"]';
    await this.page.goto('https://www.google.com/webhp?num=100');
    await this.page.waitForSelector('#main');
    const input = await this.page.$('input[name="q"]');
    await this.page.evaluate((value, selector) => {
      document.querySelector(selector).value = value;
    }, keyword, selector);
    await input.focus();
    await this.page.keyboard.press("Enter");
    await this.page.waitForSelector('.g .r');

    while (true) {
      let next_page_link = await this.page.$('#pnnext', {timeout: 1000});

      results[page] = await this.page.evaluate(() => {
        let res =  document.querySelectorAll('.g .r a');
        const data = [];
        res.forEach((linkElement) => {
          let obj = {};
          try {
            if (linkElement) {
              obj.url = linkElement.getAttribute('href');
              obj.title = linkElement.innerText;
              if (obj.title) {
                data.push(obj);
              }
            }
          } catch (e) {
          }
        });
        return data;
      });

      if (next_page_link) {
        await next_page_link.click();
        await this.page.waitForNavigation();
        await this.page.waitForSelector('.g .r');
        page++;
      } else {
        break;
      }
    }

    return results;
  }
}
