class Get extends HttpWorker {
  async crawl(url) {
    let result = await this.Got(encodeURI('https://ipinfo.io/json'));
    let ipdata = JSON.parse(result.body);
    return ipdata.ip;
  }
}
