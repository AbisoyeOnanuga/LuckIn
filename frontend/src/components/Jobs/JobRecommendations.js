import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './JobRecommendations.css';

// Define the base URL for your API from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const JobRecommendations = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setIsLoading(true);
            setError(null); // Reset error state on new fetch
            try {
                const accessToken = await getAccessTokenSilently({
                    authorizationParams: {
                        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
                    },
                });

                const response = await fetch(`${API_BASE_URL}/api/jobs/recommendations`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json(); // Try to get error message from backend
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setRecommendations(data);

            } catch (err) {
                console.error("Error fetching job recommendations:", err);
                setError(err.message); // Set the error message state
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();
    }, [getAccessTokenSilently]); // Dependency array includes getAccessTokenSilently

    // --- Render Logic ---
    if (isLoading) {
        return <div className="loading-message">Loading job recommendations...</div>;
    }

    if (error) {
        return <div className="error-message">Error fetching recommendations: {error}</div>;
    }

    if (recommendations.length === 0) {
        return <div className="no-recommendations">No job recommendations found based on your profile. Try uploading or updating your resume!</div>;
    }

    return (
        <div className="job-recommendations-container">
            <h2>Job Recommendations For You</h2>
            <p>Based on the skills found in your resume.</p>
            <ul className="job-list">
                {recommendations.map((job) => (
                    <li key={job._id || job.url} className="job-item"> {/* Use _id or url as key */}
                        <h3>{job.title}</h3>
                        <p className="job-company-location">
                            <strong>{job.company}</strong> - {job.location}
                        </p>
                        <p className="job-description">{job.description}</p>
                        {job.requiredSkills && job.requiredSkills.length > 0 && (
                            <div className="job-skills">
                                <strong>Skills:</strong>
                                {/* Map skills to span elements */}
                                {job.requiredSkills.map((skill, index) => (
                                    <span key={index}>{skill}</span>
                                ))}
                            </div>
                        )}
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-link">
                            View Job Posting
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default JobRecommendations;
