import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"; // <-- Added HarmCategory and HarmBlockThreshold
import config from '../config/index.js';

// Ensure API key is configured
if (!config.geminiApiKey) {
    console.warn("Gemini API Key not found. Gemini features will be disabled.");
}

// Initialize the top-level client using the config
const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

// --- Existing Functions (analyzeText, generateRecommendations) ---

/**
 * Analyzes text using the Gemini API.
 * @param {string} text - The text to analyze (e.g., resume, job description).
 * @returns {Promise<string>} - The analysis result from Gemini.
 */
export const analyzeText = async (text) => {
    if (!genAI) { // Check the top-level genAI instance
        throw new Error("Gemini API client is not initialized (missing API key).");
    }
    const model = genAI.getGenerativeModel({ model: "gemini-pro"}); // Get model instance here
    try {
        const prompt = `Analyze the following text for career coaching purposes. Identify key skills, potential career paths, and areas for improvement:\n\n${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Check for valid response before accessing text()
        if (!response || !response.text) {
             console.error("Gemini Error: Invalid response object received for analyzeText.", response);
             throw new Error("Gemini API returned an invalid response.");
        }
        const analysis = response.text();
        console.log("Gemini Analysis:", analysis);
        return analysis;
    } catch (error) {
        console.error("Error calling Gemini API for text analysis:", error);
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
     if (!genAI) { // Check the top-level genAI instance
        throw new Error("Gemini API client is not initialized (missing API key).");
    }
    const model = genAI.getGenerativeModel({ model: "gemini-pro"}); // Get model instance here
    try {
        const prompt = `Based on this user profile: ${JSON.stringify(userProfile)} and their goals: ${careerGoals.join(', ')}, provide personalized career recommendations. Suggest specific skills to develop, relevant job titles to explore, and potential learning resources. Format the output as a JSON object with keys like "skillsToDevelop", "suggestedRoles", "learningResourceTypes". Ensure the output is only the JSON object.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        // More robust response checking
        if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0 || !response.candidates[0].content.parts[0].text) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            const safetyRatings = response?.candidates?.[0]?.safetyRatings;
            console.error("Gemini Error: No valid content part received for recommendations.", { finishReason, safetyRatings, response });
            if (response?.promptFeedback?.blockReason) {
                 console.error(`Gemini Prompt Blocked: ${response.promptFeedback.blockReason}`, response.promptFeedback.safetyRatings);
                 throw new Error(`Content generation blocked due to: ${response.promptFeedback.blockReason}`);
            }
            throw new Error("Gemini API returned an invalid or empty response for recommendations.");
        }

        let recommendationsText = response.candidates[0].content.parts[0].text;

         try {
            recommendationsText = recommendationsText.replace(/^```json\s*|```$/g, '').trim();
            return JSON.parse(recommendationsText);
        } catch (parseError) {
            console.error("Gemini response was not valid JSON:", recommendationsText);
            throw new Error("Failed to parse recommendations from Gemini API as JSON.");
        }
    } catch (error) {
        console.error("Error calling Gemini API for recommendations:", error);
        // Avoid throwing generic error if a specific one was already thrown
        if (!error.message.startsWith("Gemini") && !error.message.startsWith("Content generation blocked")) {
             throw new Error("Failed to get recommendations from Gemini API.");
        } else {
            throw error; // Re-throw specific errors
        }
    }
};


// --- NEW Function for Resume Processing ---

/**
 * Processes resume file content using the Gemini API to extract structured data.
 * @param {Buffer} fileBuffer - The resume file content as a Buffer.
 * @param {string} mimeType - The MIME type of the file (e.g., 'application/pdf').
 * @returns {Promise<object>} - A JSON object containing the extracted resume data.
 */
