class Render extends BrowserWorker {
  async crawl(url) {
    await this.page.goto(url, {
      waitUntil: 'networkidle2', // two open connections is okay
    });

    return await this.clean_html({
      tags: ['script', 'style'],
      use_regex: false
    });
  }
}