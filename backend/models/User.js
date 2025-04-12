import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    auth0Id: { // Store the unique identifier from Auth0 (e.g., 'sub' claim)
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
    },
    picture: {
        type: String, // URL to profile picture
    },
    resumeUrl: { // Placeholder for storing resume location (e.g., S3 URL)
        type: String,
    },
    careerGoals: {
        type: [String], // Array of strings representing goals
        default: [],
    },
    resumeFilename: {
        type: String,
        trim: true,
        default: null // Or just omit default if you prefer undefined
    },
    resumeLastUploaded: {
        type: Date,
        default: null
    },
    resumeData: { // Store the parsed JSON data from Gemini
        type: mongoose.Schema.Types.Mixed, // Use Mixed for flexible object structure
        default: null
    },
    // Add other profile fields as needed (skills, experience, etc.)
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Middleware to update `updatedAt` field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('User', UserSchema);
