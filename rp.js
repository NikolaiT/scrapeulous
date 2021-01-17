class Rp {
  async crawl(url) {
    await this.page.goto(url);

    await this.page.waitFor(1000);

    const result = JSON.parse(await page.$eval('#result', el => el.textContent));
    
    return result;
  }
}
