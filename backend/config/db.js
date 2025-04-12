import mongoose from 'mongoose';
import config from './index.js';

const connectDB = async () => {
    // Explicitly get the URI from the imported config
    const mongoUri = config.mongodbUri;

    // Check if the MongoDB URI is actually defined
    if (!mongoUri) {
        console.error('MongoDB connection error: MONGO_URI is not defined in the configuration.');
        process.exit(1); // Exit if URI is missing
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

export default connectDB;