export const processResumeWithGemini = async (fileBuffer, mimeType) => {
    if (!genAI) { // Check the top-level genAI instance
        throw new Error("Gemini API client is not initialized (missing API key).");
    }
    if (!fileBuffer || !mimeType) {
        throw new Error("File buffer and mimeType are required for resume processing.");
    }

    // Configuration specific to resume parsing
    const generationConfig = {
        temperature: 0.2,
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192, // Use a higher limit for potentially long resumes with gemini-1.5-flash
    };
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // Use a model suitable for file processing (like gemini-1.5-flash)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings, generationConfig });

    const prompt = `
        Analyze the following resume document. Extract the following information in JSON format:
        1.  "contactInfo": { "name": "...", "email": "...", "phone": "...", "linkedin": "..." (if available), "portfolio": "..." (if available), "location": "..." (city/state if available) }
        2.  "summary": A brief professional summary or objective statement (string).
        3.  "skills": An array of key technical and soft skills mentioned (array of strings).
        4.  "experience": An array of objects, where each object represents a job position with keys: "title", "company", "duration" (string, e.g., "Jan 2020 - Present" or "2019 - 2021"), "location" (if available), "responsibilities" (an array of strings or a single string summarizing duties).
        5.  "education": An array of objects, where each object represents an educational qualification with keys: "degree", "major" (if available), "institution", "graduationYear" (string or number).
        6.  "certifications": An array of strings listing any certifications mentioned.
        7.  "projects": An array of objects describing personal or academic projects, with keys: "name", "description", "technologies" (array of strings).

        Ensure the output is ONLY the raw JSON object, without any introductory text, explanations, or markdown formatting like \`\`\`json ... \`\`\`.
        If specific information (like LinkedIn URL, certifications, projects) isn't found, use null or an empty array/object as appropriate within the JSON structure. Be precise in extracting details like job responsibilities.
    `;

    const parts = [
        { text: prompt },
        {
            inlineData: {
                mimeType: mimeType,
                data: fileBuffer.toString("base64"), // Convert buffer to base64
            },
        },
    ];

    try {
        console.log(`Sending resume (${mimeType}) to Gemini 1.5 Flash for processing...`);
        const result = await model.generateContent({ contents: [{ role: "user", parts }] });

        if (!result.response) {
            console.error("Gemini API Error: No response received for resume processing.");
            throw new Error("Gemini API did not return a response.");
        }

        const response = result.response;

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0 || !response.candidates[0].content.parts[0].text) {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.candidates?.[0]?.safetyRatings;
            console.error("Gemini Error: No valid content part received for resume.", { finishReason, safetyRatings, response });
            if (response.promptFeedback?.blockReason) {
                 console.error(`Gemini Prompt Blocked: ${response.promptFeedback.blockReason}`, response.promptFeedback.safetyRatings);
                 throw new Error(`Content generation blocked due to: ${response.promptFeedback.blockReason}`);
            }
            throw new Error("Gemini did not generate any content or response was blocked for resume.");
        }

        const generatedText = response.candidates[0].content.parts[0].text;
        console.log("Raw response text from Gemini (Resume):", generatedText.substring(0, 500) + "..."); // Log snippet

        try {
            const cleanedText = generatedText.replace(/^```json\s*|```$/g, '').trim();
            const parsedJson = JSON.parse(cleanedText);
            console.log("Successfully parsed JSON from Gemini (Resume).");
            return parsedJson;
        } catch (parseError) {
            console.error("Error parsing JSON response from Gemini (Resume):", parseError);
            console.error("Gemini raw text (Resume) was:", generatedText);
            // Return an object indicating the failure, including the raw text for debugging
            return { error: "Failed to parse Gemini response as JSON.", rawText: generatedText };
        }

    } catch (error) {
        console.error("Error calling Gemini API for resume processing:", error);
         // Avoid throwing generic error if a specific one was already thrown
        if (!error.message.startsWith("Gemini") && !error.message.startsWith("Content generation blocked")) {
            throw new Error(`Gemini API resume processing failed: ${error.message}`);
        } else {
            throw error; // Re-throw specific errors
        }
    }
};


// --- NEW Function for Job Relevance Scoring ---

/**
 * Asks Gemini to evaluate the relevance of a job based on user skills.
 * @param {string[]} userSkills - Array of skills from the user's resume.
 * @param {string} jobTitle - The title of the job posting.
 * @param {string} jobDescriptionSnippet - The description snippet from the job posting.
 * @returns {Promise<{score: number, explanation: string} | null>} - Relevance score (0-1) and explanation, or null on error/invalid response.
 */
