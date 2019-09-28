/**
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

    function extractLeadInformation(html) {

        // parse phone numbers

        const phone_number_regex_list = [
            // find generic phone numbers
            /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g,

            // find german phone numbers: https://www.regextester.com/108528
            /\(?\+\(?49\)?[ ()]?([- ()]?\d[- ()]?){10}/g,

            // international: https://www.regextester.com/94816
            /^\+[0-9]?()[0-9](\s|\S)(\d[0-9]{9})$/g,

            // dutch phone numbers: https://regexr.com/3aevr
            /((\+|00(\s|\s?\-\s?)?)31(\s|\s?\-\s?)?(\(0\)[\-\s]?)?|0)[1-9]((\s|\s?\-\s?)?[0-9])((\s|\s?-\s?)?[0-9])((\s|\s?-\s?)?[0-9])\s?[0-9]\s?[0-9]\s?[0-9]\s?[0-9]\s?[0-9]/g
        ];

        for (let regex of phone_number_regex_list) {

            let phone_numbers = html.match(regex);

            if (phone_numbers) {
                result.phone_numbers.push(...phone_numbers);
            }
        }

        // extract email addresses

        const email_addresses_regex_list = [

            /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g,

            // https://stackoverflow.com/questions/33865113/extract-email-address-from-string-php
            /[\._a-zA-Z0-9-]+@[\._a-zA-Z0-9-]+/g,

            // https://emailregex.com/
            /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/igm,

            /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/igm
        ];

        for (let regex of email_addresses_regex_list) {

            let emails = html.match(regex);

            if (emails) {
                result.email_addresses.push(...emails);
            }
        }
    }

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
            if (result.page_title) {
                result.page_title = result.page_title.trim();
            }

            if (options.custom_css_selectors) {

                result.custom_css_selectors = [];

                // extract custom css selectors
                for (let selector of options.custom_css_selectors) {

                    let res = $(selector).first().text();

                    if (res) {
                        result.custom_css_selectors.push(
                            res
                        )
                    }
                }

                // remove duplicates
                result.custom_css_selectors = [...new Set(result.custom_css_selectors)];
            }

            // custom_regexes is a list of
            // {pattern: '', flags: ''} objects
            if (options.custom_regexes) {

                result.custom_regexes = [];

                // extract custom custom_regexes
                for (let regex of options.custom_regexes) {

                    if (regex.pattern) {

                        var re = new RegExp(regex.pattern, regex.flags);

                        let res = html.match(re);
                        if (res) {

                            result.custom_regexes.push(
                                res
                            )
                        }
                    }

                }
                // remove duplicates
                result.custom_regexes = [...new Set(result.custom_regexes)];
            }

        }).catch(function (error) {
            console.log(error);
        });

    return result;
}
