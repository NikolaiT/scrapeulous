class RenderProxyLean extends BrowserWorker {
  async crawl(url) {
    await this.get_proxy(
      {
        filter: { whitelisted: true, rotating: false }, // only proxies that are whitelisted
        change: 8, // change proxy on failure or every nth item
      });

    await this.page.goto(url, {
      waitUntil: 'networkidle2', // wait until there are maximally 2 connections left
      timeout: 30000, // don't wait forever, it's better to fail than to consume too much resources
    });

    return await this.clean_html({
      tags: ['script', 'style']
    });
  }
}