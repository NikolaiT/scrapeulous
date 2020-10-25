/**
 * Reverse image search on Google via url.
 *
 * @param item: url of the image to search
 * @param options: Holds all configuration data and options
 */
class ReverseImageGoogle {
  async crawl(url) {
    await this.page.goto('https://www.google.com/imghp?hl=en&tab=wi&ogbl', {waitUntil: 'domcontentloaded'});
    await this.page.waitForSelector('[aria-label="Search by image"]');
    await this.page.click('[aria-label="Search by image"]');
    await this.page.waitFor(50);
    await this.page.waitForSelector('input[name="image_url"]');
    await this.page.type('input[name="image_url"]', url);
    await this.page.waitFor(50);
    await this.page.click('input[value="Search by image"]');
    await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 });
    await this.page.waitForSelector('#rcnt');
    await this.page.waitFor(50);
    // click on the link to get similar pictures
    await this.page.click('title-with-lhs-icon > a', {timeout: 10000});

    await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 });
    await this.page.waitForSelector('div[data-ri] a');
    await this.page.waitFor(150);

    return await this.page.evaluate(() => {
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
       candidates = document.querySelectorAll('div.isv-r');
     }
     let counter = 0;

     for (let i = 0; i < candidates.length; i++) {
       let c = candidates[i];
       let obj = {rank: null, alt: false};
       try {
         let image_node = c.querySelector('a');
         if (image_node) {
           let href = image_node.getAttribute('href');
           if (href) {
             obj.imgurl = get_imgurl(href);
             obj.imgrefurl = get_imgrefurl(href);
             obj.imgtext = image_node.parentNode.innerText;
           }
         }

         if (!obj.imgurl || !obj.imgrefurl) {
           // try to get alternative results
           let img_node = c.querySelector('img');
           if (img_node) {
             try {
               obj.imgurl = img_node.getAttribute('data-iurl');
               obj.alt = true;
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

         if (obj.imgurl || obj.imgrefurl) {
           counter++;
           obj.rank = counter;
           res.push(obj);
         }
       } catch (e) {
         console.error(e);
       }
     }
     return res;
   });
  }
}
