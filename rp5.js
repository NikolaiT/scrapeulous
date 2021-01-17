class Rp {
  async crawl(url) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await sleep(500);

    await this.page.goto(url);

    await sleep(6000);

    return JSON.parse(await this.page.$eval('#result', el => el.textContent));
  }
}
