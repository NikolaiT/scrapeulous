class Render extends BrowserWorker {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'networkidle0',
    });
    await this.page.waitFor(1000);
    return await this.page.evaluate(() => {
      return document.getElementById('fingerprint').innerText;
    })
  }
}