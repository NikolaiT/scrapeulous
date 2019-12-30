class RenderProxy extends BrowserWorker {
  async crawl(url) {
    await this.get_proxy(
      {
        filter: { whitelisted: true, rotating: false, provider: 'cosmoproxy' },
        change: 1, // change proxy on failure or every 1th item
      });
      
    const referer = [
      'https://www.google.com/',
      'https://www.bing.com/',
      'https://www.yahoo.com/',
      'https://www.linkedin.com/',
      'https://www.duckduckgo.com/',
      'https://www.twitter.com/'
    ];
    const rand_referer = referer[Math.floor(Math.random() * referer.length)];
    await page.setExtraHTTPHeaders({ 'referer': rand_referer });

    await this.page.goto(url, {
      waitUntil: 'networkidle2', // wait until there are maximally 2 connections left
    });

    return await this.page.content();
  }
}
