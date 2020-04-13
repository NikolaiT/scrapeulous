class Sleep extends HttpWorker {
  async crawl(timeout) {
    await this.sleep(timeout);
    return timeout;
  }
}
