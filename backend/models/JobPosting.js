import mongoose from 'mongoose';

const JobPostingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    company: {
        type: String,
    },
    location: {
        type: String,
    },
    description: {
        type: String,
    },
    url: { // Link to the original job posting
        type: String,
        required: true,
        unique: true, // Avoid duplicates from scraping
    },
    source: { // Where the job was scraped from (e.g., 'LinkedIn', 'Indeed')
        type: String,
    },
    scrapedAt: {
        type: Date,
        default: Date.now,
    },
    // Add fields relevant for matching/recommendations
});

JobPostingSchema.index({ title: 'text', description: 'text', company: 'text' }); // Example text index for searching

export default mongoose.model('JobPosting', JobPostingSchema);
