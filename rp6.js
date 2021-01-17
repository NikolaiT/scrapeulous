class Rp {
  async crawl(url) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await this.page.goto(url);

    await this.page.waitForSelector('#result', {visible: true});

    return JSON.parse(await this.page.$eval('#result', el => el.textContent));
  }
}
