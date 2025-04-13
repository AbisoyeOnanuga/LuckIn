import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Define the base URL for your API from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ResumeUpload = ({ onUploadSuccess }) => { // Accept a callback prop
  const { getAccessTokenSilently } = useAuth0();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(''); // To show messages

  const handleFileChange = (event) => {
    // Reset status when a new file is selected
    setUploadStatus('');
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading and processing...'); // Update status message

    try {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        },
      });

      // Use FormData to send the file
      const formData = new FormData();
      // 'resumeFile' MUST match the key expected by multer on the backend
      formData.append('resumeFile', selectedFile);

      const response = await fetch(`${API_BASE_URL}/users/upload-resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // 'Content-Type' is set automatically by the browser for FormData
        },
        body: formData,
      });

      const result = await response.json(); // Always try to parse JSON response

      if (!response.ok) {
        // Use message from backend response if available, otherwise use status text
        throw new Error(result.message || `Upload failed with status: ${response.status}`);
      }

      // Success!
      setUploadStatus(`Success! ${result.message || 'Resume uploaded.'}`);
      setSelectedFile(null); // Clear file input visually (optional)
      // Reset the file input element value so the same file can be re-uploaded if needed
      if (document.getElementById('resume-upload-input')) {
        document.getElementById('resume-upload-input').value = '';
      }

      // Call the success callback passed from ProfilePage with the data from backend
      if (onUploadSuccess) {
        onUploadSuccess(result); // Pass the entire result object back
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="resume-upload-form">
      <h3>Upload/Update Resume</h3>
      <p>Upload a new resume (PDF or DOCX) to update your profile and job recommendations.</p>
      <input
        id="resume-upload-input" // Add an ID for resetting
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Be more specific with MIME types
        onChange={handleFileChange}
        disabled={isUploading}
        style={{ display: 'none', margin: '10px 0' }} // Basic styling
      />

      {/* Group label and file status */}
      <div className="file-input-group">
        <label htmlFor="resume-upload-input" className="resume-upload-label">
          Choose File
        </label>
        {/* --- Add this span to display file status --- */}
        <span className="file-selection-status">
          {selectedFile ? selectedFile.name : 'No file chosen'}
        </span>
      </div>

      <button
        type="submit"
        className="resume-upload-button"
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload Resume'}
      </button>
      {/* Display status messages */}
      {uploadStatus && (
        <p style={{ marginTop: '10px', color: uploadStatus.startsWith('Error') ? 'red' : 'green' }}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
};

export default ResumeUpload;
