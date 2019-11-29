class Owler extends BrowserWorker {

  async crawl(company_id) {
    this.page.on('request', request => {
      let modified_request = {};
      // Inject post data into current request
      if (request.url().endsWith('https://www.owler.com/iaApp/fetchCompanyProfileData.htm')) {
        let mod_post = {
          companyId: company_id,
          components: ['company_info', 'ceo', 'top_competitors', 'keystats', 'cp'],
          section: 'cp'
        };
        // https://stackoverflow.com/questions/53048414/making-a-post-request-using-puppeteer-with-json-payload
        modified_request.postData = JSON.stringify(mod_post);
      }

      // Override headers
      const headers = Object.assign({}, request.headers(), {
        'Origin': 'https://www.owler.com',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.0 Safari/537.36',
        'Cookie': cookie
      });
      //modified_request.headers = headers;

      if (modified_request.postData) {
        console.dir(modified_request, {depth: null, colors: true});
      }
      request.continue(modified_request);
    });

    let result = {};

    await this.page.on('response', async (response) => {
      if (response.url().endsWith('https://www.owler.com/iaApp/fetchCompanyProfileData.htm')) {
        result = await response.json();
      }
    });

    await this.page.goto('https://www.owler.com/company/google');
    await this.page.waitFor(5000);

    return result;
  }
}