class RenderProxy extends BrowserWorker {
  async crawl(url) {
    await this.get_proxy(
      {
        filter: { whitelisted: true, rotating: false, provider: 'cosmoproxy' },
        change: 1, // change proxy on failure or every 1th item
      });

    await this.page.goto(url, {
      waitUntil: 'networkidle2', // wait until there are maximally 2 connections left
    });

    return await this.page.content();
  }
}
