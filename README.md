# CloudCrawler

This repository contains cloud crawler functions used by [scrapeulous.com/cloud-crawler](https://scrapeulous.com/cloud-crawler).

If you want to add your own cloud crawler function to be used within the crawling infrastructure of scrapeulous, please contact us at [contact](https://scrapeulous.com/contact/).


## Examples of Crawler functions

+ [Debugging crawlers by getting IP data and http headers](ip_and_headers.js)
+ [Scraping of Products on Amazon](amazon.js)
+ [Extract Links from the Google SERP](google.js)
+ [Simple HTTP crawler using axios](http_get.js)
+ [Extracting any phone numbers and email addresses from any url with raw http requests](leads.js)
+ [Extracting linkedin profile data from any linkedin profile](leads.js)

## Function Prototype

You can add two types of Cloud Crawler functions:

1. Crawling with the Chromium browser controlled via `puppeteer`
2. Scraping with the http library `axios` and parsing with `cheerio`, access to random user agents via `const UserAgent = require('user-agents');`

Function prototype for browsers looks like this:

```js
/**
 *
 * The worker function contains your scraping/crawling logic.
 *
 * Each Worker() function is executed on a distributed unique machine
 * with dedicated CPU, memory and browser instance. A unique IP is not guaranteed,
 * but it is the norm.
 *
 * Scraping workers time out after 120 seconds. So the function
 * should return before this hard limit.
 *
 * Each Worker has a `page` param: A puppeteer like page object. See here:
 * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page
 *
 * @param item: The item that this Worker callback is responsible for
 * @param options: Holds all configuration data and options
 */
async function Worker(item, options) {
    // implement your crawling logic with `page`, a puppeteer handle
}
```

And the function prototype for plain http requests similar:

```js
/**
 *
 * The worker function contains your scraping/crawling logic.
 *
 * The function allows to access data with `axios` and
 * parse html with `cheerio`.
 *
 * @param item: The item that this Worker callback is responsible for
 * @param options: Holds all configuration data and options
 */
async function Worker(item, options) {
    // use `axios` and `cheerio` here

    // get a random user agent like that:
    // let user_agent = new UserAgent({ deviceCategory: 'desktop' }).toString();
    // let headers = {'User-Agent': user_agent};
}
```
