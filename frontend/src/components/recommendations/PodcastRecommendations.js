import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react'; // Assuming you use Auth0 React SDK
import axios from 'axios'; // Or your preferred HTTP client
import './PodcastRecommendations.css';

const PodcastRecommendations = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getAccessTokenSilently } = useAuth0(); // Hook to get the access token

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
                setPodcasts(response.data || []); // Ensure it's an array

            } catch (err) {
                console.error("Error fetching podcast recommendations:", err);
                let errorMessage = "Failed to load podcast recommendations.";
                if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
                setPodcasts([]); // Clear any potentially stale data
            } finally {
                setIsLoading(false);
            }
        };

        fetchPodcasts();
    }, [getAccessTokenSilently]); // Re-run if the token function changes

    // --- Rendering Logic ---

    if (isLoading) {
        return <div className="loading-message">Loading podcast recommendations...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (podcasts.length === 0) {
        return <div className="no-results-message">No relevant podcasts found based on your profile. Try adding more skills or career goals!</div>;
    }

    return (
        <div className="podcast-recommendations-container">
            <h2>Podcast Recommendations</h2>
            <p>Based on your skills and career goals:</p>
            <div className="podcast-list">
                {podcasts.map((podcast) => (
                    <div key={podcast.id} className="podcast-card">
                        {podcast.thumbnail && (
                            <img src={podcast.thumbnail} alt={`${podcast.title} thumbnail`} className="podcast-thumbnail" />
                        )}
                        <div className="podcast-info">
                            <h3 className="podcast-title">{podcast.title}</h3>
                            {podcast.publisher && <p className="podcast-publisher">By: {podcast.publisher}</p>}
                            <p className="podcast-description">
                                {podcast.description ? `${podcast.description.substring(0, 150)}...` : 'No description available.'}
                            </p>
                            {podcast.spotifyUrl && (
                                <a
                                    href={podcast.spotifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="podcast-link"
                                >
                                    Listen on Spotify
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PodcastRecommendations;
