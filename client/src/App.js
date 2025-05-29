import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload'; // Import the FileUpload component

function App() {
  const [processedResume, setProcessedResume] = useState(null);
  const [error, setError] = useState('');

  // Handler for successful upload and processing
  const handleUploadSuccess = (data) => {
    console.log('Upload successful! Data received in App.js:', data);
    if (data && data.data) { // Assuming the structured data is in data.data from the backend response
      setProcessedResume(data.data);
      setError(''); // Clear any previous errors
    } else {
      console.error('Received data is not in the expected format:', data);
      setError('Received data is not in the expected format.');
      setProcessedResume(null);
    }
  };
  
  const appStyle = {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    marginTop: '20px',
  };

  const resumeDataStyle = {
    textAlign: 'left',
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };
  
  const preStyle = {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    padding: '15px',
    borderRadius: '5px',
    maxHeight: '500px',
    overflowY: 'auto',
  };

  const errorStyle = {
    color: 'red',
    margin: '10px 0',
    padding: '10px',
    backgroundColor: '#ffebee',
    border: '1px solid red',
    borderRadius: '5px',
  };


  return (
    <div style={appStyle}>
      <header>
        <h1>AI Resume Transformation Tool</h1>
      </header>
      <main>
        <FileUpload onUploadSuccess={handleUploadSuccess} />
        
        {error && <div style={errorStyle}><p>Error in App: {error}</p></div>}

        {processedResume && (
          <div style={resumeDataStyle}>
            <h2>Processed Resume Data:</h2>
            <pre style={preStyle}>{JSON.stringify(processedResume, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
