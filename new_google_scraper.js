/**
 * @author Nikolai Tschacher
 * @version 1.1
 * @last_modified Aug 2020
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
class GoogleScraperNew {
  async crawl(keyword) {
    this.logger.info('Running GoogleScraperNew');

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
      parsed.html = await this.page.content();
      parsed.search_parameters = {
        engine: "google",
        q: keyword,
        location_requested: "-",
        location_used: "-",
        google_domain: "google.com",
        hl: "en",
        gl: "us",
        device: "desktop"
      };

      if (this.options && this.options.google_params) {
        for (let key in this.options.google_params) {
          parsed.search_parameters[key] = this.options.google_params[key];
        }
      }

      parsed.search_information.page_num = page_num;
      results.push(parsed);
      if (page_num < num_pages) {
        await this.next_page();
      }
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
        search_information: {
          organic_results_state: "Results for exact spelling",
          total_results: null,
          time_taken_displayed: null,
          query_displayed: null
        },
        search_parameters: null,
      };

      try {
        results.search_information.query_displayed = document.querySelector('input[name="q"]').value;
      } catch (err) {
      }

      let miniapps_element = document.querySelector('[data-async-type="miniapps"]');
      if (miniapps_element) {
        results.miniapps = miniapps_element.innerText;
      }

      // parse related seraches
      let related_el = document.getElementById('brs');
      if (related_el) {
        let related_links = related_el.querySelectorAll('.brs_col a');
        related_links.forEach((el, index) => {
          if (!results.related_searches) {
            results.related_searches = [];
          }
          results.related_searches.push({
            query: el.innerText,
            link: el.getAttribute('href'),
          })
        });
      }

      // parse pagination
      let pagination_el = document.getElementById('xjs');
      if (pagination_el) {
        let pagination = pagination_el.querySelectorAll('a.fl');
        pagination.forEach((el, index) => {
          if (!results.pagination) {
            results.pagination = {};
            results.pagination.other_pages = {};
            try {
              results.pagination.next = document.getElementById('pnnext').getAttribute('href');
            } catch (err) {}
          }
          results.pagination.other_pages[el.innerText] = el.getAttribute('href');
        });
      }

      try {
        let num_results_el = document.getElementById('result-stats');
        if (num_results_el) {
          let num_res_text = num_results_el.innerText;
          let match = num_res_text.match(/[\d,\.\s]{2,20}/g);
          if (match) {
            results.search_information.total_results = match[0].trim();
            results.search_information.time_taken_displayed = match[1].trim();
          }
        }
      } catch (err) {
      }

      let organic_results = document.querySelectorAll('#center_col .g');

      if (organic_results) {
        results.results = [];
        organic_results.forEach((el, index) => {
          let serp_obj = {
            position: index + 1,
            title: _text(el, '.r a h3'),
            link: _attr(el, '.r a', 'href'),
            snippet: _text(el, 'span.st'),
            displayed_link: _text(el, '.r cite'),
            thumbnail: null,
            date: _text(el, 'span.f'),
            cached_page_link: _attr(el, 'a.fl', 'href'),
            related_pages_link: null,
          };

          if (serp_obj.date) {
            serp_obj.date = serp_obj.date.replace(' - ', '');
          }

          results.results.push(serp_obj);
        });
      }

      let add_position = 1;
      let parseAds = (results, selector, block_position) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (!results.ads) {
            results.ads = [];
          }
          let ad_obj = {
            position: add_position,
            block_position: block_position,
            displayed_link: el.querySelector('a').getAttribute('href'),
            tracking_link: el.querySelector('a').getAttribute('data-rw'),
            link: el.querySelector('a').getAttribute('href'),
            title: el.querySelector('[role="heading"]').innerText,
            description: el.querySelector('a').parentNode.nextSibling.innerText,
            sitelinks: [],
          };
          el.querySelectorAll('[role="list"] a').forEach((node) => {
            ad_obj.links.push({
              tracking_link: node.getAttribute('data-arwt'),
              link: node.getAttribute('href'),
              title: node.innerText,
            })
          });
          results.ads.push(ad_obj);
          add_position++;
        });
      };

      parseAds(results, '#tads li', 'top');
      parseAds(results, '#tadsb li', 'bottom');

      // parse google places
      document.querySelectorAll('.rllt__link').forEach((el) => {
        if (!results.places) {
          results.places = [];
        }
        results.places.push({
          heading: _text(el, '[role="heading"] span'),
          rating: _text(el, '.rllt__details div:first-child'),
          contact: _text(el, '.rllt__details div:nth-child(2)'),
          hours: _text(el, '.rllt__details div:nth-child(3)'),
        })
      });

      // parse right side product information
      if (document.querySelector('#rhs .cu-container')) {
        results.right_info = {};
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
        if (!results.top_products) {
          results.top_products = [];
        }

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
        if (!results.right_products) {
          results.right_products = [];
        }

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
      let effective_query = '';
      if (effective_query_el) {
        effective_query = effective_query_el.innerText;
        if (!effective_query) {
          let effective_query_el2 = document.querySelector('#fprs a');
          if (effective_query_el2) {
            effective_query = document.querySelector('#fprs a').innerText;
          }
        }
      }
      if (effective_query) {
        results.search_information.query_displayed = effective_query;
        results.search_information.organic_results_state = "Results for spelling corrected query";
      }

      return results;
    });

    // clean some results
    if (Array.isArray(results.top_products)) {
      results.top_products = this.clean_results(results.top_products, ['title', 'link']);
    }
    if (Array.isArray(results.right_products)) {
      results.right_products = this.clean_results(results.right_products, ['title', 'link']);
    }
    if (Array.isArray(results.results)) {
      results.results = this.clean_results(results.results, ['title', 'link' , 'snippet']);
    }

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
    if (Array.isArray(results)) {
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
