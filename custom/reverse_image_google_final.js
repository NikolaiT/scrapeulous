/**
 * Reverse image search on Google.
 *
 * Algorithm:
 *
 * 1. Search images by url
 * 2. Extract all the imageref and metadata belonging to the image
 * 3. Implement clicking on each image and extract the imgrefurl
 * 4. Implement a dedicated crawler to visit each site and extract the image as http crawler
 *
 * @param url: url pointing to the image
 * @param options: Holds all configuration data and options
 * @param options.max_images_clicking: the maximum number of images to extract by clicking: default: 20
 * @param options.max_images: the maximum number of images to extract: default: 20
 * @param options.extract_data_image: if set to true, will get the dataimage if no imgurl if available. Default: true
 */
class ReverseImageGoogle extends BrowserWorker {
  async search_by_url(url) {
    await this.page.waitForSelector('[aria-label="Search by image"]');
    await this.page.click('[aria-label="Search by image"]');
    await this.page.waitFor(100);
    await this.page.waitForSelector('input[name="image_url"]');
    await this.page.type('input[name="image_url"]', url);
    await this.page.waitFor(100);
    await this.page.click('input[type="submit"]');
    await this.page.waitForNavigation();
    await this.page.waitForSelector('#rcnt');
    await this.page.waitFor(100);
  }

  async crawl(url) {
    if (!this.options.extract_data_image) {
      this.options.extract_data_image = true;
    }

    if (!this.options.max_images) {
      this.options.max_images = 20;
    }

    if (!this.options.max_images_clicking) {
      this.options.max_images_clicking = 20;
    }

    if (this.options.max_images < this.options.max_images_clicking) {
      this.options.max_images_clicking = this.options.max_images;
    }

    await this.page.goto('https://www.google.com/imghp?hl=en&tab=wi&ogbl', {waitUntil: 'networkidle2'});
    await this.page.waitForSelector('[aria-label="Search by image"]');
    await this.search_by_url(url);

    // click on the link to get similar pictures
    try {
      await this.page.click('g-section-with-header h3 > a');
    } catch (err) {
      return [];
    }

    await this.page.waitForNavigation();
    await this.page.waitForSelector('div[data-ri] a', {timeout: 15000});
    await this.page.waitFor(150);

    let metadata = await this.parse_metadata();
    let populated =  await this.getImgRefUrlByClicking(metadata);
    return populated.slice(0, this.options.max_images);
  }

  get_imgurl(url) {
    const regex = /imgurl=(.*?)&/gm;
    let match = regex.exec(url);
    if (match !== null) {
      return decodeURIComponent(match[1]);
    }
  }

  get_imgrefurl(url) {
    const regex = /imgrefurl=(.*?)&/gm;
    let match = regex.exec(url);
    if (match !== null) {
      return decodeURIComponent(match[1]);
    }
  }

  async getImgRefUrlByClicking(metadata) {
      let candidates = await this.page.$$('.rg_bx img') || [];
      if (!candidates.length) {
        candidates = await this.page.$$('div[data-ri] img');
      }
      for (let i = 0; i < metadata.length; i++) {
        if (i >= this.options.max_images_clicking) {
          break;
        }
        await candidates[i].click();
        await this.page.waitFor(50);
        const href = await this.page.evaluate(
          img => img.parentElement.parentElement.getAttribute('href'),
          candidates[i],
        );
        metadata[i].imgurl = this.get_imgurl(href);
        metadata[i].type = 'imgurl_by_clicking_on_image';
        let imgrefurlControl = this.get_imgrefurl(href);
        if (imgrefurlControl !== metadata[i].imgrefurl) {
          throw Error('critical error: inconsistency between imgrefurls!');
        }
      }
      return metadata;
  }

  async parse_metadata() {
    let options = this.options;
    return await this.page.evaluate((options) => {
      function get_imgurl(url) {
        const regex = /imgurl=(.*?)&/gm;
        let match = regex.exec(url);
        if (match !== null) {
          return decodeURIComponent(match[1]);
        }
      }
      function get_imgrefurl(url) {
        const regex = /imgrefurl=(.*?)&/gm;
        let match = regex.exec(url);
        if (match !== null) {
          return decodeURIComponent(match[1]);
        }
      }
      let res = [];
      let candidates = document.querySelectorAll('.rg_bx') || [];
      if (!candidates.length) {
        candidates = document.querySelectorAll('div[data-ri]');
      }

      for (let i = 0; i < candidates.length; i++) {
        let c = candidates[i];
        let obj = {rank: i, type: ''};
        try {
          let image_node = c.querySelector('a');

          if (image_node) {
            let href = image_node.getAttribute('href');
            if (href) {
              obj.imgurl = get_imgurl(href);
              obj.imgrefurl = get_imgrefurl(href);
              obj.imgtext = image_node.parentNode.innerText;
              obj.type = 'normal';
            }
          }

          if (!obj.imgurl || !obj.imgrefurl) {
            // extract the data image
            let img_node = c.querySelector('img');
            if (img_node) {
              try {
                obj.imgurl = img_node.getAttribute('data-iurl');
                obj.type = 'data-iurl';
              } catch (e) {}
            }

            let second_a = c.querySelector('a:nth-child(2)');
            if (second_a) {
              try {
                obj.imgrefurl = second_a.getAttribute('href');
                if (obj.imgrefurl === '#') {
                  obj.imgrefurl = null;
                }
                obj.imgtext = second_a.innerText;
              } catch (e) {}
            }
          }

          if (!obj.imgurl) {
            if (options.extract_data_image) {
              let img_node = c.querySelector('a img');
              obj.imgurl = img_node.getAttribute('src');
              obj.type = 'dataimage';
            }
          }
          res.push(obj);
        } catch (e) {}
      }
      return res;
    }, options);
  }
}
