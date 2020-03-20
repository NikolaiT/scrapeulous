/**
 * @author Nikolai Tschacher
 * @version 1.1
 * @last_modified March 2020
 * @website: scrapeulous.com
 *
 * Extracts lead information from any website.
 *
 * Algorithm: Loads the start page. Checks for phone numbers and mail addresses.
 *
 * @param: options.custom_regexes: List of custom regexes to find lead information
 * @param: options.custom_css_selectors: List of custom css selectors
 * @param: options.advanced:
 *
 * If options.advanced is set to True, then we extract all <a href=""></a> elements from the DOM and check if the link
 * appears to point to a impressum/about/contact/information page where lead information
 * could be stored.
 */
class Leads extends HttpWorker {
  async crawl(url) {
    let result = {
      page_title: '',
      email_addresses: [],
      phone_numbers: [],
    };

    let user_agent = new this.UserAgent({deviceCategory: 'desktop'}).toString();
    let headers = {'User-Agent': user_agent};
    let to_visit = [url];

    let response = await this.Got(to_visit.pop(), {headers: headers});
    let html = response.body;
    const $ = this.Cheerio.load(html);

    // extract page title
    result.page_title = $('title').contents().first().text();
    if (result.page_title) {
      result.page_title = result.page_title.trim();
    }

    if (this.options.advanced && this.options.advanced === true) {
      const needles = ['about', 'contact',
        'impressum', 'site-notice', 'person',
        'me', 'feedback', 'info'];

      let all_links = [];
      $($('a')).each(function(i, link) {
        let link_text = $(link).text();
        let href = $(link).attr('href');
        all_links.push({
          link: href,
          text: link_text
        });
      });

      for (let obj of all_links) {
        for (let needle of needles) {
          if (obj.link.includes(needle)) {
            to_visit.push(obj.link);
          }
        }
      }

      this.logger.info(to_visit);
    }

    while (to_visit.length > 0) {
      let url = to_visit.pop();
      this.logger.info(`Visiting url ${url}`);
      let response = await this.Got(url, {headers: headers});
      let html = response.body;
      const $ = this.Cheerio.load(html);
      this.extractLeadInformation(html, result, $);
    }

    // remove duplicates in both arrays
    result.phone_numbers = [...new Set(result.phone_numbers)];
    result.email_addresses = [...new Set(result.email_addresses)];

    return result;
  }

  extractLeadInformation(html, result, $) {
    // parse phone numbers
    const phone_number_regex_list = [
      // find generic phone numbers
      /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g,
      // find german phone numbers: https://www.regextester.com/108528
      /\(?\+\(?49\)?[ ()]?([- ()]?\d[- ()]?){10}/g,
      // international: https://www.regextester.com/94816
      /^\+[0-9]?()[0-9](\s|\S)(\d[0-9]{9})$/g,
      // dutch phone numbers: https://regexr.com/3aevr
      /((\+|00(\s|\s?\-\s?)?)31(\s|\s?\-\s?)?(\(0\)[\-\s]?)?|0)[1-9]((\s|\s?\-\s?)?[0-9])((\s|\s?-\s?)?[0-9])((\s|\s?-\s?)?[0-9])\s?[0-9]\s?[0-9]\s?[0-9]\s?[0-9]\s?[0-9]/g
    ];

    for (let regex of phone_number_regex_list) {
      let phone_numbers = html.match(regex);
      if (phone_numbers) {
        result.phone_numbers.push(...phone_numbers);
      }
    }

    // extract email addresses
    const email_addresses_regex_list = [
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g,
      // https://stackoverflow.com/questions/33865113/extract-email-address-from-string-php
      /[\._a-zA-Z0-9-]+@[\._a-zA-Z0-9-]+/g,
      // https://emailregex.com/
      /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/igm,
      /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/igm
    ];

    for (let regex of email_addresses_regex_list) {
      let emails = html.match(regex);
      if (emails) {
        result.email_addresses.push(...emails);
      }
    }

    if (this.options.custom_css_selectors) {
      result.custom_css_selectors = [];
      // extract custom css selectors
      for (let selector of this.options.custom_css_selectors) {
        let res = $(selector).first().text();
        if (res) {
          result.custom_css_selectors.push(res)
        }
      }
      // remove duplicates
      result.custom_css_selectors = [...new Set(result.custom_css_selectors)];
    }

    // custom_regexes is a list of
    // {pattern: '', flags: ''} objects
    if (this.options.custom_regexes) {
      result.custom_regexes = [];
      // extract custom custom_regexes
      for (let regex of this.options.custom_regexes) {
        if (regex.pattern) {
          var re = new RegExp(regex.pattern, regex.flags);
          let res = html.match(re);
          if (res) {
            result.custom_regexes.push(res)
          }
        }
      }
      // remove duplicates
      result.custom_regexes = [...new Set(result.custom_regexes)];
    }
  }
}
