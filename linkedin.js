/**
 * Opens a linked in profile url and extracts all the public information.
 *
 * Heavily inspired by: https://github.com/jvandenaardweg/linkedin-profile-scraper
 * (c) Copyright at https://github.com/jvandenaardweg
 *
 * @param profileUrl: The url to the linked in profile
 * @param options: Holds all configuration data and options
 */
async function Worker(profileUrl, options) {

    function statusLog(section, msg, id, session_id) {
        console.log(`[${section}] ${id}: ${msg}, ${session_id}`);
    }

    async function autoScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 500;
                var timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }

    const getLocationFromText = async (text) => {
        // Text is something like: Amsterdam Area, Netherlands

        if (!text) return null;

        const cleanText = text.replace(' Area', '');

        const city = (cleanText) ? cleanText.split(', ')[0] : null;
        const country = (cleanText) ? cleanText.split(', ')[1] : null;

        return {
            city,
            country
        }
    };

    const getCleanText = async (text) => {
        const regexRemoveMultipleSpaces = / +/g;
        const regexRemoveLineBreaks = /(\r\n\t|\n|\r\t)/gm;

        if (!text) return null;

        const cleanText = text
            .replace(regexRemoveLineBreaks, '')
            .replace(regexRemoveMultipleSpaces, ' ')
            .replace('...', '')
            .replace('See more', '')
            .replace('See less', '')
            .trim();

        return cleanText
    };

    const formatDate = (date) => {
        let formattedDate = null;
        // date = "Present", "2018", "Dec 2018"
        if (date === 'Present') {
            formattedDate = moment().format()
        } else {
            formattedDate = moment(date, 'MMMY').format()
        }

        return formattedDate
    };

    const getDurationInDays = (formattedStartDate, formattedEndDate) => {
        if (!formattedStartDate || !formattedEndDate) return null
        // +1 to include the start date
        return moment(formattedEndDate).diff(moment(formattedStartDate), 'days') + 1
    };


    let userProfile = null;
    let experiences = null;
    let education = null;
    let skills = null;

    // (1) setup phase

    await page.exposeFunction('getCleanText', getCleanText);
    await page.exposeFunction('getLocationFromText', getLocationFromText);
    await page.exposeFunction('formatDate', formatDate);
    await page.exposeFunction('getDurationInDays', getDurationInDays);

    // (2) scraping phase

    try {
        const logSection = 'scraping';

        const scraperSessionId = new Date().getTime();

        statusLog(logSection, `Navigating to LinkedIn profile: ${profileUrl}`, scraperSessionId);

        // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options
        await page.goto(profileUrl, {
            waitUntil: 'networkidle0'
        });

        await page.waitFor(3000);

        statusLog(logSection, 'LinkedIn profile page loaded!', scraperSessionId);

        // TODO: first check if the needed selectors are present on the page, or else we need to update it in this script
        // TODO: notifier should be build if LinkedIn changes their selectors

        statusLog(logSection, 'Getting all the LinkedIn profile data by scrolling the page to the bottom, so all the data gets loaded into the page...', scraperSessionId);

        await autoScroll(page);

        statusLog(logSection, 'Parsing data...', scraperSessionId);

        // Only click the expanding buttons when they exist
        const expandButtonsSelectors = [
            '#experience-section .pv-profile-section__see-more-inline.link', // Experience
            '.pv-profile-section.education-section button.pv-profile-section__see-more-inline', // Education
            '.pv-skill-categories-section [data-control-name="skill_details"]', // Skills
        ];

        const seeMoreButtonsSelectors = ['.pv-entity__description .lt-line-clamp__line.lt-line-clamp__line--last .lt-line-clamp__more[href="#"]'];

        statusLog(logSection, 'Expanding all sections by clicking their "See more" buttons', scraperSessionId);

        for (const buttonSelector of expandButtonsSelectors) {
            if (await page.$(buttonSelector) !== null) {
                statusLog(logSection, `Clicking button ${buttonSelector}`, scraperSessionId)
                await page.click(buttonSelector);
            }
        }

        // To give a little room to let data appear. Setting this to 0 might result in "Node is detached from document" errors
        await page.waitFor(100);

        statusLog(logSection, 'Expanding all descriptions by clicking their "See more" buttons', scraperSessionId);

        for (const seeMoreButtonSelector of seeMoreButtonsSelectors) {
            const buttons = await page.$$(seeMoreButtonSelector);

            for (const button of buttons) {
                if (button) {
                    statusLog(logSection, `Clicking button ${seeMoreButtonSelector}`, scraperSessionId);
                    await button.click()
                }
            }
        }

        // TODO: check if we need to expand experience, education and skills AGAIN (for the rest of the data)

        // Converting the complete string to a document, so we can querySelector into it instead of using Puppeteer
        // TODO: we can also close this thread now so puppeteer can crawl other profiles, resulting on more pages per minute we can crawl
        // const html = await page.content()
        // const dom = new JSDOM(html);
        // console.log(dom.window.document.querySelector('.pv-entity__description').textContent)

        statusLog(logSection, 'Parsing profile data...', scraperSessionId);

        userProfile = await page.evaluate(async () => {
            const regexRemoveMultipleSpaces = / +/g;
            const regexRemoveLineBreaks = /(\r\n\t|\n|\r\t)/gm;

            const profileSection = document.querySelector('.pv-profile-section');

            const url = window.location.href;

            const fullNameElement = profileSection.querySelector('.pv-top-card-section__name');
            const fullName = (fullNameElement && fullNameElement.textContent) ? await window.getCleanText(fullNameElement.textContent) : null;

            const titleElement = profileSection.querySelector('.pv-top-card-section__headline');
            const title = (titleElement && titleElement.textContent) ? await window.getCleanText(titleElement.textContent) : null;

            const locationElement = profileSection.querySelector('.pv-top-card-section__location');
            const locationText = (locationElement && locationElement.textContent) ? await window.getCleanText(locationElement.textContent) : null;
            const location = await getLocationFromText(locationText);

            const photoElement = profileSection.querySelector('.pv-top-card-section__photo');
            const photo = (photoElement && photoElement.style.backgroundImage) ? photoElement.style.backgroundImage.slice(4, -1).replace(/"/g, "") : null;

            const descriptionElement = profileSection.querySelector('.pv-top-card-section__summary-text');
            const description = (descriptionElement && descriptionElement.textContent) ? await window.getCleanText(descriptionElement.textContent) : null;

            return {
                fullName,
                title,
                location,
                photo,
                description,
                url
            }
        });

        statusLog(logSection, `Got user profile data: ${userProfile}`, scraperSessionId);
        statusLog(logSection, `Parsing experiences data...`, scraperSessionId);

        experiences = await page.$$eval('#experience-section ul > .ember-view', async (nodes) => {
            const regexRemoveMultipleSpaces = / +/g;
            const regexRemoveLineBreaks = /(\r\n\t|\n|\r\t)/gm;
            let data = [];

            // Using a for loop so we can use await inside of it
            for (const node of nodes) {
                const titleElement = node.querySelector('h3');
                const title = (titleElement && titleElement.textContent) ? await window.getCleanText(titleElement.textContent) : null;

                const companyElement = node.querySelector('.pv-entity__secondary-title');
                const company = (companyElement && companyElement.textContent) ? await window.getCleanText(companyElement.textContent) : null;

                const descriptionElement = node.querySelector('.pv-entity__description');
                const description = (descriptionElement && descriptionElement.textContent) ? await window.getCleanText(descriptionElement.textContent) : null;

                const dateRangeElement = node.querySelector('.pv-entity__date-range span:nth-child(2)');
                const dateRangeText = (dateRangeElement && dateRangeElement.textContent) ? await window.getCleanText(dateRangeElement.textContent) : null;

                const startDatePart = (dateRangeText) ? await window.getCleanText(dateRangeText.split('–')[0]) : null;
                const startDate = (startDatePart) ? await formatDate(startDatePart) : null;

                const endDatePart = (dateRangeText) ? await window.getCleanText(dateRangeText.split('–')[1]) : null;
                const endDate = (endDatePart) ? await formatDate(endDatePart) : null;

                const durationInDays = (startDate && endDate) ? await getDurationInDays(startDate, endDate) : null;

                const locationElement = node.querySelector('.pv-entity__location span:nth-child(2)');
                const locationText = (locationElement && locationElement.textContent) ? await window.getCleanText(locationElement.textContent) : null;
                const location = await getLocationFromText(locationText);

                data.push({
                    title,
                    company,
                    location,
                    startDate,
                    endDate,
                    durationInDays,
                    description,
                })
            }

            return data;
        });


        statusLog(logSection, `Got experiences data: ${experiences}`, scraperSessionId);
        statusLog(logSection, `Parsing education data...`, scraperSessionId);

        education = await page.$$eval('#education-section ul > .ember-view', async (nodes) => {
            // Note: the $$eval context is the browser context.
            // So custom methods you define in this file are not available within this $$eval.
            let data = [];
            for (const node of nodes) {

                const schoolNameElement = node.querySelector('h3.pv-entity__school-name');
                const schoolName = (schoolNameElement && schoolNameElement.textContent) ? await window.getCleanText(schoolNameElement.textContent) : null;

                const degreeNameElement = node.querySelector('.pv-entity__degree-name .pv-entity__comma-item');
                const degreeName = (degreeNameElement && degreeNameElement.textContent) ? await window.getCleanText(degreeNameElement.textContent) : null;

                const fieldOfStudyElement = node.querySelector('.pv-entity__fos .pv-entity__comma-item');
                const fieldOfStudy = (fieldOfStudyElement && fieldOfStudyElement.textContent) ? await window.getCleanText(fieldOfStudyElement.textContent) : null;

                const gradeElement = node.querySelector('.pv-entity__grade .pv-entity__comma-item');
                const grade = (gradeElement && gradeElement.textContent) ? await window.getCleanText(fieldOfStudyElement.textContent) : null;

                const dateRangeElement = node.querySelectorAll('.pv-entity__dates time');

                const startDatePart = (dateRangeElement && dateRangeElement[0] && dateRangeElement[0].textContent) ? await window.getCleanText(dateRangeElement[0].textContent) : null;
                const startDate = (startDatePart) ? await formatDate(startDatePart) : null;

                const endDatePart = (dateRangeElement && dateRangeElement[1] && dateRangeElement[1].textContent) ? await window.getCleanText(dateRangeElement[1].textContent) : null;
                const endDate = (endDatePart) ? await formatDate(endDatePart) : null;

                const durationInDays = (startDate && endDate) ? await getDurationInDays(startDate, endDate) : null;

                data.push({
                    schoolName,
                    degreeName,
                    fieldOfStudy,
                    startDate,
                    endDate,
                    durationInDays
                })
            }

            return data
        });

        statusLog(logSection, `Got education data: ${education}`, scraperSessionId);

        statusLog(logSection, `Parsing skills data...`, scraperSessionId);

        skills = await page.$$eval('.pv-skill-categories-section ol > .ember-view', nodes => {
            // Note: the $$eval context is the browser context.
            // So custom methods you define in this file are not available within this $$eval.

            return nodes.map((node) => {
                const skillName = node.querySelector('.pv-skill-category-entity__name-text');
                const endorsementCount = node.querySelector('.pv-skill-category-entity__endorsement-count');

                return {
                    skillName: (skillName) ? skillName.textContent.trim() : null,
                    endorsementCount: (endorsementCount) ? parseInt(endorsementCount.textContent.trim()) : 0
                }
            })
        });

        statusLog(logSection, `Got skills data: ${skills}`, scraperSessionId);

        statusLog(logSection, `Done! Returned profile details for: ${profileUrl}`, scraperSessionId);

    } catch(e) {
        console.error(e);
    }

    return {
        userProfile,
        experiences,
        education,
        skills
    };
}
