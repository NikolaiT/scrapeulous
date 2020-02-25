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
class Nytimes extends BrowserWorker {
  async crawl(dummy) {
    await this.page.goto('https://www.nytimes.com/', {
      waitUntil: 'networkidle2',
      timeout: 40000,
    });

    await this.page.waitFor('#site-content');

    return await this.page.evaluate(() => {
      let res = [];
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
            res.push({
              headline: node.innerText,
              snippet: text.innerText,
              link: link.getAttribute('href'),
            })
          }
        }
      });

      return res;
    });
  }
}