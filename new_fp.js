class RenderRaw {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'networkidle2', // two open connections is okay
    });

    await this.page.waitFor(1000);

    let fp = await this.page.evaluate(() => {
      return document.getElementById('fp').innerText;
    });

    return JSON.parse(fp);
  }
}
