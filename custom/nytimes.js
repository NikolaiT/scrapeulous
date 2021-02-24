/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified Feb 2020
 * @website: incolumitas.com
 *
 * Navigates to https://www.nytimes.com/ and parses the headlines.
 *
 * This is just a simple example how a online news site can be crawled.
 *
 */
class Nytimes {
  async crawl(dummy) {
    await this.page.goto('https://www.nytimes.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    await this.page.waitFor('#site-content');

    let results = await this.page.evaluate(() => {
      let res = {
        news: [],
      };
      let nodes = document.querySelectorAll('h2 .balancedHeadline');

      nodes.forEach((node) => {
        function getNthParent(elem, n) {
          return n === 0 ? elem : getNthParent(elem.parentNode, n - 1);
        }

        if (node) {
          let headline = node.innerText;
          let parent = getNthParent(node, 4);
          let text = parent.querySelector('p');
          let link = parent.querySelector('a');
          if (text && link) {
            res.news.push({
              headline: node.innerText,
              snippet: text.innerText,
              link: link.getAttribute('href'),
            })
          }
        }
      });

      return res;
    });

    results.html = await this.page.content();
    return results;
  }
}
