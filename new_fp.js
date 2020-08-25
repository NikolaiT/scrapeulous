class RenderRaw {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'networkidle2', // two open connections is okay
    });

    await this.page.waitFor(500);

    return await this.page.evaluate(() => {
      document.getElementById('fp').innerText
    });
  }
}
