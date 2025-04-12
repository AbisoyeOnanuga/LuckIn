import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
// import PlaylistRecommendations from '../components/Recommendations/PlaylistRecommendations'; // Future component
// import PodcastRecommendations from '../components/Recommendations/PodcastRecommendations'; // Future component
// import TrainingRecommendations from '../components/Recommendations/TrainingRecommendations'; // Future component

const RecommendationsDashboard = () => {
    const { isAuthenticated, isLoading } = useAuth0();


    // Optional: Redirect or show message if not authenticated
    if (!isAuthenticated) {
        return <div>Please log in to view your dashboard.</div>;
    }

    return (
        <div>
            <h1>Your Personalized Dashboard</h1>
            <p>Here you'll find recommendations tailored to your career goals.</p>
            <hr />
            {/* Placeholder for future components */}
            <section>
                <h2>Recommended Playlists (Spotify)</h2>
                {/* <PlaylistRecommendations /> */}
                <p>[Playlist Recommendations Placeholder]</p>
            </section>
            <hr />
            <section>
                <h2>Recommended Podcasts (Listen Notes)</h2>
                {/* <PodcastRecommendations /> */}
                <p>[Podcast Recommendations Placeholder]</p>
            </section>
            <hr />
            <section>
                <h2>Recommended Training (Coursera/Udemy)</h2>
                {/* <TrainingRecommendations /> */}
                <p>[Training Recommendations Placeholder]</p>
            </section>
        </div>
    );
};

export default RecommendationsDashboard;
