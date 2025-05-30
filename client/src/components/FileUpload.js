import React, { useState, useRef } from 'react';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess, onBulkUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    setError('');
    setUploadResults(null);

    if (!files || files.length === 0) {
      setError('Please select at least one PDF file.');
      return;
    }

    // Validate files
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file, index) => {
      if (file.type !== 'application/pdf') {
        errors.push(`File ${index + 1} (${file.name}): Only PDF files are allowed`);
      } else if (file.size > 5 * 1024 * 1024) {
        errors.push(`File ${index + 1} (${file.name}): File size must be under 5MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
      return;
    }

    if (validFiles.length === 0) {
      setError('No valid files selected.');
      return;
    }

    // Determine upload mode based on file count
    if (validFiles.length === 1) {
      uploadSingleFile(validFiles[0]);
    } else {
      uploadMultipleFiles(validFiles);
    }
  };

  const uploadSingleFile = async (file) => {
    setIsUploading(true);
    setUploadProgress({ [file.name]: 0 });

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await axios.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ [file.name]: progress });
        },
      });

      console.log('Single file upload successful:', response.data);

      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Single file upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
      setError(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const uploadMultipleFiles = async (files) => {
    setIsUploading(true);

    // Initialize progress for all files
    const initialProgress = {};
    files.forEach(file => {
      initialProgress[file.name] = 0;
    });
    setUploadProgress(initialProgress);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('resumes', file);
      });

      const response = await axios.post('/api/resume/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Update progress for all files (bulk upload doesn't provide individual file progress)
          const updatedProgress = {};
          files.forEach(file => {
            updatedProgress[file.name] = progress;
          });
          setUploadProgress(updatedProgress);
        },
      });

      console.log('Bulk upload successful:', response.data);
      setUploadResults(response.data);

      if (onBulkUploadSuccess) {
        onBulkUploadSuccess(response.data);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Bulk upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Bulk upload failed';
      setError(`Bulk upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    handleFileSelect(files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const containerStyle = {
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const uploadAreaStyle = {
    border: `2px dashed ${dragActive ? '#3498db' : '#bdc3c7'}`,
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: dragActive ? '#f8f9fa' : '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '20px'
  };

  const modeToggleStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
    gap: '10px'
  };

  const toggleButtonStyle = {
    padding: '8px 16px',
    border: '1px solid #bdc3c7',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  };

  const activeToggleStyle = {
    ...toggleButtonStyle,
    backgroundColor: '#3498db',
    color: 'white',
    borderColor: '#3498db'
  };

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '5px'
  };

  const progressFillStyle = (progress) => ({
    height: '100%',
    backgroundColor: '#3498db',
    width: `${progress}%`,
    transition: 'width 0.3s ease'
  });

  const resultStyle = {
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#e8f5e8',
    border: '1px solid #27ae60',
    borderRadius: '5px',
    color: '#27ae60'
  };

  const errorStyle = {
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#ffebee',
    border: '1px solid #e74c3c',
    borderRadius: '5px',
    color: '#e74c3c'
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '20px' }}>
        Upload Resume{uploadMode === 'bulk' ? 's' : ''}
      </h2>

      {/* Mode Toggle */}
      <div style={modeToggleStyle}>
        <button
          style={uploadMode === 'single' ? activeToggleStyle : toggleButtonStyle}
          onClick={() => setUploadMode('single')}
          disabled={isUploading}
        >
          📄 Single Upload
        </button>
        <button
          style={uploadMode === 'bulk' ? activeToggleStyle : toggleButtonStyle}
          onClick={() => setUploadMode('bulk')}
          disabled={isUploading}
        >
          📚 Bulk Upload
        </button>
      </div>

      {/* Upload Area */}
      <div
        style={uploadAreaStyle}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple={uploadMode === 'bulk'}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        <div style={{ fontSize: '48px', marginBottom: '15px' }}>
          {uploadMode === 'single' ? '📄' : '📚'}
        </div>

        <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          {dragActive ? 'Drop files here' :
            uploadMode === 'single' ? 'Upload a Resume' : 'Upload Multiple Resumes'}
        </h3>

        <p style={{ color: '#7f8c8d', margin: '10px 0' }}>
          {uploadMode === 'single'
            ? 'Drag and drop a PDF file here, or click to select'
            : 'Drag and drop PDF files here, or click to select multiple files'
          }
        </p>

        <p style={{ color: '#95a5a6', fontSize: '12px' }}>
          Maximum file size: 5MB | Supported format: PDF only
          {uploadMode === 'bulk' && <br />}
          {uploadMode === 'bulk' && 'Maximum 10 files per upload'}
        </p>

        {!isUploading && (
          <button
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '15px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
          >
            Choose File{uploadMode === 'bulk' ? 's' : ''}
          </button>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Upload Progress:</h4>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '14px', color: '#2c3e50' }}>{fileName}</span>
                <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{progress}%</span>
              </div>
              <div style={progressBarStyle}>
                <div style={progressFillStyle(progress)}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={errorStyle}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Bulk Upload Results */}
      {uploadResults && (
        <div style={resultStyle}>
          <h4 style={{ margin: '0 0 10px 0' }}>Upload Complete!</h4>
          <p style={{ margin: '5px 0' }}>
            <strong>Summary:</strong> {uploadResults.summary.successful} successful, {uploadResults.summary.failed} failed out of {uploadResults.summary.total} files
          </p>

          {uploadResults.results.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong>Successfully Processed:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {uploadResults.results.map((result, index) => (
                  <li key={index} style={{ margin: '2px 0' }}>
                    {result.fileName} (ID: {result.id})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploadResults.errors.length > 0 && (
            <div style={{ marginTop: '15px', color: '#e74c3c' }}>
              <strong>Errors:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {uploadResults.errors.map((error, index) => (
                  <li key={index} style={{ margin: '2px 0' }}>
                    {error.fileName}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        fontSize: '14px',
        color: '#2c3e50'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>How it works:</h4>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Select single or bulk upload mode</li>
          <li>Choose PDF resume files (max 5MB each)</li>
          <li>Files are automatically processed using AI</li>
          <li>View, edit, and download processed resumes</li>
        </ol>
      </div>
    </div>
  );
};

export default FileUpload;
