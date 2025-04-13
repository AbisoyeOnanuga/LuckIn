import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth0();

  return (
    <div className="homepage-container">
      <div className="hero-section">
        {/* Option 1: Using the SVG as an img */}
        <img
          src='../undraw_process_7lkc.svg' // Make sure the path is correct (usually relative to the public folder)
          alt="Career growth illustration"
          className="hero-illustration"
        />
        <h1 className="hero-title">Unlock Your Career Potential with LuckIn</h1>
        <p className="hero-subtitle">
          Get personalized job, podcast, and training recommendations based on your unique skills and goals.
        </p>
        {/* Add a Call to Action button if you don't have one */}
        {/* <button className="cta-button">Get Started</button> */}
      </div>
      {!isAuthenticated ? (
        <p>Please log in to access your personalized dashboard and insights.</p>
      ) : (
        // Optional: Greet the logged-in user
        <p>Hello, {user?.name || 'User'}! Use the navigation links to explore.</p>
      )}
      {/* You can add more content, images, call-to-action buttons etc. here */}
    </div>
  );
};

export default HomePage;
