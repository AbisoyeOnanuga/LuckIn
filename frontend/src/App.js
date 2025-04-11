// frontend/src/App.js
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

// Import Pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import CallbackPage from './pages/CallbackPage'; // Handles Auth0 redirect

// Import Components
import LoginButton from './components/Auth/LoginButton';
import LogoutButton from './components/Auth/LogoutButton';
import LoadingSpinner from './components/Common/LoadingSpinner'; // Create a simple spinner

function App() {
  const { isLoading, error, isAuthenticated } = useAuth0();

  if (isLoading) {
    return <LoadingSpinner />; // Show a loading indicator while Auth0 SDK initializes
  }

  if (error) {
    return <div>Oops... {error.message}</div>; // Handle Auth0 initialization errors
  }

  return (
    <div className="App">
      <header>
        <nav>
          <Link to="/">Home</Link> |{' '}
          {isAuthenticated && <Link to="/dashboard">Dashboard</Link>} |{' '}
          {isAuthenticated && <Link to="/profile">Profile</Link>} |{' '}
          {!isAuthenticated ? <LoginButton /> : <LogoutButton />}
        </nav>
        <hr />
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Protect routes that require authentication */}
          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </>
          )}
           {/* Route for Auth0 callback */}
          <Route path="/callback" element={<CallbackPage />} />
          {/* Add a fallback route for non-matched paths */}
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
