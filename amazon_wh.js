/**
 * Extract Amazon Warehouse Deals from a amazon product link such as
 *
 * https://www.amazon.de/Sony-Systemkamera-Megapixel-LCD-Display-SEL-P1650/dp/B00IE9XHE0/ref=zg_bs_760674_1?_encoding=UTF8&psc=1&refRID=FE9P3C0J3R5XRR0KMP5E
 *
 * The link to the used products has always this url format:
 *
 * https://www.amazon.de/gp/offer-listing/B00IE9XHE0/ref=dp_olp_used?ie=UTF8&condition=used
 * https://www.amazon.de/gp/offer-listing/B00IE9XHE0/ref=dp_olp_all_mbc?ie=UTF8&condition=all
 *
 * where B00IE9XHE0 is the ASIN.
 *
 * On this new/used link, extract all amazon warehouse deals:
 *
     warehouse_price: null,
     prime: null,
     state: null,
     state_description: null,
 *
 * @param product_url: The product_link leading to the amazon product
 * @param options: Holds all configuration data and options
 */
async function Worker(product_url, options) {

    var regex = new RegExp(/\/dp\/([A-Z0-9]{10})\//, 'g');

    let result = regex.exec(product_url);

    let used_product_url = null;

    if (result) {
        let asin = result[1];

        used_product_url = `https://www.amazon.de/gp/offer-listing/${asin}/ref=dp_olp_used?ie=UTF8&condition=used`;

    } else {
        return 'bad product url. No ASIN match.';
    }

    let warehouse_deals = null;

    if (used_product_url) {

        try {
            await page.goto(used_product_url, {
                waitUntil: 'networkidle2',
                timeout: 25000
            });
            await page.waitForSelector('#olpOfferListColumn', {timeout: 10000});
            await page.waitFor(500);
        } catch (e) {
            return `cannot load used_product_url: ${e.toString()}`;
        }

        warehouse_deals = await page.evaluate(() => {

            let deals = [];

            document.querySelectorAll('#olpOfferList .a-row').forEach((node) => {

                let img = node.querySelector('.olpSellerColumn a img');
                let is_wh = img && img.getAttribute('alt') === 'Amazon Warehouse';

                if (is_wh) {

                    let deal = {
                        warehouse_price: null,
                        prime: null,
                        state: null,
                        state_description: null,
                    };

                    try {
                        deal.warehouse_price = node.querySelector('.olpPriceColumn span').innerText;
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

    return warehouse_deals;
}
