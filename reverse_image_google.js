/**
 * Reverse image search on Google.
 *
 * @param item: key to stored image in s3
 * @param options: Holds all configuration data and options
 */
async function Worker(key, options) {
    let results = {};

    let image_path = await storage.storeFile(key);

    console.log(image_path);

    await page.goto('https://www.google.de/imghp?hl=de&tab=wi&ogbl', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('[aria-label="Bildersuche"]');
    
    await page.click('[aria-label="Bildersuche"]');
    
    await page.waitFor(500);
    
    await page.click('#qbug a');
    await page.waitForSelector('#qbfile');
    
    const input = await page.$('input#qbfile');
    await input.uploadFile(image_path);
    
    await page.waitForNavigation();
    await page.waitForSelector('#rcnt');
    await page.waitFor(500);

    let content = await page.content();
    
    var data = await page.evaluate(() => {
        return document.getElementById('res').innerText;
    });
    
    // click on the link to get similar pictures
    await page.click('g-section-with-header h3 > a');
    await page.waitForNavigation();
    await page.waitForSelector('#main');
    await page.waitFor(500);
    
    var image_data = await page.evaluate(() => {
      
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
      let candidates = document.querySelectorAll('.rg_bx > a') || [];
      
      if (candidates.length <= 0) {
        candidates = document.querySelectorAll('[data-ri] > a');
      }
      
      console.log(candidates.length);
      
      for (let c of candidates) {
        try {
          let href = c.getAttribute('href');
          let imgurl = get_imgurl(href);
          let imgrefurl = get_imgrefurl(href);
          if (imgurl) {
            res.push({
              href: href,
              imgurl: imgurl,
              imgrefurl: imgrefurl,
              imgtext: c.parentNode.innerText,
            });
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
