import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

import connectDB from './config/db.js'; // Assuming you have db connection logic

// Import routes
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js'; // Import new route
import recommendationRoutes from './routes/recommendations.js'; // Import new route
import jobRoutes from './routes/jobs.js'; // Import new route


connectDB(); // Connect to MongoDB

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN_URL;

if (!clientOrigin) {
    console.warn('WARN: CLIENT_ORIGIN_URL environment variable is not set!');
}

// Define the allowed origin (your GitHub Pages URL)
const allowedOrigins = [
    'http://localhost:3000', // Your local frontend origin
    // Add any other origins you need to allow (like your deployed frontend)
    'https://abisoyeonanuga.github.io/'
];

const corsOptions = {
  origin: clientOrigin,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser compatibility
};


// Middleware
app.use(cors(corsOptions)); // Enable CORS for frontend requests
app.use(express.json()); // Body parser for JSON requests

// Define API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes); // Use new route
app.use('/api/recommendations/podcasts', recommendationRoutes); // Use new route
app.use('/api/jobs', jobRoutes); // Use new route

// Basic route
app.get('/', (req, res) => res.send('LuckIn API Running'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
