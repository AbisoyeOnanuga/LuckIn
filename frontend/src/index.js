import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Auth0 Configuration - Ensure these env vars are set in your .env file
const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
const auth0ClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const auth0Audience = process.env.REACT_APP_AUTH0_AUDIENCE; // For requesting access token for your API

if (!auth0Domain || !auth0ClientId || !auth0Audience) {
  console.error(
    "Auth0 environment variables (REACT_APP_AUTH0_DOMAIN, REACT_APP_AUTH0_CLIENT_ID, REACT_APP_AUTH0_AUDIENCE) are not set. Please check your .env file."
  );
}

root.render(
  <React.StrictMode>
    <Router>
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        authorizationParams={{
          redirect_uri: window.location.origin + '/callback', // Auth0 Callback URL
          audience: auth0Audience, // Request token for your backend API
          // scope: "openid profile email read:current_user update:current_user_metadata" // Add necessary scopes
        }}
      >
        <App />
      </Auth0Provider>
    </Router>
  </React.StrictMode>
);

