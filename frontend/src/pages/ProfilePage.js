import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import ProfileInfo from '../components/Auth/ProfileInfo'; // Your existing component
// import ResumeUpload from '../components/Profile/ResumeUpload'; // Future component
// import GoalTracker from '../components/Profile/GoalTracker'; // Future component
import LoadingSpinner from '../components/Common/LoadingSpinner'; // Optional

const ProfilePage = () => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Optional: Redirect or show message if not authenticated
  // You might want a more robust ProtectedRoute component later
  if (!isAuthenticated) {
      return <div>Please log in to view your profile.</div>;
  }

  return (
    <div>
      <h1>Your Profile</h1>
      <ProfileInfo />
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
