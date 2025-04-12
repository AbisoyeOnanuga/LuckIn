import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import ResumeUpload from '../components/Resume/ResumeUpload'; // <-- Import the component

// Define the base URL for your API from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ProfilePage = () => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: isAuthLoading, // Renamed to avoid conflict
    getAccessTokenSilently,
  } = useAuth0();

  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // State for profile loading
  const [error, setError] = useState(null);

  // Function to fetch profile data
  const fetchUserProfile = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        },
      });

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // Try to get error message from backend response body
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setUserProfile(data);

    } catch (e) {
      console.error("Error fetching user profile:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch profile on component mount or when auth state changes
  useEffect(() => {
    fetchUserProfile();
  }, [isAuthenticated, getAccessTokenSilently]); // Dependencies

  // Callback function to update profile state after successful upload
  const handleResumeUploadSuccess = (uploadResult) => {
    console.log("Resume upload successful, API response:", uploadResult);
    // Update the local profile state with the data returned from the upload endpoint
    // This provides immediate feedback without needing a full page refresh/refetch
    if (uploadResult.updatedProfile) {
        setUserProfile(prevProfile => ({
            ...prevProfile,
            resumeFilename: uploadResult.updatedProfile.resumeFilename || prevProfile?.resumeFilename,
            resumeLastUploaded: uploadResult.updatedProfile.resumeLastUploaded || prevProfile?.resumeLastUploaded,
            // Update resumeData if you want to display parsed info immediately
            resumeData: uploadResult.updatedProfile.resumeData || prevProfile?.resumeData
        }));
    } else {
        // If backend didn't return updatedProfile, refetch the whole profile
        // This is a fallback, ideally the backend should return the updated data
        console.log("Backend did not return updated profile data, refetching...");
        fetchUserProfile();
    }
  };

  // Handle Auth0 loading state
  if (isAuthLoading) {
    return <div>Loading authentication...</div>;
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
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ccc' }}>
          <img src={auth0User.picture} alt={auth0User.name} style={{ borderRadius: '50%', width: '80px', height: '80px', float: 'left', marginRight: '20px' }} />
          <div style={{ overflow: 'hidden' }}>
            <h2>{auth0User.name}</h2>
            <p>{auth0User.email}</p>
          </div>
          <div style={{clear: 'both'}}></div> {/* Clear float */}
        </div>
      )}

      {/* Display data fetched from your backend */}
      {isLoading && <p>Loading profile details...</p>}
      {userProfile && !isLoading && (
        <section style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ccc' }}>
          <h2>Profile Details</h2>
          {/* <p><strong>Database ID:</strong> {userProfile._id}</p> */}
          {/* <p><strong>Auth0 ID:</strong> {userProfile.auth0Id}</p> */}
          <p><strong>Joined:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
          {/* Display resume info */}
          <p>
              <strong>Current Resume:</strong> {userProfile.resumeFilename || 'None uploaded'}
              {userProfile.resumeLastUploaded && ` (Uploaded: ${new Date(userProfile.resumeLastUploaded).toLocaleString()})`}
          </p>
          {/* Optionally display some parsed data */}
          {userProfile.resumeData?.skills && (
              <div>
                  <strong>Extracted Skills:</strong>
                  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                      {userProfile.resumeData.skills.slice(0, 10).map((skill, index) => ( // Show top 10 skills
                          <li key={index} style={{ display: 'inline-block', background: '#eee', borderRadius: '4px', padding: '2px 6px', margin: '2px' }}>
                              {skill}
                          </li>
                      ))}
                      {userProfile.resumeData.skills.length > 10 && ' ...'}
                  </ul>
              </div>
          )}
        </section>
      )}

      {/* Render the ResumeUpload component */}
      <section style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ccc' }}>
        <ResumeUpload onUploadSuccess={handleResumeUploadSuccess} />
      </section>

      <section>
        <h2>Career Goals</h2>
        {/* <GoalTracker /> */}
        <p>[Career Goal Tracking Component Placeholder]</p>
        {/* Display current goals if available */}
        {userProfile?.careerGoals && userProfile.careerGoals.length > 0 && (
            <div>
                <strong>Current Goals:</strong>
                <ul>
                    {userProfile.careerGoals.map((goal, index) => <li key={index}>{goal}</li>)}
                </ul>
            </div>
        )}
      </section>
    </div>
  );
};

export default ProfilePage;
