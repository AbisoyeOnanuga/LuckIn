import { auth } from 'express-oauth2-jwt-bearer';
import config from '../config/index.js';

// Configure the Auth0 middleware
const checkJwt = auth({
    audience: config.auth0.audience, // The API identifier you set up in Auth0
    issuerBaseURL: `https://${config.auth0.domain}/`, // Your Auth0 domain
    tokenSigningAlg: 'RS256'
});

export default checkJwt;
