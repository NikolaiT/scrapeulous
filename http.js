class Get extends HttpWorker {
  async crawl(url) {
    let result = await this.Got(url);
    return this.clean_html({tags: ['style', 'script']}, result.body);
  }
}