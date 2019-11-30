/**
 * Reverse image search on Bing.
 *
 * @param item: key to stored image in s3
 * @param options: Holds all configuration data and options
 */
class Render extends BrowserWorker {

  async crawl(key) {

    let results = {};

    let image_path = await this.getKey(key);

    console.log(image_path);

    await this.page.goto('https://www.bing.com/images?', { waitUntil: 'networkidle2' });
      
    await this.page.waitForSelector('#sb_sbi');

    await this.page.click('#sb_sbi img');

    await this.page.waitFor(500);

    await this.page.waitForSelector('#sb_fileinput');

    const input = await this.page.$('input#sb_fileinput');
    await input.uploadFile(image_path);

    await this.page.waitForNavigation();
    await this.page.waitForSelector('#i_results');
    await this.page.waitFor(500);

    var image_data = await this.page.evaluate(() => {
      
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
