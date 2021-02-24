/**
 * @author Nikolai Tschacher
 * @version 1.4
 * @last_modified Oct 2020
 * @website: incolumitas.com
 *
 * Searches on Bing and extracts search results from the SERP.
 *
 * Searches exactly one keyword on N pages.
 *
 * Supported options:
 *
 * @param options.search_type: direct | main_domain_first | addressbar, How to conduct the Bing search.
      direct means that the full Bing search Url is entered.
      main_domain_first means that we navigate first to the main Bing domain and then search manually
      addressbar means that we type the search query into the address bar. currently not supported
 * @param options.bing_domain: string, the Bing domain to use
 * @param options.bing_params: object, the Bing query arg parameters
 * @param options.bing_serp_url: string, the url to the google serp html page
 * @param keyword: The keyword that is requested on Bing
 * @param this.options: Holds all configuration data and options for the Bing Scraper
 */
class BingScraperNew {
  async crawl(keyword) {
    this.logger.info('Running BingScraperNew');
    let search_type = this.options.search_type || 'direct';
    if (search_type === 'direct') {
      await this.direct_search(keyword);
    }
    let success = await this.wait_for_results();
    if (!success) {
      return{
        status: 'Failed',
        error: 'Bing search failed',
        html: await this.page.content(),
      };
    }

    let parsed = await this.parse(keyword);
    parsed.html = await this.page.content();
    parsed.search_parameters = {
      bing_url: await this.page.url(),
      engine: "bing",
      q: keyword,
      bing_domain: "bing.com",
      device: "desktop"
    };

    if (this.options && this.options.bing_params) {
      for (let key in this.options.bing_params) {
        parsed.search_parameters[key] = this.options.bing_params[key];
      }
    }

    return parsed;
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
      let organic_results_els = document.querySelectorAll('#b_results .b_algo');
      let position = 1;
      if (organic_results_els) {
        organic_results_els.forEach((el, index) => {
          let serp_obj = {
            "snippet": null
          };
          // parse title
          let title_el = el.querySelector('h2 > a');
          if (title_el) {
            serp_obj.title = title_el.innerText;
          }

          // parse link
          if (title_el) {
            serp_obj.link = title_el.getAttribute('href');
          }

          // parse displayed_link
          let displayed_link_el = el.querySelector('cite');
          if (displayed_link_el) {
            serp_obj.displayed_link = displayed_link_el.innerText;
          }

          // Todo: fix snippet parsing
          let snippet_el = el.querySelector('.b_caption p');
          if (snippet_el) {
            serp_obj.snippet = snippet_el.innerText.trim();
          }

          // parse the rich snippet
          let questions_el = el.querySelectorAll('.b_factrow.b_twofr li');
          if (questions_el) {
            questions_el.forEach((el) => {
              if (!serp_obj.rich_snippet) {
                serp_obj.rich_snippet = {
                  extensions: []
                };
              }
              serp_obj.rich_snippet.extensions.push(el.innerText);
            });
          }

          let sitelinks_el = el.querySelectorAll('.osl a.fl');
          if (sitelinks_el.length === 0) {
            sitelinks_el = el.querySelectorAll('.St3GK a');
          }
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

          // only ad the organic result if it includes
          // title, link and a snippet
          if (serp_obj.title && serp_obj.link) {
            serp_obj.position = (position++);
            organic_results.push(serp_obj);
          }
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
      document.querySelectorAll('.b_ad ul li').forEach((el) => {
        let block_position = 'top';
        if (el.parentNode.parentNode.classList.contains('b_adBottom')) {
          block_position = 'bottom';
        }

        let ad_obj = {
          position: add_position,
          block_position: block_position,
        };

        // parse ad title
        try {
          ad_obj.title = el.querySelector('.b_textAdTitleLink').innerText;
        } catch (err) {
          ad_obj.title = `Error parsing ad title: ${err.message}`;
        }
        // parse ad displayed link
        try {
          ad_obj.displayed_link = el.querySelector('.b_adurl cite').innerText;
        } catch (err) {
          ad_obj.displayed_link = `Error parsing ad displayed_link: ${err.message}`;
        }
        // parse ad description
        try {
          ad_obj.description = el.querySelector('.b_caption p').innerText;
        } catch (err) {
          ad_obj.description = `Error parsing ad description: ${err.message}`;
        }

        // parse extenions
        let extensions_el = el.querySelector('.MUxGbd.lyLwlc.aLF0Z');
        if (extensions_el) {
          if (!ad_obj.extensions) {
            ad_obj.extensions = [];
          }
          ad_obj.extensions.push(extensions_el.innerText.trim())
        }

        // parse address, phone
        let location_el = el.querySelector('.Qezod');
        if (location_el) {
          let text = location_el.innerText.trim();
          let parts = text.split(' - ');
          if (parts.length >= 2) {
            ad_obj.address = parts[0];
            ad_obj.phone = parts[1];
          }
        }

        // parse rating el
        let rating_el = el.querySelector('.Hk2yDb.KsR1A');
        if (rating_el) {
          let text = rating_el.getAttribute('aria-label');
          let rating = text.match(/\d[,\.]\d/g);
          if (rating) {
            ad_obj.rating = parseFloat(rating);
          }
        }

        let phone_el = el.querySelector('.EkiqXc.MUxGbd');
        if (phone_el) {
          ad_obj.phone = phone_el.textContent.trim();
        }

        // parse tracking_link
        try {
          ad_obj.tracking_link = el.querySelector('h2 > a').getAttribute('href');
        } catch (err) {
          ad_obj.tracking_link = `Error parsing ad tracking_link: ${err.message}`;
        }

        el.querySelectorAll('.b_ads1line a').forEach((link) => {
          if (!ad_obj.sitelinks) {
            ad_obj.sitelinks = {
              inline: []
            };
          }
          ad_obj.sitelinks.inline.push({
            tracking_link: link.getAttribute('href'),
            title: link.innerText.trim(),
          });
        });

        ads.push(ad_obj);
        add_position++;
      });

      return ads;
    });
  }

  async parse_shopping_results() {
    return await this.page.evaluate(() => {
      let shopping_results = [];
      let block_position = "right";
      // parse right side shopping results
      let right_side_shopping_els = document.querySelectorAll('.Yi78Pd .pla-unit');
      if (right_side_shopping_els.length === 0) {
        block_position = "top"
        right_side_shopping_els = document.querySelectorAll('.top-pla-group-inner .pla-unit');
      }

      if (right_side_shopping_els) {
        let position = 0;
        right_side_shopping_els.forEach((el) => {
          let shopping_res = {
            position: (++position),
            block_position: block_position,
          };
          let ad_source_link = el.querySelector('a.pla-unit-title-link');
          if (ad_source_link) {
            shopping_res.source_link = ad_source_link.getAttribute('href');
          }

          let source_el = el.querySelector('.LbUacb .rhsl5');
          if (!source_el) {
            source_el = el.querySelector('.LbUacb');
          }
          if (source_el) {
            shopping_res.source = source_el.innerText.trim();
          }

          // try to get rating
          rating_el = el.querySelector('g-review-stars span');
          if (rating_el) {
            let rating_attr = rating_el.getAttribute('aria-label');
            let rating_els = rating_attr.match(/(\d,\d)/g);
            if (rating_els) {
              let rating = rating_els.pop();
              rating = rating.replace(',', '.');
              shopping_res.rating = parseFloat(rating.trim());
            }
          }

          // try to get rating
          reviews_el = el.querySelector('span.fl');
          if (reviews_el) {
            let reviews = reviews_el.innerText.trim();
            reviews = reviews.replace('(', '').replace(')', '');
            reviews = parseInt(reviews.replace(',', ''));
            shopping_res.reviews = reviews;
          }

          let title_el = el.querySelector('span.rhsl5');
          if (title_el) {
            shopping_res.title = title_el.innerText.trim();
          }

          let price_el = el.querySelector('.T4OwTb');
          if (price_el) {
            shopping_res.price = price_el.innerText.trim();
            // TODO: extract it boyo
            let extracted_price = shopping_res.price.replace(',', '.');
            // better remove all alphabetic chars
            extracted_price = extracted_price.replace(/[^\d.-]/g, '');
            extracted_price = extracted_price.trim();
            shopping_res.extracted_price = parseFloat(extracted_price);
          }

          let special_offer_el = el.querySelectorAll('.kTZBme div');
          if (special_offer_el.length === 0) {
            special_offer_el = el.querySelectorAll('.pla-extensions-container');
          }
          special_offer_el.forEach((el) => {
            let text = el.innerText.trim();
            if (text) {
              if (!shopping_res.extensions) {
                shopping_res.extensions = new Set();
              }
              shopping_res.extensions.add(text);
            }
          });

          if (shopping_res.extensions) {
            shopping_res.extensions = [...shopping_res.extensions];
          }

          let link_el = el.querySelector('a:first-child');
          if (link_el) {
            shopping_res.link = link_el.getAttribute('href');
          }

          let shopping_link = el.querySelector('a.plantl.pla-unit-title-link');
          if (shopping_link) {
            shopping_res.vendor_link = shopping_link.getAttribute('href');
          }

          let img_el = el.querySelector('.Gor6zc img');
          if (img_el) {
            shopping_res.thumbnail = img_el.getAttribute('src');
          }

          if (shopping_res.price) {
            shopping_results.push(shopping_res);
          }
        });
      }


      return shopping_results;
    });
  }

  async parse_local_map() {
    return await this.page.evaluate(() => {
      let local_map = {};
      return local_map;
    });
  }

  async parse_local_results() {
    return await this.page.evaluate(() => {
      let local_results = {};
      let more_locations_link_el = document.querySelector('#lmSeeMore a');
      if (more_locations_link_el) {
        local_results.more_locations_link = more_locations_link_el.getAttribute('href');
      }
      // parse google places
      let place_position = 0;
      document.querySelectorAll('#ent-car-exp .item').forEach((el) => {
        if (!local_results.places) {
          local_results.places = [];
        }
        place_position++;
        let place = {
          position: place_position,
        };

        let metadata_el = el.querySelector('.ent_id');
        if (metadata_el) {
          let place_id = metadata_el.getAttribute('id');
          if (place_id) {
            place.place_id = place_id.replace('c-eid_', '');
          }
          place.gps_coordinates = {
            latitude: metadata_el.getAttribute('elat'),
            longitude: metadata_el.getAttribute('elong'),
          };
        }

        let thumbnail_el = el.querySelector('img');
        if (thumbnail_el) {
          place.thumbnail = thumbnail_el.getAttribute('src');
        }

        let title_el = el.querySelector('div.tit');
        if (title_el) {
          place.title = title_el.innerText.trim();
        }

        let mention_el = el.querySelector('.ft_otl.b_primtxt');
        if (mention_el) {
          place.mention = mention_el.innerText.trim();
        }

        let hours_el = el.querySelector('.opHours');
        if (hours_el) {
          place.hours = hours_el.innerText.trim();
        }

        let website_el = el.parentNode.parentNode.querySelector('a.L48Cpd');
        if (website_el) {
          if (!place.links) {
            place.links = {};
          }
          place.links.website = website_el.getAttribute('href');
        }

        let directions_el = el.parentNode.parentNode.querySelector('a.VByer');
        if (directions_el) {
          if (!place.links) {
            place.links = {};
          }
          place.links.directions = directions_el.getAttribute('href');
        }

        let rating_el = el.querySelector('.csrc.sc_rc1');
        if (rating_el) {
          let text = rating_el.getAttribute('aria-label');
          let rating = text.match(/\d[,\.]\d/g);
          if (rating) {
            place.rating = parseFloat(rating);
          }
        }

        let reviews_el = el.querySelector('.tags li:nth-child(1)');
        if (reviews_el) {
          let text = reviews_el.innerText;
          let reviews = text.match(/\(\d+\)/g);
          if (reviews.length > 0) {
            place.reviews = reviews[0].replace('(', '').replace(')', '');
            place.reviews = parseInt(place.reviews);
          }
        }

        let second_row_el = el.querySelector('.tags li:nth-child(2)');
        if (second_row_el) {
          let text = second_row_el.innerText;
          let parts = text.split(' · ');
          if (parts.length === 3) {
            place.type = parts[0].trim();
            place.price = parts[1].trim();
            place.location = parts[2].trim();
          }
        }

        local_results.places.push(place);
      });

      place_position = 0;
      document.querySelectorAll('#lMapContainer .b_scard').forEach((el) => {
        if (!local_results.places) {
          local_results.places = [];
        }
        place_position++;
        let place = {
          position: place_position,
        };

        let mention_el = el.querySelector('.ft_otl.ft_wm');
        if (mention_el) {
          place.mention = mention_el.innerText.trim();
        }

        let thumbnail_el = el.querySelector('img');
        if (thumbnail_el) {
          place.thumbnail = thumbnail_el.getAttribute('src');
        }

        let title_el = el.querySelector('.lc_content > h2');
        if (title_el) {
          place.title = title_el.innerText.trim();
        }

        let hours_el = el.querySelector('.b_factrow .opHours');
        if (hours_el) {
          place.hours = hours_el.innerText.trim();
        }

        let website_el = el.querySelector('.b_sideBleed a.ibs_2btns:nth-child(2)');
        if (website_el) {
          if (!place.links) {
            place.links = {};
          }
          place.links.website = website_el.getAttribute('href');
        }

        let directions_el = el.querySelector('.b_sideBleed a.ibs_2btns:first-child');
        if (directions_el) {
          if (!place.links) {
            place.links = {};
          }
          place.links.directions = directions_el.getAttribute('href');
        }

        let rating_el = el.querySelector('.csrc.sc_rc1');
        if (rating_el) {
          let text = rating_el.getAttribute('aria-label');
          let rating = text.match(/\d[,\.]*\d*/g);
          if (rating) {
            place.rating = parseFloat(rating);
          }
        }

        let reviews_el = el.querySelector('.b_factrow .csrc');
        if (reviews_el) {
          let text = reviews_el.getAttribute('aria-label');
          let reviews = text.match(/\(\d+\)/g);
          if (Array.isArray(reviews) && reviews.length > 0) {
            place.reviews = reviews[0].replace('(', '').replace(')', '');
            place.reviews = parseInt(place.reviews);
          }
        }

        let second_row_el = el.querySelector('.b_factrow:nth-child(3)');
        if (second_row_el) {
          let text = second_row_el.innerText;
          let parts = text.split(' · ');
          if (parts.length === 2) {
            place.address = parts[0].trim();
            place.phone = parts[1].trim();
          }
        }

        local_results.places.push(place);
    });

      return local_results;
    });
  }

  // @todo: we need to manually click on the question in order to see all the data
  async parse_related_questions() {
    return await this.page.evaluate(() => {
      let related_questions = [];
      let related_questions_els = document.querySelectorAll('#relatedQnAListDisplay .df_topAlAs');
      related_questions_els.forEach((el) => {
        related_questions.push({
          question: el.innerText.trim(),
        });
      });
      return related_questions;
    });
  }

  async parse_pagination() {
    return await this.page.evaluate(() => {
      // parse pagination
      let pagination = {};
      let pagination_el = document.querySelector('.b_pag');
      if (pagination_el) {
        let pagination_objects = pagination_el.querySelectorAll('.sb_pagF li a');
        pagination_objects.forEach((el, index) => {
          if (!pagination.other_pages) {
            pagination.other_pages = {};
            try {
              pagination.next = document.querySelector('a.sb_pagN.sb_pagN_bp').getAttribute('href');
            } catch (err) {}

            try {
              pagination.current = parseInt(document.querySelector('a.sb_pagS.sb_pagS_bp.b_widePag.sb_bp').innerText);
            } catch (err) {}
          }
          let text = el.innerText.trim();
          let href = el.getAttribute('href');
          if (text && href) {
            pagination.other_pages[text] = href;
          }
        });
      }
      return pagination;
    });
  }

  async parse_inline_videos() {
    return await this.page.evaluate(() => {
      let inline_videos = [];

      let inline_videos_els = document.querySelectorAll('.gT5me');
      inline_videos_els.forEach((el) => {
        let video = {};

        let title_el = el.querySelector('.mB12kf');
        if (title_el) {
          video.title = title_el.innerText.trim();
        }

        let link_el = el.querySelector('a');
        if (link_el) {
          video.link = link_el.getAttribute('href');
        }

        let thumbnail_el = el.querySelector('img');
        if (thumbnail_el) {
          video.thumbnail = thumbnail_el.getAttribute('src');
        }

        let channel_el = el.querySelector('.RgAZAc');
        if (channel_el) {
          video.channel = channel_el.innerText.trim();
        }

        let duration_el = el.querySelector('.Woharf.LQFTgb');
        if (duration_el) {
          video.duration = duration_el.innerText.trim();
        }

        let platform_el = el.querySelector('.nHGuld');
        if (platform_el) {
          let text = platform_el.innerText.trim();
          let parts = text.split(' - ');
          if (parts.length === 2) {
            video.platform = parts[0];
            video.date = parts[1];
          }
        }

        if (video.title && video.link) {
          inline_videos.push(video);
        }
      });

      return inline_videos;
    });
  }

  async parse_related_searches() {
    return await this.page.evaluate(() => {
      let related_searches = [];
      let related_links = document.querySelectorAll('.b_rs li a')
      related_links.forEach((el, index) => {
        related_searches.push({
          query: el.innerText,
          link: el.getAttribute('href'),
        })
      });
      return related_searches;
    });
  }

  async parse(keyword) {
    let results = await this.page.evaluate(() => {
      let results = {
        search_parameters: null,
        search_information: {
          organic_results_state: "Results for exact spelling",
          total_results: null,
          time_taken_displayed: null,
          query_displayed: null
        },
      };

      try {
        results.search_information.query_displayed = document.querySelector('input[name="q"]').value;
      } catch (err) {
      }

      let showing_results_for = document.getElementById('fprsl');
      if (showing_results_for) {
        results.search_information.organic_results_state = "Some results for exact spelling but showing fixed spelling";
        results.search_information.showing_results_for = showing_results_for.innerText.trim();
        results.search_information.spelling_fix = showing_results_for.innerText.trim();
      }

      try {
        let num_results_el = document.querySelector('.sb_count');
        if (num_results_el) {
          let num_res_text = num_results_el.innerText;
          let match = num_res_text.match(/[\d,\.\s’]{2,20}/g);
          if (match) {
            let total_results = match[0].replace(/[,\.\s’]/g, '');
            results.search_information.total_results = parseInt(total_results.trim());
          }
        }
      } catch (err) {}

      return results;
    });

    try {
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

      let parse_inline_videos = await this.parse_inline_videos();
      if (parse_inline_videos) {
        results.inline_videos = parse_inline_videos;
      }

      let parse_pagination = await this.parse_pagination();
      if (parse_pagination) {
        results.pagination = parse_pagination;
      }
    } catch (err) {
      console.error(err);
    }

    return results;
  }

  async direct_search(keyword) {
    // first build the proper bing search url
    let google_domain = this.options.bing_domain || 'bing.com';
    let url = `https://${google_domain}/search?q=${keyword}`;
    if (this.options && this.options.bing_params) {
      for (let key in this.options.bing_params) {
        url += `&${key}=${this.options.bing_params[key]}`;
      }
    }

    if (this.options.bing_serp_url) {
      url = this.options.bing_serp_url;
    }

    //use google search url params to directly access the search results for our search query
    await this.page.goto(url, {waitUntil: 'domcontentloaded'});
  }

  async set_input_value(selector, value) {
    await this.page.waitFor(selector);
    await this.page.evaluate((value, selector) => {
      return document.querySelector(selector).value = value;
    }, value, selector);
  }

  async next_page() {
    let next_page_link = await this.page.$('a.sb_pagN.sb_pagN_bp');
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
    const selector = await raceSelectors(this.page, ['#b_content', '#recaptcha']);
    if (selector === '#b_content') {
      return true;
    } else {
      return false;
    }
  }
}
