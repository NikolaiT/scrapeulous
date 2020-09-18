/**
 * @author Nikolai Tschacher
 * @version 1.3
 * @last_modified Oct 2020
 * @website: incolumitas.com
 *
 * Searches on Google and extracts search results from the SERP.
 *
 * Searches exactly one keyword on N pages.
 *
 * Supported options:
 *
 * @param options.search_type: direct | main_domain_first | addressbar, How to conduct the google search.
      direct means that the full Google search Url is entered.
      main_domain_first means that we navigate first to the main google domain and then search manually
      addressbar means that we type the search query into the address bar. currently not supported
 * @param options.num_pages: integer, the number of pages to crawl for all keywords
 * @param options.google_domain: string, the google domain to use
 * @param options.google_params: object, the google query arg parameters
 * @param options.google_serp_url: string, the url to the google serp html page
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
    let search_type = this.options.search_type || 'direct';
    let num_pages = 1;
    if (this.options && this.options.num_pages) {
      num_pages = this.options.num_pages;
    }
    let results = [];
    for (let page_num = 1; page_num <= num_pages; page_num++) {
      if (page_num === 1) {
        if (search_type === 'direct') {
          await this.direct_search(keyword);
        } else {
          await this.load_start_page();
          await this.search_keyword(keyword);
        }
      }
      let success = await this.wait_for_results();
      if (!success) {
        let blocked_ip = await this.page.evaluate(() => {
          let text = document.body.innerText;
          let i = text.indexOf('IP address: ');
          let offset = i + 'IP address: '.length;
          return text.slice(offset, text.indexOf('Time:')).trim();
        });
        results.push({
          status: 'Failed',
          error: 'Google recaptcha shown',
          blocked_ip: blocked_ip,
          html: await this.page.content(),
        });
        return results;
      }

      let parsed = await this.parse(keyword);
      parsed.html = await this.page.content();
      parsed.search_parameters = {
        google_url: await this.page.url(),
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

  async parse_organic_results() {
    return await this.page.evaluate(() => {
      let organic_results = [];
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
      let organic_results_els = document.querySelectorAll('#center_col .g');
      if (organic_results_els) {
        organic_results_els.forEach((el, index) => {
          let serp_obj = {
            position: index + 1,
            title: _text(el, '.r a h3'),
            link: _attr(el, '.r a', 'href'),
            displayed_link: _text(el, '.r cite'),
            thumbnail: null,
          };

          // Todo: fix snippet parsing
          let snippet_el = el.querySelector('span.st');
          if (snippet_el) {
            let date_node = el.querySelector('span.st span.f');
            if (date_node) {
              serp_obj.date = date_node.innerText.replace(' - ', '');
              date_node.innerText = '';
            }
            serp_obj.snippet = snippet_el.innerText.trim();
          }

          // @TODO: parse thumbnail
          if (false) {
            serp_obj.thumbnail = '';
          }

          let page_links = el.querySelectorAll('a.fl');
          if (page_links) {
            page_links.forEach((el) => {
              let link = el.getAttribute('href');
              if (link) {
                link = link.trim();
                if (link.indexOf('related:') !== -1) {
                  serp_obj.related_pages_link = link;
                }
                if (link.indexOf('cache:') !== -1) {
                  serp_obj.cached_page_link = link;
                }
              }
            });
          }

          let sitelinks_el = el.querySelectorAll('.osl a.fl');
          if (sitelinks_el) {
            sitelinks_el.forEach((el) => {
              if (!serp_obj.sitelinks) {
                serp_obj.sitelinks = {};
              }
              if (!serp_obj.sitelinks.inline) {
                serp_obj.sitelinks.inline = [];
              }
              serp_obj.sitelinks.inline.push({
                link: el.getAttribute('href'),
                title: el.innerText,
              });
            });
          }
          organic_results.push(serp_obj);
        });
      }
      return organic_results;
    });
  }

  async parse_ads() {
    return await this.page.evaluate(() => {
      let ads = [];
      let add_position = 1;
      // parse ads
      let parseAds = (ads, selector, block_position) => {
        document.querySelectorAll(selector).forEach((el) => {
          let ad_obj = {
            position: add_position,
            block_position: block_position,
            tracking_link: el.querySelector('a').getAttribute('data-rw'),
            link: el.querySelector('a').getAttribute('href'),
            sitelinks: [],
          };
          // parse ad title
          try {
            ad_obj.title = el.querySelector('[role="heading"]').innerText;
          } catch (err) {
            ad_obj.title = `Error parsing ad title: ${err.message}`;
          }
          // parse ad displayed link
          try {
            ad_obj.displayed_link = el.querySelector('a').nextSibling.querySelector('span:nth-child(2)').textContent;
          } catch (err) {
            ad_obj.displayed_link = `Error parsing ad displayed_link: ${err.message}`;
          }
          // parse ad description
          try {
            ad_obj.description = el.querySelector('a').parentNode.nextSibling.innerText;
          } catch (err) {
            ad_obj.description = `Error parsing ad description: ${err.message}`;
          }

          el.querySelectorAll('[role="list"] a').forEach((node) => {
            ad_obj.sitelinks.push({
              tracking_link: node.getAttribute('data-arwt'),
              link: node.getAttribute('href'),
              title: node.innerText,
            })
          });
          ads.push(ad_obj);
          add_position++;
        });
      };

      parseAds(ads, '#tads li', 'top');
      parseAds(ads, '#tadsb li', 'bottom');

      return ads;
    });
  }

  async parse_shopping_results() {
    return await this.page.evaluate(() => {
      let shopping_results = {};
    });
  }

  async parse_local_map() {
    return await this.page.evaluate(() => {
      let local_map = {};
      // parsing the local map results
      // @Todo: decide whether to parse the full image
      let local_map_el = document.querySelector('.H93uF a');
      if (local_map_el) {
        local_map = {
          link: '',
          image: '',
          gps_coordinates: null,
        }
        // rllag=50731147,7107100,1622&
        let map_url = local_map_el.getAttribute('href');
        local_map.link = map_url;
        let image_el = local_map_el.querySelector('img');
        if (image_el) {
          // do we really want to serve the whole image
          local_map.image = image_el.getAttribute('src').slice(0, 50);
        }
        const urlParams = new URLSearchParams(map_url);
        let rllag = urlParams.get('rllag');
        let gps = rllag.split(',');

        function insert(str, index, value) {
          return str.substr(0, index) + value + str.substr(index);
        }

        if (gps.length === 3) {
          local_map.gps_coordinates = {
            latitude: parseFloat(insert(gps[0], 2, '.')),
            longitude: parseFloat(insert(gps[1], 2, '.')),
            altitude: parseFloat(gps[2]),
          }
        }
      }
      return local_map;
    });
  }

  async parse_local_results() {
    return await this.page.evaluate(() => {
      let local_results = {};
      let more_locations_link_el = document.querySelector('.cMjHbjVt9AZ__button');
      if (more_locations_link_el) {
        local_results = {
          more_locations_link: more_locations_link_el.getAttribute('href'),
          places: [],
        };
      }
      // parse google places
      let place_position = 0;
      document.querySelectorAll('.rllt__link').forEach((el) => {
        let place_url = el.getAttribute('href');
        const urlParams = new URLSearchParams(place_url);
        place_position++;
        let place = {
          position: place_position,
          place_id: el.getAttribute('data-cid'),
          thumbnail: el.querySelector('img').getAttribute('src'),
          // @todo: parsing gps_coordinates is a problem. I cannot find the gps coords in the serp
          // maybe encoded in data-ved="2ahUKEwjv3O3JyuPrAhUHKKwKHbpvC5wQvS4wAHoECAwQLg"
          gps_coordinates: null,
        };

        let lsig = urlParams.get('lsig');
        if (lsig) {
          place.lsig = lsig;
        }

        let title_el = el.querySelector('[role="heading"] span');
        if (title_el) {
          place.title = title_el.innerText.trim();
        }

        let first_row_el = el.querySelector('.rllt__details div:first-child');
        if (first_row_el) {
          let rating_el = first_row_el.querySelector('span:first-child');
          if (rating_el) {
            place.rating = rating_el.innerText.trim();
            place.rating = parseFloat(place.rating.replace(',', '.'));
          }
          let reviews_el = first_row_el.querySelector('span:nth-child(3)');
          if (reviews_el) {
            place.reviews = reviews_el.innerText.replace('(', '').replace(')', '');
            place.reviews = parseInt(place.reviews);
          }
          place.type = first_row_el.innerText.split(' · ').slice(-1).pop();
        }

        let second_row_el = el.querySelector('.rllt__details div:nth-child(2)');
        if (second_row_el) {
          let parts = second_row_el.innerText.trim().split(' · ');
          if (parts.length === 1) {
            place.address = parts.pop();
          } else {
            place.phone = parts.pop();
            place.address = parts.pop();
          }
        }

        let desc_el = el.querySelector('.rllt__wrapped.RGCvMc')
        if (desc_el) {
          place.description = desc_el.innerText.trim();
        }

        let hours_el = el.querySelector('.rllt__details div:nth-child(3)');
        if (hours_el) {
          let hours = hours_el.innerText.trim();
          if (hours) {
            place.hours = hours;
          }
        }

        const positive = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwBAMAAAClLOS0AAAAIVBMVEUAAAAzplM0qFQ0qFM0qFM1qFM0qFQ1qlU0qFM0qFMwr1BfNzQuAAAAC3RSTlMAKGfn/2+PGK/XELDg06MAAABgSURBVHgB7cuxDUBQAEXRp6FnFSM8Ep0RFAZQGkTyZ7AlyWtvoZZ/+qMvql6sGVehwZM4eOZgb38L58GhuwqH28tBQa1dKEj7WyCkUEhJgJIAJQFKApQEKAlQEqAkqHoA3HYhBITCjCcAAAAASUVORK5CYII=';
        const negative = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAAOVBMVEUAAAD/AADYMCTbLiT/MwDZLyXZMCXZMCTYLyTYLiTZLyXYLiPYLyXYMCXZLyTZLyTZMCTZMCTZLyTtMV/0AAAAE3RSTlMABKtUBbT//LJOrkj5+/j+r7aoVQEegwAAAKFJREFUeAHtlDUSxDAQBIUjM/3/rwepqk2b2hP3MrgH6pUP0YFi8MynrBKBL8oJDRpJpXWV2iKpQ4N+kDS2FT9KGnp3bsE8WzDPFn9g7C/wiFTmpxbUhAOLA54aP/QHPIxWmgYc44GFhIvCijPzByHYwJ4StGmasGgeBLTVMDjDahiWz7DepgOynyg/gbJvseCoIr+Z40e2pnuvcvPu1fP0BdTsCq8gHj6QAAAAAElFTkSuQmCC';
        let service_options_els = el.querySelectorAll('.RGCvMc');
        if (service_options_els) {
          service_options_els.forEach((el) => {
            if (!place.service_options) {
              place.service_options = {};
            }
            let normalized = el.innerText.trim().replace(/\s/g, '_').toLowerCase();
            place.service_options[normalized] = el.querySelector('img').getAttribute('src') === positive;
          });
        }
        local_results.places.push(place);
      });
      return local_results;
    });
  }

  async parse_related_questions() {
    return await this.page.evaluate(() => {
      return {};
    });
  }

  async parse_related_search_boxes() {
    return await this.page.evaluate(() => {
      return [];
    });
  }

  async parse_related_searches() {
    return await this.page.evaluate(() => {
      let related_searches = [];
      // parse related seraches
      let related_el = document.getElementById('brs');
      if (related_el) {
        let related_links = related_el.querySelectorAll('.brs_col a');
        related_links.forEach((el, index) => {
          related_searches.push({
            query: el.innerText,
            link: el.getAttribute('href'),
          })
        });
      }
      return related_searches;
    });
  }

  async parse(keyword) {
    let results = await this.page.evaluate(() => {
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

            try {
              results.pagination.current = parseInt(document.querySelector('.YyVfkd').innerText);
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

      let right_side_info_el = document.getElementById('rhs');
      if (right_side_info_el) {
        let right_side_info_text = right_side_info_el.innerText;
        if (right_side_info_text && right_side_info_text.length > 0) {
          results.right_side_info_text = right_side_info_text;
        }
      }

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

    // parse all the components of the serp
    let organic_results = await this.parse_organic_results();
    if (organic_results) {
      results.organic_results = organic_results;
    }

    let ads = await this.parse_ads();
    if (ads) {
      results.ads = ads;
    }

    let shopping_results = await this.parse_shopping_results();
    if (shopping_results) {
      results.shopping_results = shopping_results;
    }

    let parse_local_map = await this.parse_local_map();
    if (parse_local_map) {
      results.local_map = parse_local_map;
    }

    let parse_local_results = await this.parse_local_results();
    if (parse_local_results) {
      results.local_results = parse_local_results;
    }

    let parse_related_questions = await this.parse_related_questions();
    if (parse_related_questions) {
      results.related_questions = parse_related_questions;
    }

    let parse_related_searches = await this.parse_related_searches();
    if (parse_related_searches) {
      results.related_searches = parse_related_searches;
    }

    let parse_related_search_boxes = await this.parse_related_search_boxes();
    if (parse_related_search_boxes) {
      results.related_search_boxes = parse_related_search_boxes;
    }

    // clean some serp results
    if (Array.isArray(results.ads)) {
      results.ads = this.clean_results(results.ads, ['title', 'link']);
    }
    if (Array.isArray(results.organic_results)) {
      results.organic_results = this.clean_results(results.organic_results, ['title', 'link' , 'snippet']);
    }

    return results;
  }

  async direct_search(keyword) {
    // first build the proper google search url
    let google_domain = this.options.google_domain || 'google.com';
    let url = `https://${google_domain}/search?q=${keyword}`;
    if (this.options && this.options.google_params) {
      for (let key in this.options.google_params) {
        url += `&${key}=${this.options.google_params[key]}`;
      }
    }

    if (this.options.google_serp_url) {
      url = this.options.google_serp_url;
    }

    //use google search url params to directly access the search results for our search query
    await this.page.goto(url, {waitUntil: 'domcontentloaded'});
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

    await this.page.goto(startUrl, {waitUntil: 'domcontentloaded'});
    await this.page.waitForSelector('input[name="q"]');
  }

  async set_input_value(selector, value) {
    await this.page.waitFor(selector);
    await this.page.evaluate((value, selector) => {
      return document.querySelector(selector).value = value;
    }, value, selector);
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
    // https://github.com/puppeteer/puppeteer/issues/709
    const raceSelectors = (page, selectors) => {
      return Promise.race(
        selectors.map(selector => {
          return page
            .waitForSelector(selector, {
              visible: true,
            })
            .then(() => selector);
        }),
      );
    };
    const selector = await raceSelectors(this.page, ['#center_col .g', '#recaptcha']);
    if (selector === '#center_col .g') {
      return true;
    } else {
      return false;
    }
  }
}
