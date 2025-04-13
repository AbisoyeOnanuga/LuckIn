import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import JobRecommendations from '../components/Jobs/JobRecommendations';
import PodcastRecommendations from '../components/recommendations/PodcastRecommendations';
import './RecommendationsDashboard.css';
// import PlaylistRecommendations from '../components/Recommendations/PlaylistRecommendations'; // Future component
// import PodcastRecommendations from '../components/Recommendations/PodcastRecommendations'; // Future component
// import TrainingRecommendations from '../components/Recommendations/TrainingRecommendations'; // Future component

// Define the items for the checklist
const nextStepsItems = [
    { id: 'review', text: 'Review the recommended jobs below.' },
    { id: 'view', text: 'Click "View Job Posting" to see the full details on the original site.' },
    { id: 'tailor', text: 'Consider tailoring your resume further based on the specific requirements of jobs that interest you.' },
    { id: 'save', text: '(Future Feature: Save interesting jobs to track your applications.)' }
];

// Key for localStorage
const LOCAL_STORAGE_KEY = 'dashboardNextStepsChecked';

const RecommendationsDashboard = () => {
    const { user, isAuthenticated, error: authError } = useAuth0();

    // State for the checklist items' checked status
    const [checkedItems, setCheckedItems] = useState({});

    // Load checked state from localStorage on component mount
    useEffect(() => {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            try {
                setCheckedItems(JSON.parse(savedState));
            } catch (e) {
                console.error("Failed to parse saved checklist state:", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear invalid state
            }
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    // Handler for checkbox changes
    const handleCheckboxChange = (itemId) => {
        const newCheckedState = {
            ...checkedItems,
            [itemId]: !checkedItems[itemId] // Toggle the state
        };
        setCheckedItems(newCheckedState);
        // Save the updated state to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newCheckedState));
    };

    if (authError) {
        return <div>Oops... Authentication Error: {authError.message}</div>;
    }

    // Optional: Redirect or show message if not authenticated
    if (!isAuthenticated) {
        return <div>Please log in to view your dashboard.</div>;
    }

    if (!user) { // Check for user object instead of just isAuthenticated
        return <div>Please log in to view your dashboard.</div>;
    }

    return (
        <div>
            <h1>Your Personalized Dashboard</h1>
            <p>Here you'll find recommendations tailored to your career goals.</p>
            <div className="dashboard-summary">
                <p>
                    Based on the skills identified in your uploaded resume, we've found the following job recommendations for you.
                    These have been ranked for relevance using AI analysis of the job title and description snippet.
                </p>
                <p>
                    <strong>Next Steps Checklist:</strong>
                </p>
                {/* Replace ul with a div or keep ul but style li differently */}
                <ul className="next-steps-list"> {/* Added a specific class */}
                    {nextStepsItems.map((item) => (
                        <li key={item.id} className={checkedItems[item.id] ? 'checked' : ''}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={!!checkedItems[item.id]} // Use !! to ensure boolean value
                                    onChange={() => handleCheckboxChange(item.id)}
                                />
                                {item.text}
                            </label>
                        </li>
                    ))}
                </ul>
            </div>
            <hr />
            {/* Placeholder for future components */}
            <section className="dashboard-section">
                <h2>Recommended Jobs</h2>
                <JobRecommendations />
            </section>
            <hr />
            <section className="dashboard-section">
                <h2>Recommended Playlists (Spotify)</h2>
                {/* <PlaylistRecommendations /> */}
                <p>[Playlist Recommendations Placeholder]</p>
            </section>
            <hr />
            <section className="dashboard-section">
                <h2>Recommended Podcasts (Listen Notes)</h2>
                <PodcastRecommendations />
            </section>
            <hr />
            <section className="dashboard-section">
                <h2>Recommended Training (Coursera/Udemy)</h2>
                {/* <TrainingRecommendations /> */}
                <p>[Training Recommendations Placeholder]</p>
            </section>
        </div>
    );
};

export default RecommendationsDashboard;
