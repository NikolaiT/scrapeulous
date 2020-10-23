/**
 * Reverse image search on Bing via url.
 *
 * @param url: url to the image file to be reverse image searched
 * @param options: Holds all configuration data and options
 */
class ReverseImageBingUrl {
  async copy() {
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyC');
    await this.page.keyboard.up('Control');
  }

  async paste() {
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyV');
    await this.page.keyboard.up('Control');
  }

  async tripleClick() {
    await this.page.mouse.down({clickCount: 1});
    await this.page.mouse.down({clickCount: 2});
    await this.page.mouse.down({clickCount: 3});
  }

  async crawl(url) {
    await this.page.goto('https://www.bing.com/images?', { waitUntil: 'networkidle2' });

    await this.page.$eval('#sb_form_q', (el, value) => el.value = value, url);

    await this.page.click('#sb_form_q');
    await this.tripleClick();
    await this.copy();

    await this.page.waitForSelector('#sbi_b');
    await this.page.click('#sbi_b');
    await this.page.waitFor(100);
    await this.page.click('#sb_pastepn');
    await this.page.waitFor(100);
    // paste clipboard contents
    await this.paste();

    await this.page.waitForNavigation();
    await this.page.waitForSelector('#i_results');
    await this.page.waitFor(100);

    return await this.page.evaluate(() => {
      function get_imgurl(url) {
        const regex = /mediaurl=(.*)/gm;
        let match = regex.exec(url);
        if (match !== null) {
          return decodeURIComponent(match[1]);
        }
      }
      let res = [];
      let candidates = document.querySelectorAll('#i_results div.richImage');
      let rank = 0;
      candidates.forEach((el) => {
        let image_el = el.querySelector('.richImgLnk');
        if (image_el) {
          rank++;
          let obj = {
            rank: rank
          };
          let href = image_el.getAttribute('href');
          obj.imgurl = get_imgurl(href);

          let img_text_el = el.querySelector('.captionContainer');
          if (img_text_el) {
            obj.imgtext = img_text_el.innerText.trim();
          }

          let img_refurl_el = el.querySelector('.captionContainer a');
          if (img_refurl_el) {
            obj.imgrefurl = img_refurl_el.getAttribute('href');
          }

          res.push(obj);
        }
      });
      return res;
    });
  }
}
