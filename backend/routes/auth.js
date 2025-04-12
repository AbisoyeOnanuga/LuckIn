import express from 'express';
import checkJwt from '../middleware/checkJwt.js'; // Import Auth0 middleware if needed for specific routes

const router = express.Router();

// Example: A protected route to check if the token is valid from the backend perspective
// Might not be strictly necessary if frontend handles most auth state.
router.get('/verify', checkJwt, (req, res) => {
    // If checkJwt passes, the token is valid
    console.log('Token verified for user:', req.auth.payload.sub);
    res.json({ message: 'Token is valid', user_id: req.auth.payload.sub });
});

// Add other auth-related backend routes if needed (e.g., handling specific callbacks, refresh tokens)

export default router;
