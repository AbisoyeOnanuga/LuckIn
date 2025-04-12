// frontend/src/App.js
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

// Import Pages
// import Homepage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/RecommendationsDashboard';
// import CallbackPage from './pages/CallbackPage'; // Handles Auth0 redirect

// Import Components
import LoginButton from './components/Auth/LoginButton';
import LogoutButton from './components/Auth/LogoutButton';

function App() {
  const { isLoading, error, isAuthenticated } = useAuth0();

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
          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </>
          )}
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
