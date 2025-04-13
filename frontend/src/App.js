// frontend/src/App.js (Updated)
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

// Import Pages
import HomePage from './pages/HomePage'; // <-- Import HomePage
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/RecommendationsDashboard';
// import CallbackPage from './pages/CallbackPage'; // You might need this later

// Import Components
import NavBar from './components/Navigation/NavBar';
import LoginButton from './components/Auth/LoginButton';
import LogoutButton from './components/Auth/LogoutButton';
import './App.css'; // Assuming you have some basic CSS

function App() {
  const { isLoading, error, isAuthenticated } = useAuth0();

  // Show loading state while Auth0 SDK initializes
  if (isLoading) {
    return <div className="app-loading">Loading...</div>; // Style this as needed
  }

  // Handle Auth0 initialization errors
  if (error) {
    return <div className="app-error">Oops... {error.message}</div>;
  }

  return (
    <div className="App">
      <NavBar />

      <main className="app-main"> {/* Added class for potential styling */}
        <Routes>
          {/* Add the route for the root path */}
          <Route path="/" element={<HomePage />} />

          {/* Protected routes */}
          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </>
          )}

          {/* Catch-all for unmatched routes */}
          {/* You could create a dedicated NotFoundPage component */}
          <Route path="*" element={<div><h2>404 - Page Not Found</h2><p>Sorry, the page you are looking for does not exist.</p></div>} />
        </Routes>
      </main>

      <footer className="app-footer"> {/* Optional: Add a footer */}
        <hr />
        <p>&copy; {new Date().getFullYear()} LuckIn. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
