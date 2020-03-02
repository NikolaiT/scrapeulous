/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified Feb 2020
 * @website: incolumitas.com
 *
 * Searches on Bing and extracts search results from the SERP.
 *
 * Searches exactly one keyword on N pages.
 *
 * Supported options:
 *
 * @param options.num_pages: integer, the number of pages to crawl for all keywords
 * @param options.bing_domain: string, the bing domain to use
 * @param options.bing_params: object, the bing query arg parameters
 *
 * For example:
 *
 * "bing_params": {
 *   "offset": 0,
 *   "size": 20
 * }
 *
 * @param keyword: The keyword that is searched on Bing
 * @param this.options: Holds all configuration data and options for the Bing Scraper
 */
class BingScraper extends BrowserWorker {

  async crawl(keyword) {
    let num_pages = 1;
    if (this.options && this.options.num_pages) {
      num_pages = this.options.num_pages;
    }

    let results = [];

    for (let page_num = 1; page_num <= num_pages; page_num++) {
      if (page_num === 1) {
        await this.load_start_page();
        await this.search_keyword(keyword);
      }
      await this.wait_for_results();
      let parsed = await this.parse(keyword);
      parsed.page_num = page_num;
      results.push(parsed);
      await this.next_page();
    }

    return results;
  }

  async parse(keyword) {
    let results = await this.page.evaluate(() => {

      let _text = (el, s) => {
        let n = el.querySelector(s);

        if (n) {
          return n.innerText;
        } else {
          return '';
        }
      };

      let _attr = (el, s, attr) => {
        let n = el.querySelector(s);

        if (n) {
          return n.getAttribute(attr);
        } else {
          return null;
        }
      };

      let results = {
        num_results: '',
        no_results: false,
        effective_query: '',
        results: [],
        ads: [],
        right_side_ads: [],
      };

      let num_results_el = document.querySelector('#b_content .sb_count');

      if (num_results_el) {
        results.num_results = num_results_el.innerText;
      }

      let organic_results = document.querySelectorAll('#b_content #b_results .b_algo');

      organic_results.forEach((el, index) => {

        let serp_obj = {
          rank: index + 1,
          link: _attr(el, 'h2 a', 'href'),
          title: _text(el, 'h2'),
          snippet: _text(el, '.b_caption p'),
          visible_link: _text(el, 'cite'),
        };

        results.results.push(serp_obj);
      });

      // check if no results
      results.no_results = (results.results.length === 0);

      // parse bing ads
      let ads = document.querySelectorAll('#b_results .b_ad .sb_add');

      ads.forEach((el) => {

        let ad_obj = {
          title: _text(el, 'h2 a'),
          snippet: _text(el, '.b_caption p'),
          visible_link: _text(el, '.b_adurl cite'),
          tracking_link: _attr(el, 'h2 a', 'href'),
        };

        results.ads.push(ad_obj);
      });

      // right side ads
      let right_side_ads = document.querySelectorAll('#b_context .b_ad .sb_add');

      right_side_ads.forEach((el) => {

        let ad_obj = {
          title: _text(el, 'h2 a'),
          snippet: _text(el, '.b_caption p'),
          visible_link: _text(el, '.b_adurl cite'),
          tracking_link: _attr(el, 'h2 a', 'href'),
        };

        results.right_side_ads.push(ad_obj);
      });


      let effective_query_el = document.querySelector('#sp_requery a');

      if (effective_query_el) {
        results.effective_query = effective_query_el.innerText;
      }

      return results;
    });

    results.results = this.clean_results(results.results, ['title', 'link']);
    results.ads = this.clean_results(results.ads, ['title', 'visible_link', 'tracking_link']);
    results.time = (new Date()).toUTCString();

    return results;
  }

  async load_start_page() {
    let startUrl = 'https://www.bing.com/search?';

    if (this.options && this.options.bing_domain) {
      startUrl = `https://www.${this.options.bing_domain}/search?`;
    } else {
      startUrl = `https://www.bing.com/search?`;
    }

    if (this.options && this.options.bing_params) {
      for (let key in this.options.bing_params) {
        startUrl += `${key}=${this.options.bing_params[key]}&`
      }
    }

    this.logger.info('Using startUrl: ' + startUrl);

    await this.page.goto(startUrl);
    await this.page.waitForSelector('input[name="q"]');
  }

  async set_input_value(selector, value) {
    await this.page.waitFor(selector);
    await this.page.evaluate((value, selector) => {
      return document.querySelector(selector).value = value;
    }, value, selector);
  }

  /*
      Throw away all elements that do not have data in the
      specified attributes. Most be of value string.
   */
  clean_results(results, attributes) {
    let cleaned = [];
    for (let res of results) {
      let goodboy = true;
      for (let attr of attributes) {
        if (!res[attr] || !res[attr].trim()) {
          goodboy = false;
          break;
        }
      }
      if (goodboy) {
        cleaned.push(res);
      }
    }
    return cleaned;
  }

  async search_keyword(keyword) {
    const input = await this.page.$('input[name="q"]');
    await this.set_input_value(`input[name="q"]`, keyword);
    await this.sleep(50);
    await input.focus();
    await this.page.keyboard.press("Enter");
  }

  async next_page() {
    let next_page_link = await this.page.$('.sb_pagN');
    if (next_page_link) {
      await Promise.all([
        next_page_link.click(), // The promise resolves after navigation has finished
        this.page.waitForNavigation(), // Clicking the link will indirectly cause a navigation
      ]);
    }
  }

  async wait_for_results() {
    await this.page.waitForSelector('#b_content');
    await this.page.waitFor(100);
  }
}