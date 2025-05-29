import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(''); // Clear previous error
      setUploadResponse(null); // Clear previous response
    } else {
      setSelectedFile(null);
      setError('Please select a PDF file.');
      setUploadResponse(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError('');
    setUploadResponse(null);

    const formData = new FormData();
    formData.append('resume', selectedFile); // Key 'resume' must match backend (multer)

    try {
      const response = await axios.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadResponse(response.data);
      setSelectedFile(null); // Clear selection after successful upload
      if (onUploadSuccess && typeof onUploadSuccess === 'function') {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      console.error('Upload error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during upload.');
      }
      setUploadResponse(null);
    } finally {
      setUploading(false);
    }
  };

  const buttonStyle = {
    padding: '10px 15px',
    backgroundColor: uploading ? '#ccc' : '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: uploading ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    margin: '10px 0',
  };

  const containerStyle = {
    padding: '20px',
    border: '1px solid #eee',
    borderRadius: '8px',
    maxWidth: '500px',
    margin: '20px auto',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const fileInputStyle = {
    display: 'block',
    margin: '10px auto',
  };
  
  const messageStyle = {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
  };

  const errorStyle = {
    ...messageStyle,
    color: 'red',
    backgroundColor: '#ffebee',
  };

  const successStyle = {
    ...messageStyle,
    color: 'green',
    backgroundColor: '#e8f5e9',
  };
  
  const dataPreviewStyle = {
    textAlign: 'left',
    whiteSpace: 'pre-wrap', // To display JSON string nicely
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    padding: '10px',
    maxHeight: '200px',
    overflowY: 'auto',
    marginTop: '10px',
  };


  return (
    <div style={containerStyle}>
      <h2>Upload Your Resume</h2>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        style={fileInputStyle}
        disabled={uploading}
      />
      {selectedFile && <p>Selected file: {selectedFile.name}</p>}
      
      <button
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
        style={buttonStyle}
      >
        {uploading ? 'Uploading...' : 'Upload Resume'}
      </button>

      {error && <p style={errorStyle}>Error: {error}</p>}
      
      {uploadResponse && (
        <div style={successStyle}>
          <p>{uploadResponse.message}</p>
          {uploadResponse.id && <p>Resume ID: {uploadResponse.id}</p>}
          {uploadResponse.data && (
            <div>
              <p>Processed Data:</p>
              <pre style={dataPreviewStyle}>
                {JSON.stringify(uploadResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
