class Get extends HttpWorker {
  async crawl(url) {
    await this.get_proxy(
      {
        filter: { whitelisted: true, rotating: false }, // only proxies that are whitelisted
        change: 10, // change proxy on failure or every nth item
      });

    let result = await this.Got(encodeURI(url));
    return this.clean_html({tags: ['script']}, result.body);
  }
}