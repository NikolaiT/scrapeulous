/**
 * Reverse image search on Bing. Goes to the similar images
 * and scrapes all image metadata such as `imgurl` and `imgrefurl`.
 *
 * @param item: key to stored image in s3
 * @param options: Holds all configuration data and options
 */
class Render extends BrowserWorker {

  /**
   * uploadFile() is broken in 2.1.0 and 2.1.1
   * Solution: https://github.com/puppeteer/puppeteer/issues/5420
   *
   * @param selector: the file input selector
   * @param file_path: an absolute path to the local file to be uploaded
   * @returns {Promise<void>}
   */
  async upload_file(selector, file_path) {
    const uploadInput = await this.page.$(selector);
    await uploadInput.uploadFile(file_path);
    await this.page.evaluate((inputSelector) => {
      document.querySelector(inputSelector).dispatchEvent(new Event('change', { bubbles: true }));
    }, selector);
  }

  async crawl(key) {
    let results = {};

    let image_path = await this.getKey({
      key: key,
      bucket: 'crawling-tests',
      region: 'us-east-2'
    });

    await this.page.goto('https://www.bing.com/images?', { waitUntil: 'networkidle0' });
    await this.page.waitForSelector('#sbi_b');
    await this.page.click('#sbi_b');
    await this.page.waitForSelector('#sb_fileinput');
    await this.page.waitFor(100);
    await this.upload_file('#sb_fileinput', image_path);

    await this.page.waitForNavigation();
    await this.page.waitForSelector('#i_results');
    await this.page.waitFor(250);

    let image_data = await this.page.evaluate(() => {
      function get_imgurl(url) {
          const regex = /mediaurl=(.*)/gm;
          let match = regex.exec(url);
          if (match !== null) {
              return decodeURIComponent(match[1]);
          }
      }
      
      let res = [];
      let candidates = document.querySelectorAll('#i_results div.richImage') || [];
      
      for (let i = 0; i < candidates.length; i++) {
        let c = candidates[i];
        let obj = {rank: i+1};
        
        try {
          let href = c.querySelector('.richImgLnk').getAttribute('href');
          obj.imgurl = get_imgurl(href);
          obj.imgtext = c.querySelector('.captionContainer').innerText;
          obj.imgrefurl = c.querySelector('.captionContainer a').getAttribute('href');
        } catch (e) {
          console.log(e.toString());
        }
        
        res.push(obj);
      }
      return res;
    });

    results[key] = image_data;
    return results;
  }
}
