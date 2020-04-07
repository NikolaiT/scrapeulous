class Timeout extends BrowserWorker {
  async crawl(timeout) {
    await this.page.waitFor(timeout);
  }
}