class Rp {
  async crawl(url) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await this.page.goto(url);

    await sleep(3000);

    return await this.page.content();
  }
}
