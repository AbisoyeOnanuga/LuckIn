import express from 'express';
import multer from 'multer'; // <-- Import multer
import checkJwt from '../middleware/checkJwt.js'; // Import Auth0 middleware
import User from '../models/User.js'; // Import User model
import { processResumeWithGemini } from '../services/geminiService.js';
// Import controllers later if you separate logic
// import * as userController from '../controllers/userController.js';

const router = express.Router();

// --- Multer Configuration for Resume Upload ---
const storage = multer.memoryStorage(); // Store file in memory for processing
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    // Accept only PDF and DOCX files
    if (file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true); // Accept file
    } else {
      // Reject file with a specific error message
      cb(new Error('Invalid file type. Only PDF and DOCX allowed.'), false);
    }
  }
});


// @route   GET api/users/profile
// @desc    Get current user's profile (or create if doesn't exist)
// @access  Private (Requires Auth0 token)
router.get('/profile', checkJwt, async (req, res) => {
    try {
        const auth0Id = req.auth.payload.sub; // Get user ID from verified token

        let user = await User.findOne({ auth0Id });

        if (!user) {
            // If user doesn't exist in DB, create them
            console.log(`Creating new user profile for auth0Id: ${auth0Id}`);
            user = new User({
                auth0Id: auth0Id,
                // Safely access payload properties
                email: req.auth.payload.email,
                name: req.auth.payload.name,
                picture: req.auth.payload.picture,
                // Initialize other fields if necessary
                careerGoals: [],
                resumeData: null,
                resumeFilename: null,
            });
            await user.save();
        }

        res.json(user);
    } catch (err) {
        console.error("Error fetching/creating user profile:", err); // Log the full error
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/profile
// @desc    Update user's profile (e.g., goals)
// @access  Private
router.put('/profile', checkJwt, async (req, res) => {
    // Destructure expected fields from body
    const { name, careerGoals, /* other updatable fields */ } = req.body;
    const auth0Id = req.auth.payload.sub;

    // Build update object dynamically
    const profileFields = {};
    if (name !== undefined) profileFields.name = name;
    if (careerGoals !== undefined) profileFields.careerGoals = careerGoals;
    // Add other fields here...

    // Only proceed if there are fields to update
    if (Object.keys(profileFields).length === 0) {
        return res.status(400).json({ msg: 'No fields provided for update.' });
    }

    try {
        // Find user and update in one step, return the updated document
        const updatedUser = await User.findOneAndUpdate(
            { auth0Id },
            { $set: profileFields },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );

        if (!updatedUser) {
            // This case might happen if the user was deleted between token issuance and request
            return res.status(404).json({ msg: 'User profile not found' });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("Error updating user profile:", err); // Log the full error
        // Handle potential validation errors from Mongoose
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation Error', errors: err.errors });
        }
        res.status(500).send('Server Error');
    }
});


// @route   POST api/users/upload-resume
// @desc    Upload and process user's resume
// @access  Private
router.post(
    '/upload-resume',
    checkJwt,
    (req, res, next) => {
        upload.single('resumeFile')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error("Multer error:", err);
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        } else if (err) {
            console.error("File filter error:", err);
            return res.status(400).json({ message: err.message });
        }
        next();
        });
    },
    async (req, res) => {
        try {
        if (!req.file) {
            return res.status(400).json({ message: 'No resume file uploaded or file rejected.' });
        }

        const auth0Id = req.auth?.payload?.sub;
        if (!auth0Id) {
            console.error("Auth0 ID missing after checkJwt middleware");
            return res.status(401).json({ message: 'Authentication failed.' });
        }

        console.log(`Received resume file: ${req.file.originalname} for user ${auth0Id}`);
        console.log(`File size: ${req.file.size} bytes`);
        console.log(`File MIME type: ${req.file.mimetype}`); // Log MIME type

        // --- Call Gemini API Processing Service ---
        console.log('Processing resume content with Gemini API...');
        // Pass the file buffer and mime type to the service function
        const parsedData = await processResumeWithGemini(req.file.buffer, req.file.mimetype);
        console.log('Received parsed data from Gemini service.');

        // Check if Gemini processing returned an error object (our fallback case)
        if (parsedData.error) {
            console.error("Gemini processing failed:", parsedData.error, parsedData.rawText);
            // Decide how to handle this - maybe still save the filename but indicate parsing failed?
            // For now, let's return an error to the user.
            return res.status(500).json({ message: 'Failed to parse resume content.', details: parsedData.error });
        }

        // --- Update User Document in MongoDB ---
        console.log('Updating user document in MongoDB with parsed data...');
        const updatedUser = await User.findOneAndUpdate(
            { auth0Id },
            {
                $set: {
                    resumeData: parsedData, // Store the actual parsed data from Gemini
                    resumeFilename: req.file.originalname,
                    resumeLastUploaded: new Date()
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            console.error(`User not found for update after resume upload: ${auth0Id}`);
            return res.status(404).json({ message: 'User profile not found for update.' });
        }

        console.log('Resume data saved successfully for user:', auth0Id);

        // Send success response
        res.status(200).json({
            message: 'Resume uploaded and processed successfully.',
            filename: req.file.originalname,
            updatedProfile: {
                resumeFilename: updatedUser.resumeFilename,
                resumeLastUploaded: updatedUser.resumeLastUploaded,
                resumeData: updatedUser.resumeData // Send back the parsed data
            }
        });

        } catch (error) {
        // Catch errors from Gemini service or MongoDB update
        console.error('Error processing resume upload route:', error);
        // Send a generic server error, or more specific if possible
        res.status(500).json({ message: `Server error during resume processing: ${error.message}` });
        }
    }
);


// Add other user-related routes if needed

export default router;
