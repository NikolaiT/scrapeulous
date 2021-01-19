/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified Feb 2020
 * @website: incolumitas.com
 *
 * Searches on Google and extracts search results from the SERP.
 *
 * Searches exactly one keyword on N pages.
 *
 * Supported options:
 *
 * @param options.num_pages: integer, the number of pages to crawl for all keywords
 * @param options.google_domain: string, the google domain to use
 * @param options.google_params: object, the google query arg parameters
 *
 * For example:
 *
 * "google_params": {
 *   "gl": "us",
 *   "hl": "en",
 *   "start": 0,
 *   "num": 100
 * }
 *
 * @param keyword: The keyword that is requested on Google
 * @param this.options: Holds all configuration data and options for the Google Scraper
 */
class GoogleScraper extends BrowserWorker {
  async crawl(keyword) {
    let num_pages = 1;
    if (this.options && this.options.num_pages) {
      num_pages = this.options.num_pages;
    }

    let results = [];
	let upnum_results='';
	
    for (let page_num = 1; page_num <= num_pages; page_num++) {
      if (page_num === 1) {
        await this.load_start_page();
        await this.search_keyword(keyword);
      }
      await this.wait_for_results();
      let parsed = await this.parse(keyword);
      parsed.page_num = page_num;
	  if (parsed.num_results === upnum_results) {
		  break;
	  }
	  upnum_results = parsed.num_results
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
        right_info: {},
        results: [],
        top_products: [],
        right_products: [],
        top_ads: [],
        bottom_ads: [],
        places: [],
      };

      try {
        let num_results_el = document.getElementById('extabar').querySelector('nobr').parentNode;
        if (num_results_el) {
          results.num_results = num_results_el.innerText;
        }
      } catch (err) {
        let num_results_el = document.getElementById('extabar');
        if (num_results_el) {
          results.num_results = num_results_el.innerText;
        }
      }

      let organic_results = document.querySelectorAll('#center_col .g');

      organic_results.forEach((el, index) => {

        let serp_obj = {
          rank: index + 1,
          link: _attr(el, '.r a', 'href'),
          title: _text(el, '.r a h3'),
          snippet: _text(el, 'span.st'),
          visible_link: _text(el, '.r cite'),
          date: _text(el, 'span.f'),
        };

        if (serp_obj.date) {
          serp_obj.date = serp_obj.date.replace(' - ', '');
        }

        results.results.push(serp_obj);
      });

      // check if no results
      results.no_results = (results.results.length === 0);

      let parseAds = (container, selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          let ad_obj = {
            visible_link: _text(el, '.ads-visurl cite'),
            tracking_link: _attr(el, 'a:first-child', 'href'),
            link: _attr(el, 'a:nth-child(2)', 'href'),
            title: _text(el, 'a h3'),
            snippet: _text(el, '.ads-creative'),
            links: [],
          };
          el.querySelectorAll('ul li a').forEach((node) => {
            ad_obj.links.push({
              tracking_link: node.getAttribute('data-arwt'),
              link: node.getAttribute('href'),
              title: node.innerText,
            })
          });
          container.push(ad_obj);
        });
      };

      parseAds(results.top_ads, '#tads .ads-ad');
      parseAds(results.bottom_ads, '#tadsb .ads-ad');

      // parse google places
      document.querySelectorAll('.rllt__link').forEach((el) => {
        results.places.push({
          heading: _text(el, '[role="heading"] span'),
          rating: _text(el, '.rllt__details div:first-child'),
          contact: _text(el, '.rllt__details div:nth-child(2)'),
          hours: _text(el, '.rllt__details div:nth-child(3)'),
        })
      });

      // parse right side product information
      results.right_info.review = _attr(document, '#rhs .cu-container g-review-stars span', 'aria-label');

      let title_el = document.querySelector('#rhs .cu-container g-review-stars');
      if (title_el) {
        results.right_info.review.title = title_el.parentNode.querySelector('div:first-child').innerText;
      }

      let num_reviews_el = document.querySelector('#rhs .cu-container g-review-stars');
      if (num_reviews_el) {
        results.right_info.num_reviews = num_reviews_el.parentNode.querySelector('div:nth-of-type(2)').innerText;
      }

      results.right_info.vendors = [];
      results.right_info.info = _text(document, '#rhs_block > div > div > div > div:nth-child(5) > div > div');

      document.querySelectorAll('#rhs .cu-container .rhsvw > div > div:nth-child(4) > div > div:nth-child(3) > div').forEach((el) => {
        results.right_info.vendors.push({
          price: _text(el, 'span:nth-of-type(1)'),
          merchant_name: _text(el, 'span:nth-child(3) a:nth-child(2)'),
          merchant_ad_link: _attr(el, 'span:nth-child(3) a:first-child', 'href'),
          merchant_link: _attr(el, 'span:nth-child(3) a:nth-child(2)', 'href'),
          source_name: _text(el, 'span:nth-child(4) a'),
          source_link: _attr(el, 'span:nth-child(4) a', 'href'),
          info: _text(el, 'div span'),
          shipping: _text(el, 'span:last-child > span'),
        })
      });

      if (!results.right_info.title) {
        results.right_info = {};
      }

      let right_side_info_el = document.getElementById('rhs');

      if (right_side_info_el) {
        let right_side_info_text = right_side_info_el.innerText;

        if (right_side_info_text && right_side_info_text.length > 0) {
          results.right_side_info_text = right_side_info_text;
        }
      }

      // parse top main column product information
      // #tvcap .pla-unit
      document.querySelectorAll('#tvcap .pla-unit').forEach((el) => {
        let top_product = {
          tracking_link: _attr(el, '.pla-unit-title a:first-child', 'href'),
          link: _attr(el, '.pla-unit-title a:nth-child(2)', 'href'),
          title: _text(el, '.pla-unit-title a:nth-child(2) span'),
          price: _text(el, '.pla-unit-title + div'),
          shipping: _text(el, '.pla-extensions-container div:nth-of-type(1)'),
          vendor_link: _attr(el,'.pla-extensions-container div > a', 'href'),
        };

        let merchant_node = el.querySelector('.pla-unit-title');
        if (merchant_node) {
          let node = merchant_node.parentNode.querySelector('div > span');
          if (node) {
            top_product.merchant_name = node.innerText;
          }
        }

        results.top_products.push(top_product);
      });

      // parse top right product information
      // #tvcap .pla-unit
      document.querySelectorAll('#rhs_block .pla-unit').forEach((el) => {
        let right_product = {
          tracking_link: _attr(el, '.pla-unit-title a:first-child', 'href'),
          link: _attr(el, '.pla-unit-title a:nth-child(2)', 'href'),
          title: _text(el, '.pla-unit-title a:nth-child(2) span:first-child'),
          price: _text(el,'.pla-unit-title + div'),
          shipping: _text(el,'.pla-extensions-container > div'),
          vendor_link: _text(el,'.pla-extensions-container div > a'),
          vendor_name: _text(el,'.pla-extensions-container div > a > div'),
        };

        let merchant_node = el.querySelector('.pla-unit-title');
        if (merchant_node) {
          let node = merchant_node.parentNode.querySelector('div > span:first-child');
          if (node) {
            right_product.merchant_name = node.innerText;
          }
        }

        results.right_products.push(right_product);
      });

      let effective_query_el = document.getElementById('fprsl');

      if (effective_query_el) {

        results.effective_query = effective_query_el.innerText;
        if (!results.effective_query) {
          let effective_query_el2 = document.querySelector('#fprs a');
          if (effective_query_el2) {
            results.effective_query = document.querySelector('#fprs a').innerText;
          }
        }
      }

      return results;
    });

    // clean some results
    results.top_products = this.clean_results(results.top_products, ['title', 'link']);
    results.right_products = this.clean_results(results.right_products, ['title', 'link']);
    results.results = this.clean_results(results.results, ['title', 'link' , 'snippet']);
    results.time = (new Date()).toUTCString();

    return results;
  }

  async load_start_page() {
    let startUrl = 'https://www.google.com';

    if (this.options && this.options.google_domain) {
      startUrl = `https://www.${this.options.google_domain}/search?`;
    } else {
      startUrl = `https://www.google.com/search?`;
    }

    if (this.options && this.options.google_params) {
      for (let key in this.options.google_params) {
        startUrl += `${key}=${this.options.google_params[key]}&`
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
    let next_page_link = await this.page.$('#pnnext');
    if (next_page_link) {
      await next_page_link.click();
    }
  }

  async wait_for_results() {
    await this.page.waitForSelector('#center_col .g');
    await this.page.waitFor(100);
  }
}
