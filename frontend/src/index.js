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

// Get base path from PUBLIC_URL (set by build based on package.json homepage)
const baseName = process.env.PUBLIC_URL || "";
console.log("Using Basename:", baseName);

// Calculate the correct redirect URI including the basename
const redirectUri = `${window.location.origin}${baseName}/callback`;
console.log("Using Redirect URI:", redirectUri);

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
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        // *** FIX: Use the calculated redirectUri variable ***
        redirect_uri: redirectUri,
        audience: auth0Audience,
        scope: "openid profile email offline_access"
      }}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

// --- Rendering Logic ---
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router basename={baseName}>
      {/* Use the helper component to wrap App */}
      <Auth0ProviderWithRedirectCallback>
        <App />
      </Auth0ProviderWithRedirectCallback>
    </Router>
  </React.StrictMode>
);

