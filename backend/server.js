import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import connectDB from './config/db.js';

// Import routes
import userRoutes from './routes/users.js';
import recommendationRoutes from './routes/recommendations.js';
// import authRoutes from './routes/auth.js'; // If needed
// import jobRoutes from './routes/jobs.js'; // If needed

// Connect to Database
connectDB();

const app = express();

// Init Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json({ extended: false })); // Body parser for JSON

// Define Routes
app.get('/', (req, res) => res.send('LuckIn API Running')); // Simple health check
app.use('/api/users', userRoutes);
app.use('/api/recommendations', recommendationRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/jobs', jobRoutes);

// Basic Error Handling (can be expanded)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


const PORT = config.port;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
