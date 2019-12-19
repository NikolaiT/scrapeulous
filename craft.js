class Craft extends BrowserWorker {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'networkidle2', // wait until there are maximally 2 connections left
      timeout: 35000, // don't wait forever, it's better to fail than to consume too much resources
    });

    // there must be a better way
    await this.page.evaluate(() => {
      let styles = document.getElementsByTagName('style');
      for (let node of styles) {
        node.parentNode.removeChild(node);
      }

      let scripts = document.getElementsByTagName('script');
      for (let node of scripts) {
        node.parentNode.removeChild(node);
      }

      let noscripts = document.getElementsByTagName('noscript');
      for (let node of noscripts) {
        node.parentNode.removeChild(node);
      }
    });

    return await this.page.content();
  }
}