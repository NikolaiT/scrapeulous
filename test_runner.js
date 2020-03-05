#!/usr/bin/env node

const fs = require('fs');

class Worker {
  constructor() {
    this.logger = {
      info: console.log,
      error: console.error
    }
    this.options = {};
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class HttpWorker extends Worker {
  constructor() {
    super();
  }

  async setup() {
    this.Got = require('got');
    this.Cheerio = require('cheerio');
  }

  async turnDown() {}
}

class BrowserWorker extends Worker {
  constructor() {
    super();
  }

  async setup() {
    const puppeteer = require('puppeteer');
    this.browser = await puppeteer.launch({
      headless: true,
    });
    this.page = await this.browser.newPage();
  }

  async turnDown() {
    await this.page.close();
    await this.browser.close();
  }
}

class TestRunner {
  constructor(crawler, items) {
    this.items = items;

    try {
      this.crawler_code = fs.readFileSync(crawler);
    } catch (err) {
      console.error(`Could not read crawler: ${err}`);
      process.exit(-1);
    }
  }

  async run() {
    if (this.crawler_code.includes('extends HttpWorker')) {
    } else if (this.crawler_code.includes('extends BrowserWorker')) {
    } else {
      console.error(`Invalid worker`);
      process.exit(-1);
    }

    let Worker = eval(`(${this.crawler_code})`);
    let instance = new Worker();
    await instance.setup();

    let results = [];

    for (let item of this.items) {
      results.push(await instance.crawl(item));
    }

    await instance.turnDown();

    return results;
  }
}

(async () => {
  let items = eval(process.argv[3]) || ['https://ipinfo.io/json'];
  if (!Array.isArray(items)) {
    console.error(`items must be an array`);
    process.exit(-1);
  }

  let tester = new TestRunner(process.argv[2] || 'http.js', items);
  let results = await tester.run();
  console.dir(results, { depth: null });
})();