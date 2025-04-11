import { GoogleGenerativeAI } from "@google/generative-ai";
import config from '../config/index.js';

// Ensure API key is configured
if (!config.geminiApiKey) {
    console.warn("Gemini API Key not found. Gemini features will be disabled.");
}

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-pro"}) : null; // Or choose another appropriate model

/**
 * Analyzes text using the Gemini API.
 * @param {string} text - The text to analyze (e.g., resume, job description).
 * @returns {Promise<string>} - The analysis result from Gemini.
 */
export const analyzeText = async (text) => {
    if (!model) {
        throw new Error("Gemini API is not configured.");
    }
    try {
        // Example prompt - customize this significantly for your needs
        const prompt = `Analyze the following text for career coaching purposes. Identify key skills, potential career paths, and areas for improvement:\n\n${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysis = response.text();
        console.log("Gemini Analysis:", analysis); // Log for debugging
        return analysis;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get analysis from Gemini API.");
    }
};

/**
 * Generates recommendations based on user profile and goals.
 * @param {object} userProfile - The user's profile data.
 * @param {Array<string>} careerGoals - The user's stated career goals.
 * @returns {Promise<object>} - Structured recommendations (e.g., { skillsToDevelop: [], suggestedRoles: [] }).
 */
export const generateRecommendations = async (userProfile, careerGoals) => {
     if (!model) {
        throw new Error("Gemini API is not configured.");
    }
    try {
        // Example prompt - This needs significant refinement!
        const prompt = `Based on this user profile: ${JSON.stringify(userProfile)} and their goals: ${careerGoals.join(', ')}, provide personalized career recommendations. Suggest specific skills to develop, relevant job titles to explore, and potential learning resources. Format the output as a JSON object with keys like "skillsToDevelop", "suggestedRoles", "learningResourceTypes".`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let recommendations = response.text();

         // Attempt to parse the response as JSON
         try {
            // Clean potential markdown ```json ... ```
            recommendations = recommendations.replace(/^```json\s*|```$/g, '').trim();
            return JSON.parse(recommendations);
        } catch (parseError) {
            console.error("Gemini response was not valid JSON:", recommendations);
            // Fallback or re-prompting logic could go here
            throw new Error("Failed to parse recommendations from Gemini API.");
        }
    } catch (error) {
        console.error("Error calling Gemini API for recommendations:", error);
        throw new Error("Failed to get recommendations from Gemini API.");
    }
};

// Add more functions as needed for different Gemini interactions
