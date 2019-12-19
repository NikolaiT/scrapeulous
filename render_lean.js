class RenderProxyLean extends BrowserWorker {

  async crawl(url) {
    await this.get_proxy(
      {
        filter: { whitelisted: true, rotating: false }, // only proxies that are whitelisted
        change: 8, // change proxy on failure or every nth item
      });

    await this.page.goto(url, {
      waitUntil: 'networkidle2', // wait until there are maximally 2 connections left
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
