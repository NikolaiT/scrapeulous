# Cloud Crawler

This repository contains cloud crawler functions used by [scrapeulous.com](https://scrapeulous.com/).

If you want to add your own crawler function to be used within the crawling infrastructure of scrapeulous, please contact us at [contact](https://scrapeulous.com/contact/).

## Quickstart

Here is how you can test all crawling functions locally.

This repository contains a `test_runner` program.

For example, execute the Google Scraper with:

```bash
node test_runner.js google_scraper.js '["keyword 1",]'
```

or run the amazon crawler with:

```bash
node test_runner.js amazon.js '["Notebook",]'
```

or the reverse image crawler with:

```bash
node test_runner.js reverse_image_google_url.js '["https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Mohamed_Atta.jpg/220px-Mohamed_Atta.jpg", "https://aldianews.com/sites/default/files/styles/article_image/public/articles/ISISAmenaza.jpg?itok=u7Nhc41a", "https://www.hawarnews.com/en/uploads/2019/02/20/140916_130533_fb29e5f0-01b2-4bea-917d-770c3453d2d6.jpg", "https://upload.wikimedia.org/wikipedia/en/thumb/3/34/Mohammed_Atef.jpg/220px-Mohammed_Atef.jpg", "https://media.newyorker.com/photos/590965226552fa0be682ed23/master/pass/Filkins-Khalid-Sheikh-Mohammed-Torture-Report.jpg"]'
```

or 

```bash
node test_runner.js reverse_image_bing_url.js '["https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Mohamed_Atta.jpg/220px-Mohamed_Atta.jpg", "https://aldianews.com/sites/default/files/styles/article_image/public/articles/ISISAmenaza.jpg?itok=u7Nhc41a", "https://www.hawarnews.com/en/uploads/2019/02/20/140916_130533_fb29e5f0-01b2-4bea-917d-770c3453d2d6.jpg", "https://upload.wikimedia.org/wikipedia/en/thumb/3/34/Mohammed_Atef.jpg/220px-Mohammed_Atef.jpg", "https://media.newyorker.com/photos/590965226552fa0be682ed23/master/pass/Filkins-Khalid-Sheikh-Mohammed-Torture-Report.jpg"]'
```

## Examples of crawler functions

+ [Scraping of Product Metadata on Amazon](amazon.js)
+ [Extract the SERP from Google](google_scraper.js)
+ [Extract the SERP from Bing](bing_scraper.js)
+ [Simple HTTP crawler making plain requests](http.js)
+ [Leads: Extracting phone numbers and email addresses from any url with raw http requests](leads.js)
+ [Extracting linkedin profile data from any linkedin profile](linkedin.js)
+ [Extracting amazon warehouse deals](amazon_wh.js)
+ [Extracting amazon product data](product_info_amazon.js)

## Crawling class description

You can add two types of Cloud Crawler functions:

1. For crawling with the chrome browser controlled via `puppeteer`, use the `BrowserWorker` base class
2. Scraping with the http library `got` and parsing with `cheerio`, use the `HttpWorker` base class

Function prototype for browsers looks like this:

```js
/**
 *
 * The BrowserWorker class contains your scraping/crawling logic.
 *
 * Each BrowserWorker class must declare a crawl() function, which is executed on a distributed unique machine
 * with dedicated CPU, memory and browser instance. A unique IP is not guaranteed,
 * but it is the norm.
 *
 * Scraping workers time out after 200 seconds. So the function
 * should return before this hard limit.
 *
 * Each Worker has a `page` param: A puppeteer like page object. See here:
 * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page
 */
class Worker extends BrowserWorker {
  /**
  *
  * Implement your crawling logic here. You have access to `this.page` here
  * with a fully loaded browser according to configuration.
  *
  * @param item: The item that this crawl function makes progress with
  */
  async function crawl(item) {
  
  }
}
```

And the function prototype for `HttpWorker` instances looks similar:

```js
/**
 *
 * The HttpWorker class contains your scraping/crawling logic.
 *
 * Each HttpWorker class must declare a crawl() function, which is executed on a distributed unique machine
 * with dedicated CPU, memory and browser instance. A unique IP is not guaranteed,
 * but it is the norm.
 *
 * Scraping workers time out after 200 seconds. So the function
 * should return before this hard limit.
 *
 * The class has access to the `this.Got` http library and `this.Cheerio` for parsing html documents.
 * https://github.com/sindresorhus/got
 */
class Worker extends HttpWorker {
  /**
  *
  * Implement your crawling logic here. You have access to `this.Got` here
  * with a powerful http client library.
  *
  * @param item: The item that this crawl function makes progress with
  */
  async function crawl(item) {
  
  }
}
```
