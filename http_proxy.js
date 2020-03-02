class ProxyGet extends HttpWorker {
  async crawl(url) {
    await this.get_proxy(
      {
        filter: { whitelisted: true, rotating: false },
        change: 1, // change proxy on failure or every 1th item
      });

    // this.Got makes now proxyfied requests
    let response = await this.Got(url);
    return response.body;
  }
}