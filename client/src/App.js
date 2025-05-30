import React, { useState, useRef, useEffect } from 'react';
import './App.css';

/**
 * Enhances resume data for preview by providing default values and structure
 * @param {Object} data - Raw resume data
 * @returns {Object} - Enhanced resume data with defaults
 */
function enhanceResumeForPreview(data) {
  if (!data) return {};

  // Ensure all major sections exist with defaults
  return {
    personalInfo: {
      name: data.personalInfo?.name || 'Name Not Found',
      title: data.personalInfo?.title || 'Title Not Found',
      nationality: data.personalInfo?.nationality || 'Not Specified',
      ...data.personalInfo
    },
    summary: data.summary || 'No summary provided.',
    workExperience: Array.isArray(data.workExperience) ? data.workExperience : [],
    education: Array.isArray(data.education) ? data.education : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    publications: Array.isArray(data.publications) ? data.publications : [],
    ...data
  };
}

function App() {
  const [currentSection, setCurrentSection] = useState('cv-assistant');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const fileInputRef = useRef(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 State update:', {
      selectedFile: selectedFile?.name || 'none',
      isUploading,
      uploadProgress,
      processingStage,
      resumeData: !!resumeData
    });
  }, [selectedFile, isUploading, uploadProgress, processingStage, resumeData]);

  const isValidFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx only
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  };

  const getFileTypeDisplay = (file) => {
    return '📝 Word Document';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid file (PDF, Word, or Text, max 10MB)');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    console.log('📁 File selected from input:', file);
    if (file) {
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      if (isValidFile(file)) {
        console.log('✅ File is valid, setting selected file');
        setSelectedFile(file);
        setError('');
      } else {
        console.log('❌ File is invalid');
        setError('Please select a valid file (PDF, Word, or Text, max 10MB)');
        e.target.value = '';
      }
    } else {
      console.log('❌ No file selected');
    }
  };

  const uploadAndProcess = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    console.log('🚀 Starting upload process for:', selectedFile.name);

    // Force UI update to show progress immediately
    setIsUploading(true);
    setUploadProgress(5);
    setProgressText('Starting upload...');
    setProcessingStage('uploading');
    setError('');

    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);

      console.log('📤 Sending upload request...');
      setProgressText('Uploading document to server...');
      setUploadProgress(15);

      const response = await fetch('http://localhost:5000/api/resume/upload-progress', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      console.log('✅ Upload successful, starting SSE processing...');
      setProgressText('Document uploaded successfully. Starting AI processing...');
      setUploadProgress(25);
      setProcessingStage('processing');

      // Check if response body exists
      if (!response.body) {
        throw new Error('No response body received from server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('📡 Starting to read SSE stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('📡 SSE stream completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim()) {
            console.log('📥 SSE line received:', line);
            try {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                console.log('🔄 SSE data parsed:', data);

                // Handle progress updates
                if (typeof data.progress === 'number') {
                  console.log(`📊 Progress update: ${data.progress}%`);
                  setUploadProgress(data.progress);

                  // Update progress text based on message or progress
                  if (data.message) {
                    setProgressText(data.message);
                  }
                }

                // Handle stage updates
                if (data.stage) {
                  console.log(`🎭 Stage update: ${data.stage}`);
                  setProcessingStage(data.stage);
                }

                // Handle final result
                if (data.type === 'result' && data.success && data.data) {
                  console.log('🎉 Final result received:', data.data);
                  console.log('🔍 Data structure check:');
                  console.log('- ID:', data.data.id);
                  console.log('- fileName:', data.data.fileName);
                  console.log('- personalInfo:', data.data.data?.personalInfo);
                  console.log('- summary length:', data.data.data?.summary?.length);
                  console.log('- workExperience count:', data.data.data?.workExperience?.length);
                  console.log('- Full data keys:', Object.keys(data.data));

                  setProgressText('✅ CV processing completed successfully!');
                  setUploadProgress(100);
                  setProcessingStage('completed');

                  setTimeout(() => {
                    console.log('📋 Setting resumeData state...');

                    // Extract the actual CV data and add the ID to it
                    const actualCVData = data.data.data || {};
                    const resumeDataWithId = {
                      ...actualCVData,
                      id: data.data.id,
                      fileName: data.data.fileName,
                      fileType: data.data.fileType
                    };

                    console.log('🔍 Final resumeData with ID:', resumeDataWithId);
                    console.log('✅ Resume ID confirmed:', resumeDataWithId.id);

                    setResumeData(resumeDataWithId);
                    setIsUploading(false);
                    setProcessingStage('ready');
                    console.log('✅ resumeData state updated with ID');
                  }, 1000);
                }

                // Handle error result
                if (data.type === 'result' && !data.success) {
                  console.error('❌ Error result received:', data.error);
                  throw new Error(data.error || 'Processing failed');
                }
              }
            } catch (e) {
              console.error('❌ Error parsing SSE data:', e, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setError(error.message || 'An error occurred during upload');
      setIsUploading(false);
      setProcessingStage('');
      setProgressText('');
      setUploadProgress(0);
    }
  };

  const downloadDocx = async () => {
    if (!resumeData?.id) {
      console.error('❌ No resume ID available for download');
      console.log('Current resumeData:', resumeData);
      setError('No resume data available for download');
      return;
    }

    console.log('📥 Starting download for resume ID:', resumeData.id);

    try {
      const response = await fetch(`http://localhost:5000/api/resume/${resumeData.id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Download failed:', response.status, errorText);
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${resumeData.personalInfo?.name || resumeData.fileName || 'resume'}_IODPARC.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Download completed successfully');
    } catch (error) {
      console.error('Download error:', error);
      setError(error.message || 'Failed to download the document');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setProgressText('');
    setProcessingStage('');
    setError('');
    setResumeData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderCVAssistant = () => (
    <div className="modern-layout">
      <div className="central-panel">
        <div className="cv-assistant-container">

          {/* Welcome Section - Only show when no file and not processing */}
          {!resumeData && !isUploading && !selectedFile && (
            <div className="welcome-section">
              <div className="welcome-header">
                <h2>AI-Powered CV Transformation</h2>
                <p className="welcome-subtitle">
                  Transform your CV into IOD PARC format using advanced AI processing
                </p>
              </div>

              <div className="process-overview">
                <div className="process-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Upload Document</h4>
                    <p>Select your CV file (Word format supported)</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>AI Processing</h4>
                    <p>Advanced extraction and content analysis</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Download Result</h4>
                    <p>Get your professionally formatted CV</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area - Central and Prominent */}
          {!resumeData && !isUploading && (
            <div className="upload-section-modern">
              <div
                className={`upload-area-modern ${isDragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDragOver={handleDrag}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {!selectedFile ? (
                  <div className="upload-content">
                    <div className="upload-icon-modern">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10,9 9,9 8,9" />
                      </svg>
                    </div>
                    <h3 className="upload-title-modern">Select your CV file</h3>
                    <p className="upload-subtitle-modern">
                      Drag and drop your file here, or <button className="browse-button" onClick={() => document.getElementById('fileInput').click()}>browse files</button>
                    </p>
                    <div className="upload-formats-modern">
                      Supported: Word Documents (.docx) • Maximum size: 10MB
                    </div>
                    <input
                      type="file"
                      id="fileInput"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                      accept=".docx"
                    />
                  </div>
                ) : (
                  <div className="file-selected-modern">
                    <div className="file-info-modern">
                      <div className="file-icon-modern">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      </div>
                      <div className="file-details-modern">
                        <div className="file-name-modern">{selectedFile.name}</div>
                        <div className="file-size-modern">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Word Document
                        </div>
                      </div>
                      <button
                        className="remove-file-modern"
                        onClick={() => setSelectedFile(null)}
                        aria-label="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <button
                      className="process-button-modern"
                      onClick={uploadAndProcess}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Processing...' : 'Transform CV'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Section - Clean and Clear */}
          {isUploading && (
            <div className="processing-section-modern">
              <div className="processing-header-modern">
                <h3>Processing Your CV</h3>
                <p>Please wait while we analyze and transform your document</p>
              </div>

              <div className="processing-stages-modern">
                <div className={`stage-modern ${processingStage === 'uploading' || processingStage === 'parsing' ? 'active' : (processingStage === 'analyzing' || processingStage === 'formatting' || processingStage === 'finalizing' || processingStage === 'completed') ? 'completed' : ''}`}>
                  <div className="stage-indicator"></div>
                  <div className="stage-content">
                    <h4>Document Upload</h4>
                    <p>Uploading and parsing document structure</p>
                  </div>
                </div>

                <div className={`stage-modern ${processingStage === 'analyzing' ? 'active' : (processingStage === 'formatting' || processingStage === 'finalizing' || processingStage === 'completed') ? 'completed' : ''}`}>
                  <div className="stage-indicator"></div>
                  <div className="stage-content">
                    <h4>AI Analysis</h4>
                    <p>Extracting and analyzing content with AI</p>
                  </div>
                </div>

                <div className={`stage-modern ${processingStage === 'formatting' || processingStage === 'finalizing' ? 'active' : processingStage === 'completed' ? 'completed' : ''}`}>
                  <div className="stage-indicator"></div>
                  <div className="stage-content">
                    <h4>Document Formatting</h4>
                    <p>Generating IOD PARC formatted document</p>
                  </div>
                </div>

                <div className={`stage-modern ${processingStage === 'completed' ? 'completed' : ''}`}>
                  <div className="stage-indicator"></div>
                  <div className="stage-content">
                    <h4>Complete</h4>
                    <p>Document ready for download</p>
                  </div>
                </div>
              </div>

              <div className="progress-container-modern">
                <div className="progress-bar-modern">
                  <div className="progress-fill-modern" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="progress-info-modern">
                  <span className="progress-percentage-modern">{uploadProgress}%</span>
                  <span className="progress-text-modern">{progressText || 'Initializing...'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Section */}
          {error && (
            <div className="error-section-modern">
              <div className="error-icon-modern">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div className="error-content-modern">
                <h4>Processing Error</h4>
                <p>{error}</p>
                <button className="retry-button-modern" onClick={() => { setError(''); setSelectedFile(null); }}>
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Success Section */}
          {resumeData && !isUploading && (
            <div className="success-section-modern">
              <div className="success-header-modern">
                <div className="success-icon-modern">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                <div className="success-content-modern">
                  <h3>CV Transformation Complete</h3>
                  <p>Your CV has been successfully processed and formatted according to IOD PARC standards.</p>
                </div>
              </div>

              <div className="extracted-content-preview">
                <h4>Extracted Content Summary</h4>
                <div className="content-sections">
                  {resumeData.experience && resumeData.experience.length > 0 && (
                    <div className="content-section">
                      <span className="section-label">Experience:</span>
                      <span className="section-count">{resumeData.experience.length} entries extracted</span>
                    </div>
                  )}
                  {resumeData.publications && resumeData.publications.length > 0 && (
                    <div className="content-section">
                      <span className="section-label">Publications:</span>
                      <span className="section-count">{resumeData.publications.length} publications found</span>
                    </div>
                  )}
                  {resumeData.qualifications && resumeData.qualifications.length > 0 && (
                    <div className="content-section">
                      <span className="section-label">Qualifications:</span>
                      <span className="section-count">{resumeData.qualifications.length} qualifications extracted</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="action-buttons-modern">
                <button
                  className="download-button-modern primary"
                  onClick={downloadDocx}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download CV
                </button>
                <button
                  className="download-button-modern secondary"
                  onClick={resetUpload}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23,4 23,10 17,10" />
                    <path d="M20.49,15a9,9,0,1,1-2.12-9.36L23,10" />
                  </svg>
                  Process New CV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (currentSection) {
      case 'cv-assistant':
        return renderCVAssistant();

      case 'cv-search':
        return (
          <div className="content-body">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>🔍</div>
              <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>CV Search</h3>
              <p style={{ color: '#888888' }}>Search functionality coming soon...</p>
            </div>
          </div>
        );

      case 'browse-cvs':
        return (
          <div className="content-body">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📂</div>
              <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>Browse CVs</h3>
              <p style={{ color: '#888888' }}>CV browser coming soon...</p>
            </div>
          </div>
        );

      default:
        return renderCVAssistant();
    }
  };

  return (
    <div className="App">
      <div className="app-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h1 className="app-title">BD Assistant</h1>
          </div>

          <div className="sidebar-section">
            <div className="section-title">CV PROCESSING</div>
            <button
              className={`sidebar-item ${currentSection === 'cv-assistant' ? 'active' : ''}`}
              onClick={() => setCurrentSection('cv-assistant')}
            >
              <span className="sidebar-item-icon">🤖</span>
              CV Assistant
            </button>
          </div>

          <div className="sidebar-section">
            <div className="section-title">SEARCH / ANALYSIS</div>
            <button
              className={`sidebar-item ${currentSection === 'cv-search' ? 'active' : ''}`}
              onClick={() => setCurrentSection('cv-search')}
            >
              <span className="sidebar-item-icon">🔍</span>
              CV Search
            </button>
            <button
              className={`sidebar-item ${currentSection === 'browse-cvs' ? 'active' : ''}`}
              onClick={() => setCurrentSection('browse-cvs')}
            >
              <span className="sidebar-item-icon">📂</span>
              Browse CVs
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Model Indicator - Top Right */}
          <div className="model-indicator-topright">
            Claude 3.5 Sonnet
          </div>

          <div className="content-header">
            <h1 className="content-title">
              {currentSection === 'cv-assistant' && 'AI CV Assistant'}
              {currentSection === 'cv-search' && 'CV Search'}
              {currentSection === 'browse-cvs' && 'Browse CVs'}
            </h1>
          </div>
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
