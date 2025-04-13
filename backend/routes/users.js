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
    console.log("GET /api/users/profile route hit.");
    try {
        console.log("Auth0 Token Payload Received:", JSON.stringify(req.auth?.payload, null, 2));

        const auth0Id = req.auth?.payload?.sub;

        if (!auth0Id) {
            console.error("Error in GET /profile: Auth0 ID (sub) missing from token payload.");
            return res.status(401).json({ message: 'Authentication payload invalid.' });
        }
        console.log(`Attempting to find user with auth0Id: ${auth0Id}`);

        let user = await User.findOne({ auth0Id });

        if (!user) {
            console.log(`User not found for auth0Id: ${auth0Id}. Attempting to create...`);

            // --- Read namespaced custom claims ---
            // Define the namespace used in your Auth0 Action
            const namespace = 'https://luckin-app.com/'; // Make sure this matches your Action!

            const email = req.auth.payload[`${namespace}email`]; // Read namespaced email
            const name = req.auth.payload[`${namespace}name`];   // Read namespaced name
            const picture = req.auth.payload[`${namespace}picture`]; // Read namespaced picture
            // ------------------------------------

            console.log(`Creating user with: email=${email}, name=${name}, picture=${picture ? 'present' : 'missing'}`);

            // Check if email (read from custom claim) is missing
            if (!email) {
               console.error(`Cannot create user for auth0Id ${auth0Id}: Email claim ('${namespace}email') is missing from Auth0 token payload. Check Auth0 Action and user profile.`);
               // It's crucial the Action runs and the user has an email in Auth0
               return res.status(400).json({ message: 'Cannot create user profile, email missing from token.' });
            }

            user = new User({
                auth0Id: auth0Id,
                email: email, // Use email from custom claim
                name: name,   // Use name from custom claim (can be null/undefined if not present)
                picture: picture, // Use picture from custom claim (can be null/undefined)
                careerGoals: [],
                resumeData: null,
                resumeFilename: null,
            });

            try {
                await user.save();
                console.log(`Successfully created and saved new user for auth0Id: ${auth0Id}`);
            } catch (saveError) {
                console.error(`Error saving new user for auth0Id: ${auth0Id}`, saveError);
                return res.status(500).json({ message: 'Failed to save new user profile.', error: saveError.message });
            }
        } else {
            console.log(`User found for auth0Id: ${auth0Id}`);
        }

        res.json(user);

    } catch (err) {
        console.error("Error in GET /api/users/profile handler:", err);
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
        console.log(`Attempting to update user with auth0Id: ${auth0Id}`); // <-- ADD THIS LINE
        console.log('Updating user document in MongoDB with parsed data...');
        const updatedUser = await User.findOneAndUpdate(
            { auth0Id },
            {
                $set: {
                    resumeData: parsedData,
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

// @route   PUT api/users/profile/goals
// @desc    Update user's career goals
// @access  Private
router.put('/profile/goals', checkJwt, async (req, res) => {
    const auth0Id = req.auth.payload.sub;
    const { careerGoals } = req.body; // Expect an array of strings

    // Basic validation
    if (!Array.isArray(careerGoals)) {
        return res.status(400).json({ message: 'Invalid input: careerGoals must be an array.' });
    }
    // Optional: Further validation (e.g., check if array elements are strings)
    if (!careerGoals.every(goal => typeof goal === 'string')) {
         return res.status(400).json({ message: 'Invalid input: all career goals must be strings.' });
    }

    console.log(`Updating career goals for user ${auth0Id}:`, careerGoals);

    try {
        // Find the user and update their goals
        // Use findOneAndUpdate to get the updated document back if needed
        const updatedUser = await User.findOneAndUpdate(
            { auth0Id: auth0Id },
            { $set: { careerGoals: careerGoals } },
            { new: true, // Return the modified document
              select: 'careerGoals' // Only select the updated field for the response
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        console.log(`Successfully updated goals for user ${auth0Id}`);

        // Send back a success response with the updated goals (or just a success message)
        res.json({
            message: 'Career goals updated successfully.',
            // Include the updated profile part for the frontend to use
            updatedProfile: {
                careerGoals: updatedUser.careerGoals
            }
        });

    } catch (error) {
        console.error(`Error updating career goals for user ${auth0Id}:`, error);
        res.status(500).json({ message: 'Server error updating career goals.' });
    }
});

// Add other user-related routes if needed

export default router;
