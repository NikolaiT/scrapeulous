class Get extends HttpWorker {

  async crawl(url) {
    let result = {};

    let response = await this.Got(url);

    let headers = {};

    let interesting = ['Server', 'Via', 'Date'];

    for (let h of interesting) {
      if (response.headers[h]) {
        headers[h] = response.headers[h];
      }
      if (response.headers[h.toLowerCase()]) {
        headers[h] = response.headers[h.toLowerCase()];
      }
    }

    for (let header in response.headers) {
      if (header.toLowerCase().startsWith('x-')) {
        headers[header] = response.headers[header];
      }
    }

    result.headers = headers;

    // check if site uses google analytics
    result.using_analytics = response.body.indexOf("'UA-") !== -1;

    let $ = this.Cheerio.load(response.body);

    result.title = $('title').text();
    //result.meta = $('meta').toString();

    return result;
  }

}