// f:\Documents\vscode\LuckIn\backend\services\podcastSearchService.js
import axios from 'axios';
import config from '../config/index.js';

// Check for RapidAPI configuration
if (!config.rapidApiKey || !config.rapidApiSpotifyHost) {
    console.warn("RapidAPI Key or Spotify Host not found in config. Podcast features using Spotify will be disabled.");
}

const SPOTIFY_RAPIDAPI_BASE_URL = `https://${config.rapidApiSpotifyHost}`; // Construct base URL

/**
 * Searches for podcasts (shows) using a Spotify RapidAPI endpoint.
 * @param {string} query - The search query string.
 * @param {number} [limit=10] - The maximum number of results to request.
 * @returns {Promise<Array<object>>} - An array of formatted podcast show objects.
 */
export const searchSpotifyPodcasts = async (query, limit = 10) => {
    // Check if API keys are configured before making a call
    if (!config.rapidApiKey || !config.rapidApiSpotifyHost) {
        console.error("Cannot search Spotify via RapidAPI: API Key or Host is missing.");
        return [];
    }
    if (!query) {
        console.warn("Spotify search query is empty. Returning no results.");
        return [];
    }

    console.log(`Searching Spotify (RapidAPI) for podcasts with query: "${query}" (limit: ${limit})`);

    try {
        // *** Adjust the endpoint path and parameters based on your specific RapidAPI documentation ***
        // This is a common structure, but verify it.
        const response = await axios.get(`${SPOTIFY_RAPIDAPI_BASE_URL}/search/`, { // Verify this endpoint path
            headers: {
                'X-RapidAPI-Key': config.rapidApiKey,
                'X-RapidAPI-Host': config.rapidApiSpotifyHost,
            },
            params: {
                q: query,
                type: 'podcasts,shows', // Search for podcasts/shows (adjust if needed)
                limit: limit, // Request the desired limit
                // offset: 0, // Optional: For pagination if supported
                // market: 'US', // Optional: Specify market if needed
            }
        });

        // *** Adapt response processing based on the ACTUAL structure returned by your RapidAPI endpoint ***
        // Example structure (assuming it returns an object with an 'items' array or similar):
        // Check the RapidAPI documentation for the exact structure.
        // It might be response.data.podcasts.items or response.data.shows.items etc.
        const items = response.data?.podcasts?.items || response.data?.shows?.items || response.data?.items || [];

        console.log(`Spotify (RapidAPI) returned ${items.length} results.`);

        // Format the results for the frontend
        const formattedPodcasts = items.map(item => {
            // Access nested data safely. Adjust these paths based on the actual response!
            const data = item?.data || item; // Some APIs nest data, some don't
            const name = data?.name;
            const description = data?.description || data?.publisher?.name || 'No description available.'; // Provide fallback
            // Find the largest available image, or a default
            const imageUrl = data?.coverArt?.sources?.sort((a, b) => b.width - a.width)[0]?.url || data?.images?.[0]?.url || null; // Handle missing images
            // Get the Spotify URL or URI
            const spotifyUrl = data?.external_urls?.spotify || `spotify:show:${data?.id}` || data?.uri || null; // Construct URI if only ID is present

            // Only include if essential data is present
            if (name && spotifyUrl) {
                return {
                    id: data?.id, // Use Spotify ID
                    title: name,
                    description: description,
                    thumbnail: imageUrl,
                    spotifyUrl: spotifyUrl, // Link to Spotify page/app
                    publisher: data?.publisher?.name,
                    // Add other relevant fields if available (e.g., total episodes)
                };
            }
            return null; // Exclude items with missing essential info
        }).filter(podcast => podcast !== null); // Remove null entries

        // Since we requested the limit, we don't need to slice again unless the API ignored it.
        return formattedPodcasts.slice(0, limit); // Ensure limit is respected

    } catch (error) {
        console.error(`Error searching Spotify via RapidAPI: ${error.message}`);
        if (error.response) {
            console.error('RapidAPI Error Status:', error.response.status);
            console.error('RapidAPI Error Data:', error.response.data);
            // Handle specific API errors (e.g., 401 Unauthorized, 403 Forbidden, 429 Rate Limit)
            if (error.response.status === 401 || error.response.status === 403) {
                // Use a generic error for the client, log specifics on the server
                throw new Error("Spotify API authentication/authorization failed via RapidAPI. Check your key or subscription.");
            } else if (error.response.status === 429) {
                throw new Error("Spotify API (RapidAPI) rate limit exceeded.");
            }
        }
        // Return empty array or re-throw a more specific error
        return []; // Return empty on error to avoid breaking the frontend entirely
        // Or: throw new Error(`Failed to fetch podcast recommendations: ${error.message}`);
    }
};
