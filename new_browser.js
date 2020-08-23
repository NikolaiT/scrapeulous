class BrowserNew {
  async crawl(url) {
    this.logger.info('Running BrowserNew');
    await this.page.goto(url, {
      waitUntil: 'networkidle2', // two open connections is okay
    });
    return await this.page.content();
  }
}
