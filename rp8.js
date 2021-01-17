class Rp {
  async crawl(url) {
    await this.page.goto(url);

    await this.page.waitFor(3000);

    let fpData = JSON.parse(await this.page.$eval('#fp', el => el.textContent));

    return {
      redPill: fpData.redPill,
      redPill3: fpData.redPill3,
    }
  }
}
