/**
 * Scrape Amazon Product Data.
 *
 * Example Product: https://www.amazon.de/Sony-Systemkamera-Megapixel-LCD-Display-SEL-P1650/dp/B00IE9XHE0/ref=zg_bs_760674_1?_encoding=UTF8&psc=1&refRID=FE9P3C0J3R5XRR0KMP5E
 *
 * Price: 11,99 €
 * Unverb. Preisempf
 * Vendor
 * Vendor Link
 * customer reviews
 *
 * @param product_url: The product_link leading to the amazon product
 * @param options: Holds all configuration data and options
 */
async function Worker(product_url, options) {

    await page.goto(product_url, {waitUntil: 'networkidle0'});

    await page.waitForSelector('#priceblock_ourprice', {
        timeout: 10000
    });

    // extract product information
    return await page.evaluate(() => {
        const data = {
            amazon_price: null,
            rrp: null, // unverbindliche preisempfehlung
            vendor: null,
            vendor_link: null,
            customer_reviews: null,
            new_used_products_link: null
        };

        try {
            data.amazon_price = document.getElementById('priceblock_ourprice').textContent;
            data.rrp = document.querySelector('.priceBlockStrikePriceString').textContent;
            data.vendor = document.getElementById('bylineInfo').textContent;
            data.vendor_link = document.getElementById('bylineInfo').getAttribute('href');
            data.customer_reviews = document.getElementById('averageCustomerReviews').innerText;
        } catch (e) {
        }

        try {
            data.new_used_products_link = document.querySelector('#olp-upd-new-used-freeshipping a').getAttribute('href');

            // get a absolute url, just in case
            if (data.new_used_products_link) {
                data.new_used_products_link = document.location.origin + data.new_used_products_link;
            }
        } catch (e) {
            console.error(e);
        }

        return data;
    });
}