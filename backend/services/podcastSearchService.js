import { Client } from 'podcast-api'; // Import the official client
import config from '../config/index.js';

// Instantiate the client
// If apiKey is null/undefined, it connects to a mock server (useful for testing without using quota)
const listenNotesClient = Client({ apiKey: config.listenNotesApiKey || null });

if (!config.listenNotesApiKey) {
    console.warn("Listen Notes API Key not found in config. Podcast features will use MOCK data.");
}

/**
 * Searches for podcast episodes using the Listen Notes API client library.
 * @param {string} query - The search query string.
 * @param {number} [limit=10] - The maximum number of results to return.
 * @returns {Promise<Array<object>>} - An array of formatted podcast episode objects.
 */
export const searchPodcastEpisodes = async (query, limit = 10) => {
    if (!query) {
        console.warn("Listen Notes search query is empty. Returning no results.");
        return [];
    }

    console.log(`Searching Listen Notes for episodes with query: "${query}" (limit: ${limit})`);

    try {
        const response = await listenNotesClient.search({
            q: query,
            sort_by_date: 0, // 0 = relevance, 1 = date
            type: 'episode',
            offset: 0,
            // len_min: 5, // Optional: Minimum length
            // len_max: 60, // Optional: Maximum length
            language: 'English', // Optional: Filter language
            safe_mode: 0, // Optional: Exclude explicit (1=yes, 0=no)
            page_size: limit // Use page_size to control limit with this client
        });

        // The client library directly gives results in response.data.results
        const results = response.data?.results || [];

        console.log(`Listen Notes API returned ${results.length} results.`);

        // Format the results for the frontend (similar to before)
        const formattedEpisodes = results.map(episode => ({
            id: episode.id,
            title: episode.title_original,
            description: episode.description_original,
            thumbnail: episode.thumbnail, // Image URL
            audioUrl: episode.audio, // Direct audio link
            listennotesUrl: episode.listennotes_url, // Link to Listen Notes page
            podcastTitle: episode.podcast?.title_original,
            publisher: episode.podcast?.publisher_original,
            publishedMs: episode.pub_date_ms, // Publication date in milliseconds
            audioLengthSec: episode.audio_length_sec,
        }));

        // The client respects page_size, so no need to slice again unless you want fewer than requested
        return formattedEpisodes;

    } catch (error) {
        console.error(`Error searching Listen Notes API: ${error.message}`);
        // The client library might throw specific errors or include details in error.response
        if (error.response) {
            console.error('Listen Notes Error Status:', error.response.status);
            console.error('Listen Notes Error Data:', error.response.data);
            if (error.response.status === 401) {
                 // Don't expose detailed error messages to the client directly
                 throw new Error("Listen Notes API authentication failed. Check API key configuration.");
            } else if (error.response.status === 429) {
                 throw new Error("Listen Notes API rate limit exceeded.");
            } else if (error.response.status === 400) {
                 // Bad request, often invalid parameters
                 throw new Error(`Listen Notes API bad request: ${error.response.data?.message || 'Invalid parameters'}`);
            }
        }
        // Throw a generic error or return empty array
        // Throwing is often better to signal failure clearly upstream
        throw new Error(`Failed to fetch podcast recommendations from Listen Notes.`);
        // return []; // Alternative: return empty on error
    }
};

// You can remove the searchSpotifyPodcasts function if no longer needed
// export const searchSpotifyPodcasts = async (...) => { ... }
