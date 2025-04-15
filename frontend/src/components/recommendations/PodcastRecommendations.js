import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react'; // Assuming you use Auth0 React SDK
import axios from 'axios'; // Or your preferred HTTP client
import './PodcastRecommendations.css';

// Helper function to strip HTML tags
const stripHtml = (html) => {
    if (!html) return '';
    // Create a temporary div element
    const tempDiv = document.createElement('div');
    // Set its innerHTML to the input string
    tempDiv.innerHTML = html;
    // Return the text content (strips tags) or an empty string if null
    return tempDiv.textContent || tempDiv.innerText || '';
 };
 
 const PodcastRecommendations = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getAccessTokenSilently } = useAuth0();

    // --- Get the API Base URL from environment variables ---
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        const fetchPodcasts = async () => {
            setIsLoading(true);
            setError(null);

            // --- Check if the base URL is configured ---
            if (!apiBaseUrl) {
                console.error("Error: REACT_APP_API_BASE_URL is not set.");
                setError("API endpoint configuration is missing.");
                setIsLoading(false);
                return; // Stop execution if base URL is missing
            }

            try {
                const token = await getAccessTokenSilently();
                console.log("Fetching podcast recommendations...");

                // --- Construct the full URL ---
                const apiUrl = `${apiBaseUrl}/api/recommendations/podcasts`;
                console.log("Requesting URL:", apiUrl); // Log the URL being requested

                const response = await axios.get(apiUrl, { // Use the full apiUrl
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("Podcast recommendations received:", response.data);
                setPodcasts(response.data || []);

            } catch (err) {
                console.error("Error fetching podcast recommendations:", err);
                let errorMessage = "Failed to load podcast recommendations.";
                // Check for specific error details from backend or network error
                if (err.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error("Error Response Data:", err.response.data);
                    console.error("Error Response Status:", err.response.status);
                    errorMessage = `Error ${err.response.status}: ${err.response.data?.message || 'Server error'}`;
                } else if (err.request) {
                    // The request was made but no response was received
                    console.error("Error Request:", err.request);
                    errorMessage = "No response received from server. Check network or backend status.";
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error Message:', err.message);
                    errorMessage = err.message;
                }
                setError(errorMessage);
                setPodcasts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPodcasts();
    // Add apiBaseUrl to dependency array to satisfy eslint, though it won't change
    }, [getAccessTokenSilently, apiBaseUrl]);

    // ... rest of the component remains the same ...

    if (isLoading) {
        return <div className="loading-message">Loading podcast recommendations...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (!podcasts || podcasts.length === 0) {
        return <div className="no-results-message">No relevant podcasts found based on your profile. Try adding more skills or career goals!</div>;
    }

    return (
        <div className="podcast-recommendations-container">
            <p>Based on your skills and career goals:</p>
            <div className="podcast-list">
                {podcasts.map((podcast) => {
                    // --- Strip HTML from description ---
                    const cleanDescription = stripHtml(podcast.description);

                    return (
                        <div key={podcast.id} className="podcast-card">
                            {podcast.thumbnail ? ( // Check thumbnail existence
                                <img src={podcast.thumbnail} alt={`${podcast.title || 'Podcast'} thumbnail`} className="podcast-thumbnail" />
                            ) : (
                                <div className="podcast-thumbnail placeholder-thumbnail"></div> // Optional placeholder style
                            )}
                            <div className="podcast-info">
                                <h3 className="podcast-title">{podcast.title || 'Untitled Podcast'}</h3>
                                {podcast.publisher && <p className="podcast-publisher">By: {podcast.publisher}</p>}
                                <p className="podcast-description">
                                    {/* --- Use cleaned description --- */}
                                    {cleanDescription ? `${cleanDescription.substring(0, 150)}...` : 'No description available.'}
                                </p>
                                {/* --- Use listennotesUrl instead of spotifyUrl --- */}
                                {podcast.listennotesUrl && (
                                    <a
                                        href={podcast.listennotesUrl} // Use the correct URL field
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="podcast-link" // You might want to change the CSS class name/style if it's no longer Spotify
                                    >
                                        {/* --- Update link text --- */}
                                        Listen on Listen Notes
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PodcastRecommendations;
