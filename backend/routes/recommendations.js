import express from 'express';
import checkJwt from '../middleware/checkJwt.js'; // Recommendations are personalized, require login
import User from '../models/User.js';
import { searchPodcastEpisodes } from '../services/podcastSearchService.js';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import Gemini
import config from '../config/index.js'; // Import config to get API key

const router = express.Router();

// --- Initialize Gemini ---
let genAI;
let geminiModel;
if (config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash"}); // Or your preferred model
    console.log("Gemini AI initialized for podcast recommendations.");
} else {
    console.warn("Gemini API Key not found. Podcast query enhancement disabled.");
}
// --- ---

// @route   GET api/recommendations/all
// @desc    Get all types of recommendations for the logged-in user
// @access  Private
router.get('/all', checkJwt, async (req, res) => {
    const userId = req.auth.payload.sub; // Get user ID from token
    try {
        console.log(`Fetching recommendations for user: ${userId}`);
        // TODO: Implement logic to fetch user profile/goals from DB
        // TODO: Call Gemini API for analysis/suggestions
        // TODO: Call Spotify, Listen Notes, Coursera/Udemy APIs based on analysis
        // TODO: Aggregate and format the recommendations

        // Placeholder response
        const recommendations = {
            playlists: [{ id: 'spotify1', name: 'Focus Flow', source: 'Spotify' }],
            podcasts: [{ id: 'listen1', name: 'Career Growth Talks', source: 'Listen Notes' }],
            courses: [{ id: 'course1', name: 'Project Management Fundamentals', source: 'Coursera' }],
        };

        res.json(recommendations);
    } catch (err) {
        console.error("Error fetching recommendations:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/recommendations/podcasts
// @desc    Get podcast recommendations based on user profile (using Listen Notes API)
// @access  Private
router.get('/podcasts', checkJwt, async (req, res) => {
    console.log('--- Request received for /api/recommendations/podcasts ---');
    const auth0Id = req.auth.payload.sub;
    const MAX_PODCASTS = 10;

    try {
        console.log(`Fetching podcast recommendations for user: ${auth0Id}`);

        // 1. Fetch User Profile skills and goals
        const user = await User.findOne({ auth0Id }).select('resumeData.skills careerGoals');
        if (!user) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const userSkills = user.resumeData?.skills || [];
        const userGoals = user.careerGoals || [];
        const profileKeywords = [...new Set([...userGoals, ...userSkills])].filter(term => term && term.length > 2); // Combine and clean

        if (profileKeywords.length === 0) {
            console.log(`No valid skills or goals found for user ${auth0Id}. Cannot generate podcast recommendations.`);
            return res.json([]);
        }

        console.log(`User profile keywords for Gemini: ${profileKeywords.join(', ')}`);

        // 2. Generate Search Terms using Gemini (if available)
        let finalQuery = '';
        if (geminiModel) {
            try {
                // Construct a prompt for Gemini
                const prompt = `Based on the following skills and career interests: "${profileKeywords.join(', ')}", suggest 2-3 concise, relevant search topics suitable for finding podcast episodes. Focus on broader themes or professional areas. Examples: "Web Development Trends", "Data Analysis Techniques", "UI/UX Design Principles", "Digital Marketing Strategies", "Startup Growth". Output only the suggested topics separated by " OR ".`;

                console.log("Sending prompt to Gemini for podcast topics...");
                const result = await geminiModel.generateContent(prompt);
                const response = await result.response;
                const suggestedTopics = response.text().trim();

                if (suggestedTopics) {
                    finalQuery = suggestedTopics;
                    console.log(`Gemini suggested topics: "${finalQuery}"`);
                } else {
                    console.warn("Gemini did not return suggested topics. Falling back to raw keywords.");
                    // Fallback to the original method if Gemini fails or returns nothing
                    finalQuery = profileKeywords.slice(0, 5).join(' OR ');
                }
            } catch (err) {
                // --- Log the full error object for better debugging ---
                console.error(`Error fetching podcast recommendations for user ${auth0Id}:`, err);
                // --- ---
        
                // Check if it's a specific error thrown from the service or Gemini
                // Use optional chaining (?.) in case err.message is undefined
                if (err.message?.includes("Listen Notes API")) {
                     res.status(502).json({ message: `Failed to fetch from Listen Notes: ${err.message}` });
                } else if (err.message?.includes("Gemini")) { // Catch potential Gemini errors not handled above
                     res.status(502).json({ message: `Failed to process query with AI: ${err.message}` });
                }
                 else {
                     // Send back the generic message, but the detailed log above will help us
                     res.status(500).json({ message: 'Server error fetching podcast recommendations.' });
                }
            }
        } else {
             // Fallback if Gemini is not configured
             console.log("Gemini not configured. Using raw keywords for query.");
             finalQuery = profileKeywords.slice(0, 5).join(' OR ');
        }


        if (!finalQuery) {
             console.log(`Could not generate a valid search query for user ${auth0Id}.`);
             return res.json([]);
        }

        console.log(`Generated Listen Notes query for user ${auth0Id}: "${finalQuery}"`);

        // 3. Call Listen Notes Service with the (potentially enhanced) query
        // Make sure the function name matches your service file
        const podcastEpisodes = await searchPodcastEpisodes(finalQuery, MAX_PODCASTS);

        // 4. Return Formatted Results
        console.log(`Returning ${podcastEpisodes.length} podcast recommendations for user ${auth0Id}.`);
        res.json(podcastEpisodes);

    } catch (err) {
        console.error(`Error fetching podcast recommendations for user ${auth0Id}:`, err);
        // Check if it's a specific error thrown from the service or Gemini
        if (err.message.includes("Listen Notes API")) {
             res.status(502).json({ message: `Failed to fetch from Listen Notes: ${err.message}` });
        } else if (err.message.includes("Gemini")) { // Catch potential Gemini errors not handled above
             res.status(502).json({ message: `Failed to process query with AI: ${err.message}` });
        }
         else {
             res.status(500).json({ message: 'Server error fetching podcast recommendations.' });
        }
    }
});

// You might add more specific routes later, e.g.:
// router.get('/playlists', checkJwt, recommendationController.getPlaylistRecommendations);
// router.get('/courses', checkJwt, recommendationController.getCourseRecommendations);

export default router;
