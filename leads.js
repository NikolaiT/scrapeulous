/**
 *
 * Tries to extract lead information from any website.
 *
 * Algorithm: Loads the start page. Checks for phone numbers and mail addresses.
 *
 * @TODO: If not found: Tries to find interesting links on the site such as:
 *
 * - contact
 * - about
 * - impressum
 * - imprint
 * - ...
 *
 * @param url: The url that is requested with axios
 * @param options: Holds all configuration data and options
 */
async function Worker(url, options) {

    var result = {
        page_title: '',
        email_addresses: [],
        phone_numbers: [],
    };

    let extractLeadInformation = function(html) {

        const phone_number_regex_list = [
            // find generic phone numbers
            /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g,

            // find german phone numbers: https://www.regextester.com/108528
            /\(?\+\(?49\)?[ ()]?([- ()]?\d[- ()]?){10}/g,

            // https://stackoverflow.com/questions/41538589/regexp-for-german-phone-number-format
            /(\(?([\d \-\)\–\+\/\(]+){10,}\)?([ .\-–\/]?)([\d]+))/g,
        ];

        for (let regex of phone_number_regex_list) {

            let phone_numbers = html.match(regex);

            if (phone_numbers) {
                result.phone_numbers.push(...phone_numbers);
            }
        }

        let email_addresses = html.match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g);

        if (email_addresses) {
            result.email_addresses.push(...email_addresses);
        }
    };

    let user_agent = new UserAgent({ deviceCategory: 'desktop' }).toString();
    let headers = {'User-Agent': user_agent};

    await axios.get(url, {headers: headers})
        .then(function (response) {

            let html = response.data;

            extractLeadInformation(html);

            // remove duplicates in both arrays
            result.phone_numbers = [...new Set(result.phone_numbers)];
            result.email_addresses = [...new Set(result.email_addresses)];

            // extract page title

            const $ = cheerio.load(html);
            result.page_title = $('title').text();
        });

    return result;
}