/**
 * @author Nikolai Tschacher
 * @version 1.0
 * @last_modified April 2020
 * @website: scrapeulous.com
 *
 * This is a simple (but functional) http crawler that can be executed
 * within the scrapeulous.com crawling infrastructure.
 *
 * @param: options.stay_within_domain: only add urls to the queue with the same domain default: true
 * @param: options.allow_arbitrary_subdomains: Allow www.example.org if the initial url is example.org
 * @param: options.only_urls_with_text: Will only add href urls of <a> elements with element text to the corpus. default: true
 */
class HttpCrawler extends HttpWorker {
  async crawl(url) {
    // set default options
    if (!this.options.stay_within_domain) {
      this.options.stay_within_domain = true;
    }
    if (!this.options.allow_arbitrary_subdomains) {
      this.options.allow_arbitrary_subdomains = true;
    }
    if (!this.options.only_urls_with_text) {
      this.options.only_urls_with_text = true;
    }

    let parsed_url;

    try {
      parsed_url = new URL(url);
    } catch (err) {
      return {
        error: `url ${url} is invalid: ${err.message}`
      };
    }

    // set an random desktop user agent
    let user_agent = new this.UserAgent({deviceCategory: 'desktop'}).toString();
    let headers = {'User-Agent': user_agent};
    let html;

    try {
      let response = await this.Got(url, {headers: headers});
      html = response.body;
    } catch (err) {
      return err.toString();
    }

    let $ = this.Cheerio.load(html);
    let links = this.getLinks($);
    let cleaned_links = this.cleanLinks(links, parsed_url);

    if (this.enqueue) {
      this.enqueue(null, cleaned_links, {allow_duplicates: false});
    } else {
      return cleaned_links;
    }
  }

  cleanLinks(links, parsed_url) {
    let filtered = [];
    for (let link of links) {
      let skip = false;
      let url;
      try {
        url = new URL(link.link, parsed_url.origin);
      } catch (err) {
        this.logger.warn(`url ${link.link} cannot be parsed`);
        continue;
      }
      // https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
      if (this.options.stay_within_domain) {
        if (url.hostname !== parsed_url.hostname) {
          skip = true;
        }
      }
      if (!skip) {
        let url_string = url.toString();
        url_string = url_string.replace(/#/g, '');
        filtered.push(url_string);
      }
    }

    return [...new Set(filtered)];
  }

  getLinks($) {
    let all_links = [];
    $($('a')).each(function(i, link) {
      let link_text = $(link).text();
      let href = $(link).attr('href');
      if (href && href.trim()) {
        let obj = {
          link: href,
          text: link_text
        };
        let add = true;
        if (this.options.only_urls_with_text) {
          if (link_text.trim().length <= 0) {
            add = false;
          }
        }
        if (add) {
          all_links.push(obj);
        }
      }
    }.bind(this));
    return all_links;
  }
}
