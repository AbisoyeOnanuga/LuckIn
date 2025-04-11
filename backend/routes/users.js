import express from 'express';
import checkJwt from '../middleware/checkJwt.js'; // Import Auth0 middleware
import User from '../models/User.js'; // Import User model
// Import controllers later if you separate logic
// import * as userController from '../controllers/userController.js';

const router = express.Router();

// @route   GET api/users/profile
// @desc    Get current user's profile (or create if doesn't exist)
// @access  Private (Requires Auth0 token)
router.get('/profile', checkJwt, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub; // Get user ID from verified token

        let user = await User.findOne({ auth0Id });

        if (!user) {
            // If user doesn't exist in DB, create them (optional, based on your flow)
            // You might get email/name/picture from req.auth.payload if configured in Auth0
            console.log(`Creating new user profile for auth0Id: ${auth0Id}`);
            user = new User({
                auth0Id: auth0Id,
                email: req.auth.payload.email || 'email_not_provided', // Adjust based on available claims
                name: req.auth.payload.name,
                picture: req.auth.payload.picture,
            });
            await user.save();
        }

        res.json(user);
    } catch (err) {
        console.error("Error fetching/creating user profile:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/profile
// @desc    Update user's profile (e.g., goals, resume URL)
// @access  Private
router.put('/profile', checkJwt, async (req, res) => {
    const { name, careerGoals, resumeUrl /* other fields */ } = req.body;
    const auth0Id = req.auth.payload.sub;

    try {
        const user = await User.findOne({ auth0Id });
        if (!user) {
            return res.status(404).json({ msg: 'User profile not found' });
        }

        // Update fields if they are provided in the request body
        if (name !== undefined) user.name = name;
        if (careerGoals !== undefined) user.careerGoals = careerGoals;
        if (resumeUrl !== undefined) user.resumeUrl = resumeUrl; // Handle resume file upload separately if needed
        // Add other updatable fields

        user.updatedAt = Date.now(); // Manually update timestamp or use pre-save hook
        await user.save();

        res.json(user);
    } catch (err) {
        console.error("Error updating user profile:", err.message);
        res.status(500).send('Server Error');
    }
});

// Add other user-related routes (e.g., upload resume - requires file handling middleware like multer)

export default router;
