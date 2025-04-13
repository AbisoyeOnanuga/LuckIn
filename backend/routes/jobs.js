import express from 'express';
import checkJwt from '../middleware/checkJwt.js'; // Decide if job searching requires login
import User from '../models/User.js';
import JobPosting from '../models/JobPosting.js'; // <-- Import JobPosting model

// Import necessary controllers or service functions later
// import * as jobController from '../controllers/jobController.js';
// import { scrapeJobs } from '../services/scraper.js';

const router = express.Router();

// @route   GET api/jobs/search
// @desc    Search for jobs (potentially scraped) - Kept for general search later
// @access  Private (or Public, depending on your requirements)
router.get('/search', checkJwt, async (req, res) => {
    const { keywords, location, source } = req.query; // Get search parameters

    try {
        console.log(`Searching jobs with keywords: ${keywords}, location: ${location}, source: ${source}`);

        // Build query object dynamically
        const query = {};
        if (keywords) {
            // Case-insensitive search on title and description
            query.$or = [
                { title: { $regex: keywords, $options: 'i' } },
                { description: { $regex: keywords, $options: 'i' } }
                // Add more fields to search if needed (e.g., skills array)
            ];
        }
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        if (source) {
            query.source = { $regex: source, $options: 'i' }; // Allow partial match for source if desired
            // Or exact match: query.source = source;
        }

        // Execute the query against the JobPosting collection
        // Add .limit() for pagination in a real search feature
        const jobs = await JobPosting.find(query).sort({ scrapedAt: -1 }).limit(50); // Sort by newest, limit results

        console.log(`Found ${jobs.length} jobs matching search criteria.`);
        res.json(jobs);

    } catch (err) {
        console.error("Error searching jobs:", err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/jobs/recommendations
// @desc    Get personalized job recommendations based on user's resume skills
// @access  Private
router.get('/recommendations', checkJwt, async (req, res) => {
    const auth0Id = req.auth.payload.sub;

    try {
        console.log(`Fetching recommendations for user: ${auth0Id}`);

        // 1. Fetch User Profile with resumeData.skills
        const user = await User.findOne({ auth0Id }).select('resumeData.skills'); // Select only skills

        if (!user) {
            console.log(`User not found for recommendations: ${auth0Id}`);
            return res.status(404).json({ message: 'User profile not found.' });
        }

        // 2. Check if resume data/skills exist
        const userSkills = user.resumeData?.skills; // Optional chaining
        if (!userSkills || userSkills.length === 0) {
            console.log(`No resume data or skills found for user: ${auth0Id}`);
            // Return empty array instead of error, frontend handles "no recommendations" message
            return res.json([]);
            // Or return error: return res.status(400).json({ message: 'Please upload a resume with extracted skills to get recommendations.' });
        }

        // 3. Prepare skills for query (lowercase and escape regex characters if needed)
        // Basic approach: case-insensitive match using regex
        const skillRegexes = userSkills.map(skill => new RegExp(skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')); // Escape special chars, case-insensitive
        console.log(`User skills for matching: ${userSkills.join(', ')}`);

        // 4. Query JobPostings collection
        // Find jobs where the 'title' or 'description' contains ANY of the user's skills
        // This is a basic matching strategy, can be refined later (e.g., matching dedicated skill fields)
        const recommendedJobs = await JobPosting.find({
            $or: [
                { title: { $in: skillRegexes } },
                { description: { $in: skillRegexes } }
                // Add more fields if relevant, e.g., a dedicated 'requiredSkills' array if you scrape that
                // { requiredSkills: { $in: skillRegexes } }
            ]
        })
        .sort({ scrapedAt: -1 }) // Prioritize newer postings
        .limit(20); // Limit the number of recommendations returned

        console.log(`Found ${recommendedJobs.length} recommended jobs for user: ${auth0Id}`);

        // 5. Return Recommendations
        res.json(recommendedJobs);

    } catch (err) {
        console.error(`Error fetching recommendations for user ${auth0Id}:`, err);
        res.status(500).send('Server Error');
    }
});

export default router;
