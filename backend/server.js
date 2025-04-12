import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js'; // Assuming you have db connection logic

// Import routes
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js'; // Import new route
import recommendationRoutes from './routes/recommendations.js'; // Import new route
import jobRoutes from './routes/jobs.js'; // Import new route

dotenv.config(); // Load environment variables from .env file

connectDB(); // Connect to MongoDB

const app = express();

// Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // Body parser for JSON requests

// Define API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes); // Use new route
app.use('/api/recommendations', recommendationRoutes); // Use new route
app.use('/api/jobs', jobRoutes); // Use new route

// Basic route
app.get('/', (req, res) => res.send('LuckIn API Running'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
