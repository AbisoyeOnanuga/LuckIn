import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JobPosting from '../models/JobPosting.js';
import connectDB from '../config/db.js'; // Use shared DB connection

dotenv.config();

// --- Scraper Configuration ---
const BASE_URL = 'https://www.amazon.jobs/en/search';
const PARAMS = { // Define parameters separately for easier modification
    result_limit: 10,
    sort: 'relevant',
    'country[]': 'CAN',
    'state[]': 'Ontario',
    'city[]': 'Toronto',
    distanceType: 'Mi',
    radius: '24km',
    // Add other static parameters from your original URL if needed
};
const MAX_PAGES_TO_SCRAPE = 18; // Set a limit for how many pages to scrape
const DELAY_BETWEEN_PAGES_MS = 3000; // 3-second delay (adjust as needed)

// --- CSS Selectors (VERIFIED FOR AMAZON TORONTO AS OF LAST CHECK) ---
const JOB_CONTAINER_SELECTOR = 'div.job-tile';
const JOB_TITLE_SELECTOR = 'h3.job-title';
const JOB_LOCATION_SELECTOR = 'div.location-and-id'; // Adjusted based on potential structure
const JOB_DESCRIPTION_SNIPPET_SELECTOR = 'div.description'; // Adjusted based on potential structure
const JOB_URL_SELECTOR = 'a.job-link';
// -------------------------------------------------

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeAndSaveJobs() {
    console.log(`Starting Puppeteer scrape for Amazon Jobs in Toronto...`);
    let browser = null;
    const allScrapedJobs = []; // Array to hold jobs from ALL pages

    try {
        await connectDB(); // Connect to DB once at the beginning

        console.log('Launching browser...');
        browser = await puppeteer.launch({ /* ... launch options ... */
            headless: true,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // --- Loop through pages ---
        for (let pageNum = 0; pageNum < MAX_PAGES_TO_SCRAPE; pageNum++) {
            const offset = pageNum * PARAMS.result_limit;
            const currentPageParams = { ...PARAMS, offset };
            const urlParams = new URLSearchParams(currentPageParams);
            const targetUrl = `${BASE_URL}?${urlParams.toString()}`;

            console.log(`\n--- Scraping Page ${pageNum + 1} (Offset: ${offset}) ---`);
            console.log(`Navigating to ${targetUrl}...`);

            try {
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                console.log('Page loaded.');

                // Check if the job container exists on the page
                // Use waitForSelector with a shorter timeout just to check presence
                try {
                    await page.waitForSelector(JOB_CONTAINER_SELECTOR, { timeout: 15000 }); // Wait up to 15s for jobs
                    console.log('Job containers found.');
                } catch (waitError) {
                     // If the main container doesn't appear, assume no more jobs or page issue
                     console.warn(`Selector "${JOB_CONTAINER_SELECTOR}" not found on page ${pageNum + 1}. Assuming end of results or page error.`);
                     break; // Exit the loop if no jobs found on a page
                }


                // --- Extract Job Data for the current page ---
                const extractedJobs = await page.$$eval(JOB_CONTAINER_SELECTOR, (jobElements, selectors) => {
                    // ... (Keep the existing $$eval callback function exactly as it was) ...
                    // It extracts data for the elements currently on the page
                    const jobsData = [];
                    const baseUrl = 'https://www.amazon.jobs';
                    jobElements.forEach((element, index) => {
                        const getText = (selector) => element.querySelector(selector)?.innerText.trim() || null;
                        const getAttribute = (selector, attribute) => element.querySelector(selector)?.getAttribute(attribute) || null;

                        const title = getText(selectors.title);
                        const location = getText(selectors.location);
                        const descriptionSnippet = getText(selectors.descriptionSnippet);
                        const relativeUrl = getAttribute(selectors.url, 'href');

                        let parsedLocation = location;
                        let jobId = null;
                        if (location && location.includes('|')) {
                            const parts = location.split('|');
                            parsedLocation = parts[0]?.trim();
                            jobId = parts[1]?.replace('JOB ID:', '').trim();
                        }
                        const jobUrl = relativeUrl ? new URL(relativeUrl, baseUrl).href : null;

                        if (title && jobUrl) {
                            jobsData.push({
                                title, company: 'Amazon', location: parsedLocation, jobId,
                                description: descriptionSnippet, url: jobUrl, source: 'Amazon Jobs',
                            });
                        }
                    });
                    return jobsData;
                }, { /* ... selectors object ... */
                    container: JOB_CONTAINER_SELECTOR, title: JOB_TITLE_SELECTOR,
                    location: JOB_LOCATION_SELECTOR, descriptionSnippet: JOB_DESCRIPTION_SNIPPET_SELECTOR,
                    url: JOB_URL_SELECTOR
                });

                // Add scrapedAt timestamp and add to the main list
                const pageJobs = extractedJobs.map(job => ({ ...job, scrapedAt: new Date() }));
                allScrapedJobs.push(...pageJobs);
                console.log(`Scraped ${pageJobs.length} jobs from this page.`);

                // Check if fewer jobs than limit were found, indicating last page
                if (pageJobs.length < PARAMS.result_limit) {
                    console.log("Found fewer jobs than limit, likely the last page. Stopping pagination.");
                    break; // Exit loop if we fetched less than a full page
                }

                // Add delay before scraping the next page
                if (pageNum < MAX_PAGES_TO_SCRAPE - 1) {
                     console.log(`Waiting ${DELAY_BETWEEN_PAGES_MS / 1000} seconds before next page...`);
                     await delay(DELAY_BETWEEN_PAGES_MS);
                }

            } catch (pageError) {
                console.error(`Error scraping page ${pageNum + 1} (${targetUrl}):`, pageError.message);
                // Decide if you want to continue to the next page or stop on error
                // For now, let's stop if a page fails significantly
                console.log("Stopping scraper due to page error.");
                break;
            }
        } // --- End of page loop ---

    } catch (error) {
        console.error('Error during Puppeteer setup or main loop:', error);
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }

    // --- Save all collected jobs to Database ---
    console.log(`\n--- Database Save ---`);
    console.log(`Total jobs scraped across all pages: ${allScrapedJobs.length}`);
    if (allScrapedJobs.length > 0) {
        try {
            // DB connection should already be established
            console.log(`Attempting to save ${allScrapedJobs.length} jobs to the database...`);
            let successCount = 0;
            let duplicateCount = 0;
            let errorCount = 0;

            // Use insertMany (same logic as before)
            await JobPosting.insertMany(allScrapedJobs, { ordered: false })
                .then(docs => {
                    successCount = docs.length;
                })
                .catch(error => {
                    if (error.code === 11000) {
                        console.warn(`Encountered duplicate entries (unique URL constraint).`);
                        duplicateCount = error.writeErrors?.length || 0;
                        successCount = error.result?.nInserted || 0;
                    } else {
                        console.error('Database insert error:', error.message);
                        errorCount = allScrapedJobs.length - successCount - duplicateCount;
                    }
                });

            console.log(`Database Save Summary: ${successCount} new jobs saved, ${duplicateCount} duplicates skipped, ${errorCount} errors.`);

        } catch (dbError) {
            console.error('Error during database save operation:', dbError);
        } finally {
            // Close DB connection if running as a standalone script
            // await mongoose.disconnect();
            // console.log('MongoDB connection closed.');
        }
    } else {
        console.log("No jobs were scraped in total, skipping database save.");
    }
}

// Run the scraper
scrapeAndSaveJobs();
