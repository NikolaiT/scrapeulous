/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified March 2020
 * @website: incolumitas.com
 *
 * Returns the DER-encoded certificate of the url to be visited.
 *
 * Decode with a library such as:
 * https://www.npmjs.com/package/asn1js
 */
class Render extends BrowserWorker {
  async crawl(url) {
    let cert = null;
    this.page.on('response', async (res) => {
      if (res.securityDetails() != null) {
        let response_url = res.url();
        if (response_url === url || response_url.replace(/\//g, '') == url.replace(/\//g, '')) {
          cert = await this.page._client.send('Network.getCertificate', {origin: res.url()});
        }
      }
    });
    await this.page.goto(url);
    return cert;
  }
}


