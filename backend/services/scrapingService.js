import axios from 'axios';
import * as cheerio from 'cheerio';
import JobPosting from '../models/JobPosting.js'; // Assuming you save scraped jobs

/**
 * Scrapes job postings from a given URL (Example for a hypothetical structure).
 * IMPORTANT: Web scraping can be fragile and may violate terms of service.
 * Always check the website's robots.txt and terms of service before scraping.
 * This is a simplified example and needs adaptation for specific job boards.
 *
 * @param {string} url - The URL of the job board search results page.
 * @param {string} source - Identifier for the job board (e.g., 'ExampleBoard').
 * @returns {Promise<Array<object>>} - An array of scraped job objects.
 */
export const scrapeJobs = async (url, source) => {
    console.log(`Starting scrape for ${source} at ${url}`);
    try {
        const { data } = await axios.get(url, {
            // Some sites require specific headers to avoid blocking
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const jobs = [];

        // *** THIS SELECTOR IS HYPOTHETICAL - You MUST inspect the target website's HTML ***
        $('.job-listing-item').each((index, element) => {
            const title = $(element).find('.job-title-link').text().trim();
            const company = $(element).find('.company-name').text().trim();
            const location = $(element).find('.job-location').text().trim();
            const jobUrl = $(element).find('.job-title-link').attr('href'); // Make sure it's a full URL or resolve it
            const descriptionSnippet = $(element).find('.job-description-snippet').text().trim(); // May need to visit jobUrl for full description

            if (title && jobUrl) {
                const jobData = {
                    title,
                    company,
                    location,
                    url: jobUrl, // Ensure this is a complete, unique URL
                    description: descriptionSnippet, // Or fetch full description later
                    source,
                };
                jobs.push(jobData);

                // Optional: Save directly to DB here (consider handling duplicates)
                // Be mindful of rate limits and efficiency
                // JobPosting.findOneAndUpdate({ url: jobData.url }, jobData, { upsert: true, new: true })
                //    .catch(err => console.error('Error saving job:', err));
            }
        });

        console.log(`Scraped ${jobs.length} jobs from ${source}`);
        return jobs;

    } catch (error) {
        console.error(`Error scraping ${source} (${url}):`, error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            // console.error('Headers:', error.response.headers);
            // console.error('Data:', error.response.data); // Be careful logging large HTML data
        }
        return []; // Return empty array on error
    }
};

// Example function to trigger scraping (e.g., called by a cron job or API endpoint)
export const runScrapingTasks = async () => {
    // Define target URLs and sources
    const targets = [
        // { url: 'https://www.linkedin.com/jobs/search?keywords=Software%20Engineer...', source: 'LinkedIn' }, // LinkedIn is notoriously hard to scrape reliably
        // { url: 'https://www.indeed.com/jobs?q=Data%20Analyst...', source: 'Indeed' },
        // Add more job boards here
    ];

    for (const target of targets) {
        const scrapedJobs = await scrapeJobs(target.url, target.source);
        // Process scrapedJobs (e.g., save to database, further analysis)
        // Consider adding delays between requests to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay
    }
};
