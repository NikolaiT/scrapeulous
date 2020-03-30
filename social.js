/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified April 2020
 * @website: scrapeulous.com
 *
 * Extracts social links from any website such as
 * github profile, instagram, linkedin profile or facebook.
 * 
 * Extracts: linkedin profile, email address, facebook, instagram, twitter, phone regex
 *
 * @param: options.custom_regexes: List of custom regexes to find lead information
 */
class Social extends HttpWorker {
  async crawl(url) {
    let result = {
      page_title: '',
      email_addresses: [],
      phone_numbers: [],
      facebook: [],
      instagram: [],
      linkedin: [],
      twitter: [],
      github: [],
    };

    // set an random desktop user agent
    let user_agent = new this.UserAgent({deviceCategory: 'desktop'}).toString();
    let headers = {'User-Agent': user_agent};

    let to_visit = [url, ];

    let response = await this.Got(to_visit.pop(), {headers: headers});
    let html = response.body;
    let $ = this.Cheerio.load(html);
    this.extractSocialInformation(html, result, $);

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
        if (href && href.trim()) {
          all_links.push({
            link: href,
            text: link_text
          });
        }
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
      this.extractSocialInformation(html, result, $);
    }

    // remove duplicates in all arrays
    for (let key in result) {
      if (Array.isArray(result[key])) {
        result[key] = [...new Set(result[key])];
      }
    }

    return result;
  }

  extractEmails(html) {
    let emails = html.match(
      /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/gm
    );

    if (emails) {
      return emails;
    } else {
      return [];
    }
  }

  extractInstagram(html) {
    let instagram_profiles = html.match(
      /https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/gm
    );

    if (instagram_profiles) {
      return instagram_profiles;
    } else {
      return [];
    }
  }

  extractFacebook(html) {
    let facebook_urls = html.match(
      /http(s)?:\/\/(www\.)?(facebook|fb)\.com\/[A-z0-9_\-\.]+\/?/gm
    );

    if (facebook_urls) {
      return facebook_urls;
    } else {
      return [];
    }
  }

  extractTwitter(html) {
    let twitter = html.match(
      /http(s)?:\/\/(.*\.)?twitter\.com\/[A-z0-9_]+\/?/gm
    );

    if (twitter) {
      return twitter;
    } else {
      return [];
    }
  }

  extractGithub(html) {
    let github_profiles = html.match(
      /http(s)?:\/\/(www\.)?github\.com\/[A-z0-9_-]+\/?/gm
    );

    if (github_profiles) {
      return github_profiles;
    } else {
      return [];
    }
  }

  extractPhones(html) {
    const phone_numbers_regex_list = [
      // only german phone numbers
      /\(?\+\(?49\)?[ ()]?([- ()]?\d[- ()]?){10}/gm,
      // generic
      /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/gm,
    ];

    let phones = [];

    for (let regex of phone_numbers_regex_list) {
      let phone_matches = html.match(regex);
      if (phone_matches) {
        phones.push(...phone_matches);
      }
    }

    return phones;
  }

  extractSocialInformation(html, result) {
    result.email_addresses.push(...this.extractEmails(html));
    result.phone_numbers.push(...this.extractPhones(html));
    result.facebook.push(...this.extractFacebook(html));
    result.twitter.push(...this.extractTwitter(html));
    result.instagram.push(...this.extractInstagram(html));
    result.github.push(...this.extractGithub(html));
  }
}
