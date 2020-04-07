class FailUrl extends BrowserWorker {
  async crawl(url) {
    const bad_url = 'https://iwillprobablyfailpleasedontregister.com';
    await this.page.goto(bad_url, {
      waitUntil: 'networkidle2', // two open connections is okay
    });
  }
}