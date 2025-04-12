import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth0();

  return (
    <div>
      <h1>Welcome to LuckIn!</h1>
      <p>Your personal career wellness coach.</p>
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
