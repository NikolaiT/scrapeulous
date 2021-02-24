# Cloud Crawler

This repository contains crawler functions used by [scrapeulous.com](https://scrapeulous.com/).

If you want to add your own crawler function to be used within the crawling infrastructure of scrapeulous, please contact us at [contact](https://scrapeulous.com/contact/).

There are three different endpoints for the API:

+ /crawl - This endpoint allows you to get the HTML from any url. You may use a browser or a plain HTTP requests.
+ /serp - This endpoint allows you to scrape several different seach engines such as Google, Bing or Amazon.
+ /custom - This endpoint allows you to specify your own crawler logic in a custom Puppeteer class.

For the complete documentation, please visit the [API docs page](https://scrapeulous.com/api-docs).


