class Rp {
  async crawl(url) {
    await this.page.goto(url);

    await this.page.waitForSelector('#result', {visible: true});

    return await this.page.$eval('#result', el => el.textContent);
  }
}
