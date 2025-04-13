// backend/scrapers/scrapeRogersJobs.js
import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JobPosting from '../models/JobPosting.js';
import connectDB from '../config/db.js';

dotenv.config();

// --- Scraper Configuration ---
const BASE_URL = 'https://jobs.rogers.com/search/';
const RESULTS_PER_PAGE = 10; // **NEEDS VERIFICATION** (How many jobs per page?)
const PARAMS = {
    q: '',
    // **PAGINATION PARAMETER NEEDS VERIFICATION** (e.g., 'page', 'start', 'offset'?)
};
const MAX_PAGES_TO_SCRAPE = 10;
const DELAY_BETWEEN_PAGES_MS = 3000;

// --- CSS Selectors (NEEDS TO BE UPDATED FOR JOBS.ROGERS.COM) ---
// Replace these with the selectors you found!
const JOB_CONTAINER_SELECTOR = 'tr.data-row'; // Example: Replace with actual container selector
const JOB_TITLE_SELECTOR = 'span.jobTitle'; // Example: Replace with actual title/link selector
const JOB_LOCATION_SELECTOR = 'span.jobLocation'; // Example: Replace with actual location selector
const JOB_URL_SELECTOR = 'a.jobTitle-link'; // Example: Often same as title selector
// -------------------------------------------------

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeAndSaveJobs() {
    console.log(`Starting Puppeteer scrape for Rogers Jobs...`);
    let browser = null;
    const allScrapedJobs = [];

    try {
        await connectDB();

        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // --- Loop through pages ---
        // **PAGINATION LOGIC NEEDS VERIFICATION**
        for (let pageNum = 1; pageNum <= MAX_PAGES_TO_SCRAPE; pageNum++) {
            // **UPDATE PARAMETER NAME IF NEEDED (e.g., 'start', 'offset')**
            const currentPageParams = { ...PARAMS, page: pageNum };
            const urlParams = new URLSearchParams(currentPageParams);
            const targetUrl = `${BASE_URL}?${urlParams.toString()}`;

            console.log(`\n--- Scraping Page ${pageNum} ---`);
            console.log(`Navigating to ${targetUrl}...`);

            try {
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                console.log('Page loaded.');

                try {
                    await page.waitForSelector(JOB_CONTAINER_SELECTOR, { timeout: 15000 });
                    console.log('Job containers found.');
                } catch (waitError) {
                     console.warn(`Selector "${JOB_CONTAINER_SELECTOR}" not found on page ${pageNum}. Assuming end of results or page error.`);
                     break;
                }

                // --- Extract Job Data for the current page ---
                const extractedJobs = await page.$$eval(JOB_CONTAINER_SELECTOR, (jobElements, selectors) => {
                    // --- UPDATED CALLBACK FOR ROGERS' STRUCTURE ---
                    const jobsData = [];
                    const baseUrl = 'https://jobs.rogers.com'; // Base URL for resolving relative links

                    jobElements.forEach((element) => {
                        const getText = (selector) => element.querySelector(selector)?.innerText.trim() || null;
                        const getAttribute = (selector, attribute) => element.querySelector(selector)?.getAttribute(attribute) || null;

                        const title = getText(selectors.title);
                        const location = getText(selectors.location);
                        const relativeUrl = getAttribute(selectors.url, 'href');

                        // --- Data Cleaning/Parsing specific to Rogers ---
                        const jobUrl = relativeUrl ? new URL(relativeUrl, baseUrl).href : null;
                        // Location might need cleaning (e.g., remove extra text like postal codes if present)

                        // Add job only if essential data is present
                        if (title && location && jobUrl) {
                            jobsData.push({
                                title,
                                company: 'Rogers Communications', // Hardcode company name
                                location,
                                description: '', // No description snippet available
                                url: jobUrl,
                                source: 'Rogers Careers',
                            });
                        } else {
                            console.warn('Skipping job card, missing essential data:', { title, location, jobUrl });
                        }
                    });
                    return jobsData;
                }, { // Pass selectors to the browser context
                    container: JOB_CONTAINER_SELECTOR,
                    title: JOB_TITLE_SELECTOR,
                    location: JOB_LOCATION_SELECTOR,
                    url: JOB_URL_SELECTOR
                    // No need to pass company or description selectors
                });

                const pageJobs = extractedJobs.map(job => ({ ...job, scrapedAt: new Date() }));
                allScrapedJobs.push(...pageJobs);
                console.log(`Scraped ${pageJobs.length} jobs from this page.`);

                // **VERIFY END CONDITION**
                if (pageJobs.length < RESULTS_PER_PAGE) {
                    console.log(`Found ${pageJobs.length} jobs (less than expected ${RESULTS_PER_PAGE}), likely the last page. Stopping pagination.`);
                    break;
                }

                if (pageNum < MAX_PAGES_TO_SCRAPE) {
                     console.log(`Waiting ${DELAY_BETWEEN_PAGES_MS / 1000} seconds before next page...`);
                     await delay(DELAY_BETWEEN_PAGES_MS);
                }

            } catch (pageError) {
                console.error(`Error scraping page ${pageNum} (${targetUrl}):`, pageError.message);
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
    // (Database saving logic remains the same)
    console.log(`\n--- Database Save ---`);
    console.log(`Total jobs scraped across all pages: ${allScrapedJobs.length}`);
    if (allScrapedJobs.length > 0) {
        try {
            console.log(`Attempting to save ${allScrapedJobs.length} jobs to the database...`);
            let successCount = 0;
            let duplicateCount = 0;
            let errorCount = 0;

            await JobPosting.insertMany(allScrapedJobs, { ordered: false })
                .then(docs => {
                    successCount = docs.length;
                })
                .catch(error => {
                    if (error.code === 11000) {
                        console.warn(`Encountered duplicate entries (unique URL constraint).`);
                        duplicateCount = error.writeErrors?.length || (error.result?.result?.writeErrors?.length || 0);
                        successCount = error.result?.result?.nInserted || 0;
                    } else {
                        console.error('Database insert error:', error.message);
                        errorCount = allScrapedJobs.length - successCount - duplicateCount;
                    }
                });

            console.log(`Database Save Summary: ${successCount} new jobs saved, ${duplicateCount} duplicates skipped, ${errorCount} errors.`);

        } catch (dbError) {
            console.error('Error during database save operation:', dbError);
        } finally {
            // await mongoose.disconnect(); // Uncomment if running standalone
            // console.log('MongoDB connection closed.'); // Uncomment if running standalone
        }
    } else {
        console.log("No jobs were scraped in total, skipping database save.");
    }
}

// Run the scraper
scrapeAndSaveJobs();
