class Render extends BrowserWorker {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'networkidle2', // two open connections is okay
    });

    return await this.page.content();
  }
}