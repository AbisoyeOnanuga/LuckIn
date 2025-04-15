# LuckIn

## Prerequisites
1. **Installed Software**:
   - Node.js and npm for managing dependencies.
   - MongoDB installed locally or using MongoDB Atlas for remote database access.

2. **Accounts & API Keys**:
    - Auth0 account for authentication setup.
    - API keys for Gemini, Spotify, Listen Notes, Coursera, or Udemy (if implemented).

## Steps to Set Up Locally
1. **Clone the Repository**:
    - Use git clone `"repo-link"` to pull the latest version of your codebase.
    - Navigate into the project directory: cd LuckIn.

2. **Backend Setup**:
   - Install dependencies: cd backend && npm install.
   - Create a .env file in the **backend** directory with the following variables:
    ```
        PORT = 5001
        MONGO_URI = "your-mongodb-uri"
        AUTH0_DOMAIN="your-auth0-domain"
        AUTH0_AUDIENCE="http://localhost:5001/api"
        GEMINI_API_KEY = "your-gemini-api-key"
        SPOTIFY_CLIENT_ID=your_spotify_client_id
        SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
        LISTENNOTES_API_KEY="your-listennotes-api-key"
    ```
    - Create a .env file in the **frontend** directory with the following variables:
    ```
        REACT_APP_AUTH0_DOMAIN="your-react-app-auth0-domain"
        REACT_APP_AUTH0_CLIENT_ID="your-react-app-auth0-client-id"
        REACT_APP_AUTH0_AUDIENCE="http://localhost:5001/api"
        REACT_APP_API_BASE_URL="http://localhost:5001/api"
    ```

3. **Frontend Setup**:
- Install dependencies: cd frontend && npm install.
- Adjust proxy settings or API endpoint URLs in the frontend code to point to the local backend - `http://localhost:5000/api`.
- Start the frontend server: `npm start`.

1. **Database Setup**:
- If using a local MongoDB instance, ensure it's running (mongod) and accessible.
- If using MongoDB Atlas, confirm your local IP is whitelisted in the Atlas dashboard.
- Seed initial data if required using scripts or manual entries.

1. **Test Locally**:
- Open the frontend in your browser `http://localhost:3000`.
- Use the app functionality to test user login, resume upload, job recommendations, and wellness features.