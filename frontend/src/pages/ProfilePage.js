// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
// import ProfileInfo from '../components/Auth/ProfileInfo'; // Keep this if you want basic Auth0 info
import LoadingSpinner from '../components/Common/LoadingSpinner'; // Optional

// Define the base URL for your API from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ProfilePage = () => {
  const {
    user: auth0User, // User info directly from Auth0
    isAuthenticated,
    isLoading: isAuthLoading,
    getAccessTokenSilently, // Function to get the secure token
  } = useAuth0();

  const [userProfile, setUserProfile] = useState(null); // State for profile data from your backend
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated) return; // Don't fetch if not logged in

      setIsLoading(true);
      setError(null);

      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: process.env.REACT_APP_AUTH0_AUDIENCE, // Specify the audience for your API
            // scope: "read:profile", // Add scopes if needed/configured
          },
        });

        // console.log('Access Token:', accessToken); // For debugging

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${accessToken}`, // Include the token in the header
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setUserProfile(data); // Store the profile data from your backend
        // console.log('Backend User Profile:', data);

      } catch (e) {
        console.error("Error fetching user profile:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, getAccessTokenSilently]); // Re-run if auth state changes

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner />;
  }

  // Optional: Redirect or show message if not authenticated
  if (!isAuthenticated) {
      return <div>Please log in to view your profile.</div>;
  }

  return (
    <div>
      <h1>Your Profile</h1>
      {error && <p style={{ color: 'red' }}>Error loading profile: {error}</p>}

      {/* Display basic info from Auth0 */}
      {auth0User && (
        <div>
          <img src={auth0User.picture} alt={auth0User.name} style={{ borderRadius: '50%', width: '80px', height: '80px' }} />
          <h2>{auth0User.name}</h2>
          <p>{auth0User.email}</p>
        </div>
      )}

      <hr />

      {/* Display data fetched from your backend */}
      {userProfile ? (
        <section>
          <h2>Profile Details (from Backend)</h2>
          <p><strong>Database ID:</strong> {userProfile._id}</p>
          <p><strong>Auth0 ID:</strong> {userProfile.auth0Id}</p>
          <p><strong>Joined:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
          {/* Add fields for goals, resume URL etc. as they are added */}
          {/* <p><strong>Career Goals:</strong> {userProfile.careerGoals?.join(', ') || 'Not set'}</p> */}
        </section>
      ) : (
        !isLoading && !error && <p>Loading profile details...</p>
      )}

      <hr />
      {/* Placeholder for future components */}
      <section>
        <h2>Resume</h2>
        {/* <ResumeUpload /> */}
        <p>[Resume Upload Component Placeholder]</p>
      </section>
      <hr />
      <section>
        <h2>Career Goals</h2>
        {/* <GoalTracker /> */}
        <p>[Career Goal Tracking Component Placeholder]</p>
      </section>
    </div>
  );
};

export default ProfilePage;
