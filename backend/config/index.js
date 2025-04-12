import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

export default {
    port: process.env.PORT || 5001,
    mongodbUri: process.env.MONGO_URI,
    auth0: {
        domain: process.env.AUTH0_DOMAIN,
        audience: process.env.AUTH0_AUDIENCE,
    },
    geminiApiKey: process.env.GEMINI_API_KEY,
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    listenNotesApiKey: process.env.LISTEN_NOTES_API_KEY,
    // Add other config values as needed
};
