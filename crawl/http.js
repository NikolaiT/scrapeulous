class Get {
  static crawler_type = 'http';

  async crawl(url) {
    let result = await this.Got(encodeURI(url));
    return result.body;
  }
}