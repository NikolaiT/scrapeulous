class Get extends HttpWorker {
  async crawl(dummy) {
    let result = await this.Got(encodeURI('https://ipinfo.io/json'));
    let ipdata = JSON.parse(result.body);
    return ipdata.ip;
  }
}
