// frontend/src/App.js (Updated)
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

// Import Pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/RecommendationsDashboard';
// import CallbackPage from './pages/CallbackPage'; // You might need this later

// Import Components
import NavBar from './components/Navigation/NavBar';
import './App.css';

const AuthCallback = () => {
  // You could show a specific loading indicator here if desired
  return <div className="app-loading">Processing login...</div>;
};

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

      <main className="app-main">
        <Routes>
          {/* Public route - Should match '/' relative to basename */}
          <Route path="/" element={<HomePage />} />

          {/* Auth0 Callback route */}
          <Route path="/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          {/* Consider using a ProtectedRoute component for cleaner logic */}
          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </>
          )}

          {/* Catch-all for unmatched routes */}
          {/* Make sure this is the LAST route */}
          <Route path="*" element={<div><h2>404 - Page Not Found</h2><p>Sorry, the page you are looking for does not exist.</p></div>} />
        </Routes>
      </main>

      <footer className="app-footer">
        <hr />
        <p>&copy; {new Date().getFullYear()} LuckIn. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
