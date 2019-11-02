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
 * New and Used Link: https://www.amazon.de/gp/offer-listing/B00IE9XHE0/ref=dp_olp_all_mbc?ie=UTF8&condition=all
 *
 * On this new/used link, extract all amazon warehouse deals:
 *
 * Extract used status, price and description of used state
 *
 * @param product_link: The product_link leading to the amazon product
 * @param options: Holds all configuration data and options
 */
async function Worker(product_link, options) {

    await page.goto(product_link, {waitUntil: 'networkidle0'});

    try {
        await page.waitForSelector('#olp-upd-new-used-freeshipping', {
            timeout: 15000
        });
    } catch (e) {
        return 'no new/used products';
    }

    // extract product information
    let product_data = await page.evaluate(() => {
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

    console.log(product_data.new_used_products_link);

    // get the warehouse deals, only visit the first page actually
    if (product_data.new_used_products_link) {

        await page.goto(product_data.new_used_products_link, {waitUntil: 'networkidle0'});
        await page.waitForSelector('#olpOfferListColumn');
        await page.waitFor(500);

        product_data.warehouse_deals = await page.evaluate(() => {

            let deals = [];

            document.querySelectorAll('#olpOfferList .a-row').forEach((node) => {

                let img = node.querySelector('.olpSellerColumn a img');
                let is_wh = img && img.getAttribute('alt') === 'Amazon Warehouse';

                if (is_wh) {

                    let deal = {
                        warehouse_price: null,
                        prime: null, // unverbindliche preisempfehlung
                        state: null,
                        state_description: null,
                    };

                    try {
                        deal.warehouse_price = node.querySelector('.olpPriceColumn').innerText;
                        deal.prime = node.querySelector('.olpPriceColumn .a-icon-prime') !== null;
                        deal.state = node.querySelector('.olpConditionColumn .olpCondition').innerText;
                        deal.state_description = node.querySelector('.olpConditionColumn .comments').innerText;
                    } catch (e) {

                    }

                    deals.push(deal);
                }
            });

            return deals;

        });
    }

    return product_data;
}
