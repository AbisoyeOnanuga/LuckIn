import express from 'express';
import checkJwt from '../middleware/checkJwt.js'; // Recommendations are personalized, require login
// Import necessary controllers or service functions later
// import * as recommendationController from '../controllers/recommendationController.js';

const router = express.Router();

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
// @desc    Get podcast recommendations based on user profile (using Spotify via RapidAPI)
// @access  Private
router.get('/podcasts', checkJwt, async (req, res) => {
    const auth0Id = req.auth.payload.sub;
    const MAX_PODCASTS = 10; // Limit the number of results

    try {
        console.log(`Fetching Spotify podcast recommendations for user: ${auth0Id}`);

        // 1. Fetch User Profile skills and goals (remains the same)
        const user = await User.findOne({ auth0Id }).select('resumeData.skills careerGoals');
        if (!user) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const userSkills = user.resumeData?.skills || [];
        const userGoals = user.careerGoals || [];

        if (userSkills.length === 0 && userGoals.length === 0) {
            console.log(`No skills or goals found for user ${auth0Id}. Cannot generate podcast recommendations.`);
            return res.json([]);
        }

        // 2. Generate Search Terms (remains the same)
        let searchTerms = [...userGoals, ...userSkills];
        searchTerms = searchTerms.filter(term => term && term.length > 2);
        searchTerms = [...new Set(searchTerms)];
        const query = searchTerms.slice(0, 5).join(' OR '); // Combine top terms

        if (!query) {
             console.log(`Could not generate a valid search query for user ${auth0Id}.`);
             return res.json([]);
        }

        console.log(`Generated Spotify search query for user ${auth0Id}: "${query}"`);

        // 3. Call Spotify Search Service (using the new function)
        const podcasts = await searchSpotifyPodcasts(query, MAX_PODCASTS); // <-- Call the new function

        // 4. Return Formatted Results
        console.log(`Returning ${podcasts.length} Spotify podcast recommendations for user ${auth0Id}.`);
        res.json(podcasts); // Send the results from Spotify

    } catch (err) {
        console.error(`Error fetching Spotify podcast recommendations for user ${auth0Id}:`, err);
        // Check if it's a specific error thrown from the service
        if (err.message.includes("Spotify API") || err.message.includes("RapidAPI")) {
             // Use a more generic message for the client, but log details server-side
             res.status(502).json({ message: `Failed to fetch from Spotify (RapidAPI): ${err.message}` }); // Bad Gateway
        } else {
             res.status(500).json({ message: 'Server error fetching podcast recommendations.' });
        }
    }
});

// You might add more specific routes later, e.g.:
// router.get('/playlists', checkJwt, recommendationController.getPlaylistRecommendations);
// router.get('/courses', checkJwt, recommendationController.getCourseRecommendations);

export default router;