export const getJobRelevanceScore = async (userSkills, jobTitle, jobDescriptionSnippet) => {
    // Check if Gemini client is initialized
    if (!genAI) {
        console.error("Gemini API client is not initialized (missing API key). Skipping relevance check.");
        return null; // Or return a default score/object
    }
    // Basic input validation
    if (!userSkills || userSkills.length === 0 || !jobTitle || !jobDescriptionSnippet) {
        console.warn("Missing data for relevance check (skills, title, or description). Skipping.");
        return null;
    }

    // Configuration for this specific task (JSON output, moderate temperature)
    const generationConfig = {
        temperature: 0.5,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 1024, // Should be sufficient for score + explanation
        responseMimeType: "application/json", // Request JSON output
    };
    const safetySettings = [ // Re-using standard safety settings
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // Get a model instance (using 1.5 flash as it's fast and capable)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings, generationConfig });

    const userSkillsString = userSkills.join(', ');
    const prompt = `
        Analyze the relevance of the following job posting for a candidate with a specific set of skills.

        Candidate Skills:
        ${userSkillsString}

        Job Posting:
        Title: ${jobTitle}
        Description Snippet: ${jobDescriptionSnippet}

        Based *only* on the provided job title and description snippet, evaluate how relevant this job is for the candidate. Consider if the candidate's skills align with the requirements explicitly or implicitly mentioned.

        Provide your response strictly as a JSON object with the following structure:
        {
          "score": <A numerical score between 0.0 (not relevant) and 1.0 (highly relevant)>,
          "explanation": "<A brief explanation (1-2 sentences) justifying the score>"
        }
        Do not include any markdown formatting like \`\`\`json ... \`\`\` or any text before or after the JSON object.
    `;

    try {
        console.log(`Requesting relevance score from Gemini for job: "${jobTitle}"`);
        // Using generateContent directly as it's simpler for single-turn requests
        const result = await model.generateContent(prompt);

        if (!result.response) {
            console.error(`Gemini API Error: No response received for job relevance check ("${jobTitle}").`);
            throw new Error("Gemini API did not return a response.");
        }

        const response = result.response;

        // Check for valid content part
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0 || !response.candidates[0].content.parts[0].text) {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.candidates?.[0]?.safetyRatings;
            console.error(`Gemini Error: No valid content part received for job relevance ("${jobTitle}").`, { finishReason, safetyRatings, response });
            if (response.promptFeedback?.blockReason) {
                 console.error(`Gemini Prompt Blocked: ${response.promptFeedback.blockReason}`, response.promptFeedback.safetyRatings);
                 throw new Error(`Content generation blocked due to: ${response.promptFeedback.blockReason}`);
            }
            throw new Error("Gemini did not generate any content or response was blocked for job relevance.");
        }

        const generatedText = response.candidates[0].content.parts[0].text;
        console.log(`Raw response text from Gemini (Job Relevance - "${jobTitle}"):`, generatedText.substring(0, 200) + "...");

        try {
            // Attempt to parse the JSON response directly
            const parsedResponse = JSON.parse(generatedText);

            // Validate the parsed response structure
            if (typeof parsedResponse.score === 'number' && typeof parsedResponse.explanation === 'string') {
                 console.log(`Received score ${parsedResponse.score} for job: "${jobTitle}"`);
                return {
                    score: Math.max(0, Math.min(1, parsedResponse.score)), // Clamp score between 0 and 1
                    explanation: parsedResponse.explanation
                };
            } else {
                console.warn(`Gemini response for "${jobTitle}" has unexpected JSON structure:`, generatedText);
                // Attempt to return null or a default value if structure is wrong
                return null;
            }
        } catch (parseError) {
            console.error(`Error parsing JSON response from Gemini (Job Relevance - "${jobTitle}"):`, parseError);
            console.error(`Gemini raw text was:`, generatedText);
            // Return null if parsing fails
            return null;
        }

    } catch (error) {
        console.error(`Error calling Gemini API for job relevance ("${jobTitle}"):`, error);
         // Avoid throwing generic error if a specific one was already thrown
        if (!error.message.startsWith("Gemini") && !error.message.startsWith("Content generation blocked")) {
            throw new Error(`Gemini API job relevance check failed: ${error.message}`);
        } else {
            throw error; // Re-throw specific errors
        }
    }
};

// Add more functions as needed...
