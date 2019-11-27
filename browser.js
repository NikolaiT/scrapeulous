class Render extends BrowserWorker {

  async crawl(url) {

    await this.page.goto(url, {
      waitUntil: 'networkidle2', // two open connections is okay
      timeout: 25000, // don't wait forever, it's better to return an error
    });

    return await this.page.content();

  }

}