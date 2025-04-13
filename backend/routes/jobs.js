import express from 'express';
import checkJwt from '../middleware/checkJwt.js'; // Decide if job searching requires login
import User from '../models/User.js';
import JobPosting from '../models/JobPosting.js'; // <-- Import JobPosting model
import { getJobRelevanceScore } from '../services/geminiService.js'; // <-- Import the new service

// Import necessary controllers or service functions later
// import * as jobController from '../controllers/jobController.js';
// import { scrapeJobs } from '../services/scraper.js';

const router = express.Router();

const INITIAL_CANDIDATE_LIMIT = 50; // How many jobs to fetch from DB initially
const AI_PROCESSING_LIMIT = 10; // How many top candidates to send to Gemini
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const DELAY_BETWEEN_AI_CALLS_MS = 500; // e.g., 500ms delay

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
// @desc    Get personalized job recommendations using AI relevance scoring
// @access  Private
router.get('/recommendations', checkJwt, async (req, res) => {
    const auth0Id = req.auth.payload.sub;

    try {
        console.log(`Fetching recommendations for user: ${auth0Id}`);

        // 1. Fetch User Profile skills
        const user = await User.findOne({ auth0Id }).select('resumeData.skills');
        if (!user) return res.status(404).json({ message: 'User profile not found.' });

        const userSkills = user.resumeData?.skills;
        if (!userSkills || userSkills.length === 0) {
            console.log(`No skills found for user ${auth0Id}. Returning empty recommendations.`);
            return res.json([]);
        }
        console.log(`User skills for matching: ${userSkills.join(', ')}`);

        // 2. Initial Candidate Filtering from DB
        const skillRegexes = userSkills.map(skill => new RegExp(skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));

        console.log(`Fetching initial candidates from DB (limit ${INITIAL_CANDIDATE_LIMIT})...`);
        const initialCandidates = await JobPosting.find({
            $or: [
                { title: { $in: skillRegexes } },
                { description: { $in: skillRegexes } }
            ]
        })
        .sort({ scrapedAt: -1 })
        .limit(INITIAL_CANDIDATE_LIMIT)
        .lean();

        if (initialCandidates.length === 0) {
            console.log("No initial candidates found based on skill keywords.");
            return res.json([]);
        }
        console.log(`Found ${initialCandidates.length} initial candidates.`);

        // 3. Select Top N for AI Processing <-- Define candidatesForAI here!
        const candidatesForAI = initialCandidates.slice(0, AI_PROCESSING_LIMIT);
        // -------------------------------------------------------------------

        // 4. Call Gemini Sequentially with Delays
        console.log(`Processing top ${candidatesForAI.length} candidates with Gemini (with delays)...`);

        const jobsWithRelevance = []; // Initialize array to store results
        for (const job of candidatesForAI) { // <-- Now iterates over the correct variable
            try {
                const relevance = await getJobRelevanceScore(userSkills, job.title, job.description);
                jobsWithRelevance.push({
                    ...job,
                    aiRelevance: relevance
                });
                // Wait before the next call
                if (candidatesForAI.indexOf(job) < candidatesForAI.length - 1) {
                    console.log(`Waiting ${DELAY_BETWEEN_AI_CALLS_MS / 1000}s...`);
                    await delay(DELAY_BETWEEN_AI_CALLS_MS);
                }
            } catch (aiError) {
                console.error(`Error getting AI score for job ${job._id}:`, aiError.message);
                jobsWithRelevance.push({ ...job, aiRelevance: null });
            }
        }

        // 5. Filter and Sort based on AI Score
        const finalRecommendations = jobsWithRelevance
            .filter(job => job.aiRelevance && job.aiRelevance.score >= 0.3)
            .sort((a, b) => (b.aiRelevance?.score || 0) - (a.aiRelevance?.score || 0));

        console.log(`Returning ${finalRecommendations.length} AI-ranked recommendations.`);

        // 6. Return Final Recommendations
        res.json(finalRecommendations);

    } catch (err) {
        console.error(`Error fetching recommendations for user ${auth0Id}:`, err);
        res.status(500).json({ message: 'Server error fetching recommendations.' });
    }
});

export default router;
