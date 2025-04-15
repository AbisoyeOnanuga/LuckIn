import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import ResumeUpload from '../components/Resume/ResumeUpload';
import './ProfilePage.css';

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

  // --- Add state for new goal input and goal updates ---
  const [newGoal, setNewGoal] = useState('');
  const [isUpdatingGoals, setIsUpdatingGoals] = useState(false);
  const [goalUpdateError, setGoalUpdateError] = useState('');
  const [deletingGoalIndex, setDeletingGoalIndex] = useState(null);

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

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
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

  // --- Function to update goals on the backend (used by add and delete) ---
  const updateGoalsOnBackend = async (updatedGoalsArray) => {
    setIsUpdatingGoals(true); // Use general updating state for backend call
    setGoalUpdateError('');
    try {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
      const response = await fetch(`${API_BASE_URL}/api/users/profile/goals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ careerGoals: updatedGoalsArray }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update goals.');
      }
      // Update local state
      setUserProfile(prevProfile => ({
        ...prevProfile,
        careerGoals: result.updatedProfile?.careerGoals || updatedGoalsArray
      }));
      return true; // Indicate success
    } catch (err) {
      console.error("Error updating goals:", err);
      setGoalUpdateError(err.message || 'An error occurred while updating goals.');
      return false; // Indicate failure
    } finally {
      setIsUpdatingGoals(false);
    }
  };

  // --- Add function to handle adding a new goal ---
  const handleAddGoal = async (event) => {
    event.preventDefault();
    if (!newGoal.trim()) {
        setGoalUpdateError('Please enter a goal.');
        return;
    }
    if (!userProfile) {
        setGoalUpdateError('User profile not loaded yet.');
        return;
    }
    const updatedGoals = [...new Set([...(userProfile.careerGoals || []), newGoal.trim()])];
    const success = await updateGoalsOnBackend(updatedGoals);
    if (success) {
        setNewGoal(''); // Clear input only on success
    }
};
// --- ---

// --- Add function to handle deleting a goal ---
const handleDeleteGoal = async (indexToDelete) => {
    if (!userProfile || !userProfile.careerGoals) return;

    setDeletingGoalIndex(indexToDelete); // Set loading state for this specific goal
    setGoalUpdateError(''); // Clear previous errors

    const updatedGoals = userProfile.careerGoals.filter((_, index) => index !== indexToDelete);

    await updateGoalsOnBackend(updatedGoals); // Call the shared update function

    setDeletingGoalIndex(null); // Reset loading state for this goal
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
    // --- Add container class ---
    <div className="profile-container">
      <h1>Your Profile</h1>
      {error && <p className="error-message">Error loading profile: {error}</p>}

      {/* --- Profile Header Section --- */}
      {auth0User && (
        <div className="profile-header">
          <img src={auth0User.picture} alt={auth0User.name} className="profile-picture" />
          <div className="profile-info">
            <h2>{auth0User.name}</h2>
            <p>{auth0User.email}</p>
          </div>
        </div>
      )}

      {/* --- Profile Details Section --- */}
      {isLoading && <p className="loading-message">Loading profile details...</p>}
      {userProfile && !isLoading && (
          <section className="profile-section">
              <h2>Profile Details</h2>
              <p><strong>Joined:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
              <p>
                <strong>Current Resume:</strong> {userProfile.resumeFilename || 'None uploaded'}
                {userProfile.resumeLastUploaded && ` (Uploaded: ${new Date(userProfile.resumeLastUploaded).toLocaleString()})`}
              </p>
              {userProfile.resumeData?.skills && userProfile.resumeData.skills.length > 0 && (
                <div className="skills-list">
                  <strong>Extracted Skills:</strong>
                  <ul>
                    {userProfile.resumeData.skills.slice(0, 10).map((skill, index) => (
                      <li key={index}>{skill}</li>
                    ))}
                    {userProfile.resumeData.skills.length > 10 && <li className="skills-more">...</li>}
                  </ul>
                </div>
              )}
          </section>
      )}

      {/* --- Resume Upload Section --- */}
      <section className="profile-section upload-section">
        {/* Title moved outside ResumeUpload for consistency */}
        <h2>Update Resume</h2>
        <ResumeUpload onUploadSuccess={handleResumeUploadSuccess} />
      </section>

      {/* --- Career Goals Section --- */}
      <section className="profile-section goals-section">
        <h2>Career Goals</h2>

        {/* Display existing goals */}
        {userProfile?.careerGoals && userProfile.careerGoals.length > 0 ? (
            <div className="goals-list">
                <strong>Current Goals:</strong>
                <ul>
                    {userProfile.careerGoals.map((goal, index) => (
                        <li key={index}>
                            <span>{goal}</span> {/* Wrap goal text in span */}
                            {/* Add Delete Button */}
                            <button
                                onClick={() => handleDeleteGoal(index)}
                                className="goal-delete-button"
                                // Disable while this specific goal or any goal is being updated/deleted
                                disabled={isUpdatingGoals || deletingGoalIndex === index}
                                aria-label={`Delete goal: ${goal}`} // Accessibility
                            >
                                {/* Simple 'X' or use an icon */}
                                &times;
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        ) : (
            <p>You haven't added any career goals yet.</p>
        )}

        {/* Form to add a new goal */}
        <form onSubmit={handleAddGoal} className="add-goal-form">
          <label htmlFor="new-goal-input" className="sr-only">Add a new goal</label>
          <input
            type="text"
            id="new-goal-input"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Add a new career goal (e.g., Learn React Native)"
            className="goal-input"
            disabled={isUpdatingGoals} // Disable input while any goal update is happening
          />
          <button
            type="submit"
            className="goal-add-button"
            disabled={isUpdatingGoals || !newGoal.trim()}
          >
            {isUpdatingGoals && deletingGoalIndex === null ? 'Adding...' : 'Add Goal'} {/* Show 'Adding...' only when adding */}
          </button>
        </form>
        {goalUpdateError && <p className="error-message goal-error">{goalUpdateError}</p>}
      
      </section>
    </div>
  );
};

export default ProfilePage;
