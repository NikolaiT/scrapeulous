/**
 * Reverse image search on Bing.
 *
 * @param item: key to stored image in s3
 * @param options: Holds all configuration data and options
 */
class Render extends BrowserWorker {
  async crawl(key) {
    let results = {};

    let image_path = await this.getKey(key, {"bucket": 'nikolai-scraper-east', "region": 'us-east-2'});

    console.log(image_path);

    await this.page.goto('https://www.google.com/imghp?hl=en&tab=wi&ogbl', { waitUntil: 'networkidle2' });
    
    await this.page.waitForSelector('[aria-label="Search by image"]');
    
    await this.page.click('[aria-label="Search by image"]');
    
    await this.page.waitFor(500);
    
    await this.page.click('#qbug a');
    await this.page.waitForSelector('#qbfile');
    
    const input = await this.page.$('input#qbfile');
    await input.uploadFile(image_path);
    
    await this.page.waitForNavigation();
    await this.page.waitForSelector('#rcnt');
    await this.page.waitFor(350);
    
    // click on the link to get similar pictures
    try {
      await this.page.click('g-section-with-header h3 > a');
    } catch (err) {
      return results;
    }
    
    await this.page.waitForNavigation();
    await this.page.waitForSelector('#center_col');
    await this.page.waitFor(250);
          
    var image_data = await this.page.evaluate(() => {
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
      
      if (candidates.length <= 0) {
        candidates = document.querySelectorAll('div[data-ri]');
      }
      
      console.log(candidates.length);
      
      for (let i = 0; i < candidates.length; i++) {
        let c = candidates[i];
        let obj = {rank: i+1};
        try {
          let image_node = c.querySelector('a');
          if (image_node) {
            let href = image_node.getAttribute('href');
            obj.imgurl = get_imgurl(href);
            obj.imgrefurl = get_imgrefurl(href);
            obj.imgtext = image_node.parentNode.innerText;
          }
          
          if (obj.imgurl || obj.imgrefurl) {
            res.push(obj);
          }

        } catch (e) {
          console.log(e.toString());
        }
      }
      return res;
    });

    results[key] = image_data;
    return results;
  }
}
