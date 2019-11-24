/**
 * Reverse image search on Bing.
 *
 * @param item: key to stored image in s3
 * @param options: Holds all configuration data and options
 */
async function Worker(key, options) {
    let results = {};

    let image_path = await storage.storeFile(key);

    console.log(image_path);

    await page.goto('https://www.bing.com/images?', { waitUntil: 'networkidle2' });
      
    await page.waitForSelector('#sb_sbi');

    await page.click('#sb_sbi img');

    await page.waitFor(500);

    await page.waitForSelector('#sb_fileinput');

    const input = await page.$('input#sb_fileinput');
    await input.uploadFile(image_path);

    await page.waitForNavigation();
    await page.waitForSelector('#i_results');
    await page.waitFor(500);

    var image_data = await page.evaluate(() => {
      
      function get_imgurl(url) {
          const regex = /mediaurl=(.*?)/gm;
          let match = regex.exec(url);
          if (match !== null) {
              return decodeURIComponent(match[1]);
          }
      }
      
      let res = [];
      let candidates = document.querySelectorAll('div.richImage') || [];
      
      console.log(candidates.length);
      
      for (let c of candidates) {
        try {
          let href = c.querySelector('.richImgLnk').getAttribute('href');
          let text = c.querySelector('.captionContainer').innerText;
          let imgrefurl = c.querySelector('.captionContainer a').getAttribute('href');
          res.push({
            href: href,
            imgurl: get_imgurl(href),
            imgrefurl: imgrefurl,
            imgtext: text,
          });
        } catch (e) {
          console.log(e.toString());
        }
      }
      return res;
    });

    results[key] = image_data;
    return results;
}
