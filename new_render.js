// https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagegotourl-options
// load - consider navigation to be finished when the load event is fired.
// domcontentloaded - consider navigation to be finished when the DOMContentLoaded event is fired.
// networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms.
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.

class RenderNew {
  async crawl(url) {
    let error = null;

    try {
      await this.page.goto(url, {
        waitUntil: this.options.wait_until || 'domcontentloaded',
      });
    } catch (err) {
      console.log(err.message);
      error = err
    }

    try {
      return await this.page.content();
    } catch (err) {
      console.log(err.message);
      // if we cannot get an partial answer
      // after the timeout, just throw the original
      // timeout error
      throw error;
    }
  }
}
