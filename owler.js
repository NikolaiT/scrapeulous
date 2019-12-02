class Owler extends BrowserWorker {
  async crawl(company_id) {
    //await this.get_proxy({type: 'dedicated'});
    this.page.on('request', request => {
      let modified_request = {};
      // Inject post data into current request
      if (request.url().endsWith('https://www.owler.com/iaApp/fetchCompanyProfileData.htm')) {
        let mod_post = {
          companyId: company_id,
          components: ['company_info', 'ceo', 'top_competitors', 'keystats', 'cp'],
          section: 'cp'
        };
        modified_request.postData = JSON.stringify(mod_post);
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
    return result;
  }
}
