/**
 * Reverse image search on Bing via url.
 *
 * @param url: url to the image file to be reverse image searched
 * @param options: Holds all configuration data and options
 */
class Render extends BrowserWorker {
  async crawl(url) {
    this.clipboardy.writeSync(url);
    let results = {};
    await this.page.goto('https://www.bing.com/images?', { waitUntil: 'networkidle2' });
    await this.page.waitForSelector('#sbi_b');
    await this.page.click('#sbi_b');
    await this.page.waitFor(250);
    await this.page.click('#sb_pastepn');
    await this.page.waitFor(250);
    // paste clipboard contents
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyV');
    await this.page.keyboard.up('Control');

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
    results[url] = image_data;
    return results;
  }
}
