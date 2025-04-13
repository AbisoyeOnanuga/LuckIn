import React from 'react';
import ReactDOM from 'react-dom/client';
// Import useNavigate from react-router-dom
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

// Auth0 Configuration - Ensure these env vars are set in your .env file
const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
const auth0ClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const auth0Audience = process.env.REACT_APP_AUTH0_AUDIENCE; // For requesting access token for your API

// Determine the correct redirect URI based on the environment
const redirectUri = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_AUTH0_CALLBACK_URL
  : window.location.origin; // Or your specific local callback if needed

// --- Helper Component ---
// This component allows us to use the useNavigate hook within the Auth0Provider's callback
const Auth0ProviderWithRedirectCallback = ({ children }) => {
  const navigate = useNavigate();

  // This function runs after Auth0 successfully processes the /callback redirect
  const onRedirectCallback = (appState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState); // Debug log
    // Use navigate to redirect to the intended route (appState.returnTo)
    // or fallback to the root path ('/') if returnTo is not set.
    const targetUrl = appState?.returnTo || '/';
    console.log("Navigating to:", targetUrl); // Debug log
    navigate(targetUrl, { replace: true }); // Use replace to avoid '/callback' in history
  };

  // Basic check to ensure config is loaded before rendering Auth0Provider
  if (!auth0Domain || !auth0ClientId || !auth0Audience) {
    return (
      <div>
        Error: Auth0 environment variables (REACT_APP_AUTH0_DOMAIN,
        REACT_APP_AUTH0_CLIENT_ID, REACT_APP_AUTH0_AUDIENCE) are not set.
        Please check your .env file.
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
      authorizationParams={{
        // Use the environment variable for audience
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        // Use the dynamically determined redirectUri
        redirect_uri: redirectUri,
        // Include scopes if needed, e.g., for refresh tokens
        // scope: "openid profile email offline_access"
      }}
      // Optional: Add cacheLocation="localstorage" for better persistence
      // cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

// --- Rendering Logic ---
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      {/* Use the helper component to wrap App */}
      <Auth0ProviderWithRedirectCallback>
        <App />
      </Auth0ProviderWithRedirectCallback>
    </Router>
  </React.StrictMode>
);

