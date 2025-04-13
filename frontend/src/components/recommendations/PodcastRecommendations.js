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

    useEffect(() => {
        const fetchPodcasts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = await getAccessTokenSilently();
                console.log("Fetching podcast recommendations...");

                const response = await axios.get('/api/recommendations/podcasts', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("Podcast recommendations received:", response.data);
                setPodcasts(response.data || []);

            } catch (err) {
                console.error("Error fetching podcast recommendations:", err);
                let errorMessage = "Failed to load podcast recommendations.";
                if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
                setPodcasts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPodcasts();
    }, [getAccessTokenSilently]);

    if (isLoading) {
        return <div className="loading-message">Loading podcast recommendations...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (!podcasts || podcasts.length === 0) { // Added !podcasts check
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
