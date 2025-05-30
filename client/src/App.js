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
    <div className="split-layout">
      <div className="chat-panel">
        <div className="cv-assistant-container">
          <div className="upload-header">
            {/* Normal upload section - show when no file selected OR when file selected but not uploaded */}
            {!resumeData && !isUploading && (
              <div className="upload-section">
                {!selectedFile && (
                  <div className="upload-guidance">
                    <h3>🚀 Welcome to BD Assistant</h3>
                    <p>Transform your CV with cutting-edge AI technology in 3 simple steps:</p>
                    <div className="steps-guide">
                      <div className="step">
                        <span className="step-number">1</span>
                        <span className="step-text">Upload your CV (PDF, Word, or TXT)</span>
                      </div>
                      <div className="step">
                        <span className="step-number">2</span>
                        <span className="step-text">AI processes and enhances your content</span>
                      </div>
                      <div className="step">
                        <span className="step-number">3</span>
                        <span className="step-text">Chat for improvements & download</span>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`upload-area ${isDragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                  onDragOver={handleDrag}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  {!selectedFile ? (
                    <>
                      <div className="upload-icon">📄</div>
                      <h3 className="upload-title">Upload your CV</h3>
                      <p className="upload-subtitle">
                        Drop your CV here or <span className="browse-link" onClick={() => document.getElementById('fileInput').click()}>browse files</span>
                      </p>
                      <p className="upload-formats">Supports: Word (.docx) • Max 10MB</p>
                      <input
                        type="file"
                        id="fileInput"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        accept=".docx"
                      />
                    </>
                  ) : (
                    <div className="file-info">
                      <div className="file-selected">
                        <div className="file-icon">{getFileTypeDisplay(selectedFile)}</div>
                        <div className="file-details">
                          <div className="file-name">{selectedFile.name}</div>
                          <div className="file-size">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button className="remove-file" onClick={() => setSelectedFile(null)}>
                          ✕
                        </button>
                      </div>

                      <button
                        className="upload-btn"
                        onClick={uploadAndProcess}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Processing...' : '🚀 Transform My CV'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isUploading && (
              <div className="progress-section">
                <div className="processing-header">
                  <h3>🔄 Processing Your CV</h3>
                  <p>Please wait while we enhance your CV with AI...</p>
                </div>

                <div className="processing-stages">
                  <div className={`stage ${processingStage === 'uploading' || processingStage === 'parsing' ? 'active' : (processingStage === 'analyzing' || processingStage === 'formatting' || processingStage === 'finalizing' || processingStage === 'completed') ? 'completed' : ''}`}>
                    <div className="stage-icon">📤</div>
                    <div className="stage-text">Upload & Parse</div>
                  </div>
                  <div className={`stage ${processingStage === 'analyzing' ? 'active' : (processingStage === 'formatting' || processingStage === 'finalizing' || processingStage === 'completed') ? 'completed' : ''}`}>
                    <div className="stage-icon">🤖</div>
                    <div className="stage-text">AI Analysis</div>
                  </div>
                  <div className={`stage ${processingStage === 'formatting' || processingStage === 'finalizing' ? 'active' : processingStage === 'completed' ? 'completed' : ''}`}>
                    <div className="stage-icon">✨</div>
                    <div className="stage-text">Format & Enhance</div>
                  </div>
                  <div className={`stage ${processingStage === 'completed' ? 'completed' : ''}`}>
                    <div className="stage-icon">✅</div>
                    <div className="stage-text">Ready!</div>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  <div className="progress-percentage">{uploadProgress}%</div>
                </div>
                <div className="progress-text">{progressText || 'Initializing...'}</div>

                {/* Debug info - remove in production */}
                <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Debug: isUploading={isUploading.toString()}, progress={uploadProgress}, stage={processingStage}
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <div className="error-content">
                  <strong>Something went wrong</strong>
                  <p>{error}</p>
                  <button className="retry-btn" onClick={() => { setError(''); setSelectedFile(null); }}>
                    🔄 Try Again
                  </button>
                </div>
              </div>
            )}

            {resumeData && !isUploading && (
              <div className="success-section">
                <div className="success-header">
                  <div className="success-icon">🎉</div>
                  <div className="success-content">
                    <h3>CV Successfully Enhanced!</h3>
                    <p>Your CV for <strong>{resumeData.personalInfo?.name || 'Unknown'}</strong> has been processed and is ready for improvements.</p>
                  </div>
                </div>

                <div className="next-steps">
                  <h4>What's Next?</h4>
                  <div className="next-step-items">
                    <div className="next-step">
                      <span className="step-icon">💬</span>
                      <span>Chat below to request improvements</span>
                    </div>
                    <div className="next-step">
                      <span className="step-icon">👁️</span>
                      <span>Review your enhanced CV on the right</span>
                    </div>
                    <div className="next-step">
                      <span className="step-icon">📥</span>
                      <span>Download when you're satisfied</span>
                    </div>
                  </div>
                </div>

                <div className="action-buttons-compact">
                  <button
                    className="download-btn-small"
                    onClick={downloadDocx}
                  >
                    📥 Download CV
                  </button>
                  <button
                    className="reset-btn-small"
                    onClick={resetUpload}
                  >
                    🔄 New CV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="preview-panel">
        <div className="preview-panel-header">
          <h3>📄 Live Document Preview</h3>
          {resumeData && (
            <button
              className="download-btn-small"
              onClick={downloadDocx}
            >
              📥 Download
            </button>
          )}
        </div>

        <div className="preview-panel-content">
          {!resumeData ? (
            <div className="preview-placeholder">
              <div className="placeholder-icon">📄</div>
              <h4>CV Preview</h4>
              <p>Upload and process a CV to see the enhanced version here. The preview updates in real-time as you chat with the AI assistant.</p>
              <div className="preview-features">
                <div className="feature">✨ Real-time updates</div>
                <div className="feature">📋 Professional formatting</div>
                <div className="feature">🎯 Optimised content</div>
              </div>
            </div>
          ) : (
            <div className="document-preview" style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '11pt',
              lineHeight: '1.4',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '40px',
              maxWidth: '210mm',
              margin: '0 auto'
            }}>
              {/* Enhanced CV Indicator - Static */}
              <div className="enhanced-indicator">
                ✨ ENHANCED VERSION
              </div>

              {(() => {
                // Use enhanced resume data for preview
                const enhancedData = enhanceResumeForPreview(resumeData);

                return (
                  <div style={{ display: 'flex', gap: '30px' }}>
                    {/* Left Sidebar */}
                    <div style={{
                      width: '160px',
                      flexShrink: 0
                    }}>
                      {/* Name and Title at top */}
                      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                        <h1 style={{
                          fontSize: '18pt',
                          fontWeight: 'bold',
                          margin: '0 0 8px 0',
                          lineHeight: '1.2'
                        }}>
                          {enhancedData.personalInfo?.name || 'Ima Bishop'}
                        </h1>
                        <div style={{
                          fontSize: '10pt',
                          lineHeight: '1.3',
                          marginBottom: '15px'
                        }}>
                          {enhancedData.personalInfo?.title || 'Senior Consultant | Migration and Forced Displacement Workstream | Chair of the Board of IOD PARC Employee-Owned Trust'}
                        </div>
                      </div>

                      {/* Profile Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{
                          fontSize: '12pt',
                          fontWeight: 'bold',
                          margin: '0 0 8px 0',
                          textAlign: 'left'
                        }}>Profile</h3>
                        <div style={{
                          fontSize: '9pt',
                          lineHeight: '1.3',
                          textAlign: 'justify'
                        }}>
                          {enhancedData.summary || 'Ima is a multidisciplinary consultant experience specialising in migration and forced displacement. She has an MSc with Distinction in International and European Politics from the University of Edinburgh and trained with the International Centre for Migration Policy Development, giving her a strong grounding in core pillars of migration management and displacement. Her primary focus lies in humanitarian and protracted refugee responses, and she has a strong interest in the application of triple nexus approaches within fragile contexts.'}
                        </div>
                      </div>

                      {/* Nationality Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{
                          fontSize: '12pt',
                          fontWeight: 'bold',
                          margin: '0 0 8px 0'
                        }}>Nationality</h3>
                        <div style={{ fontSize: '9pt' }}>
                          {enhancedData.personalInfo?.nationality || 'British, New Zealand'}
                        </div>
                      </div>

                      {/* Languages Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{
                          fontSize: '12pt',
                          fontWeight: 'bold',
                          margin: '0 0 8px 0'
                        }}>Languages</h3>
                        <div style={{ fontSize: '9pt' }}>
                          {enhancedData.languages && enhancedData.languages.length > 0 ? (
                            enhancedData.languages.map((lang, index) => (
                              <div key={index}>
                                {typeof lang === 'object' ? `${lang.language} (${lang.proficiency})` : lang}
                              </div>
                            ))
                          ) : (
                            <div>
                              <div>English (Mother Tongue)</div>
                              <div>French (Independent)</div>
                              <div>Modern Standard Arabic (Basic)</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Qualifications Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{
                          fontSize: '12pt',
                          fontWeight: 'bold',
                          margin: '0 0 8px 0'
                        }}>Qualifications</h3>
                        <div>
                          {enhancedData.education && enhancedData.education.length > 0 ? (
                            enhancedData.education.map((edu, index) => (
                              <div key={index} style={{ marginBottom: '10px', fontSize: '9pt' }}>
                                <div style={{ fontWeight: 'bold' }}>
                                  {edu.degree || 'MSc International and European Politics, with Distinction'}
                                </div>
                                <div>{edu.institution || 'The University of Edinburgh'}, {edu.year || edu.graduationDate || '2017'}</div>
                                {edu.thesis && (
                                  <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
                                    <em>Thesis:</em> {edu.thesis}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '9pt' }}>
                              <div style={{ fontWeight: 'bold' }}>MSc International and European Politics, with Distinction</div>
                              <div>The University of Edinburgh, 2017</div>
                              <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
                                <em>Thesis:</em> 'Organisational Responses to the Syria Crisis in Greece and Serbia'
                              </div>
                              <div style={{ fontWeight: 'bold', marginTop: '8px' }}>BA (Hons) History and Politics</div>
                              <div>The University of Oxford, 2016</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Country Work Experience Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{
                          fontSize: '12pt',
                          fontWeight: 'bold',
                          margin: '0 0 8px 0'
                        }}>Country work experience</h3>
                        <div style={{ fontSize: '8pt', lineHeight: '1.2' }}>
                          <div><strong>Europe:</strong> UK, Germany, Malta, Spain and <strong>(remote)</strong> Bosnia and Herzegovina, Bulgaria, Italy, Greece, Serbia and Ukraine;</div>
                          <div><strong>MENA:</strong> Egypt, Jordan and <strong>(remote)</strong> Iraq, Lebanon, Occupied Palestinian Territories, Syria, Tunisia;</div>
                          <div><strong>LAC:</strong> The Bahamas and <strong>(remote)</strong> Trinidad and Tobago and Mexico;</div>
                          <div><strong>Asia (remote):</strong> Thailand, Myanmar, Malaysia, Bangladesh, Kyrgyzstan, Tajikistan, Kazakhstan, Uzbekistan;</div>
                          <div><strong>Africa:</strong> Kenya, Mozambique and <strong>(remote)</strong> Ethiopia, Mauritania, Niger and Uganda.</div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div style={{ flex: 1 }}>
                      {/* Experience Section */}
                      <div style={{ marginBottom: '30px' }}>
                        <h2 style={{
                          fontSize: '14pt',
                          fontWeight: 'bold',
                          margin: '0 0 15px 0'
                        }}>Experience:</h2>

                        {enhancedData.workExperience && enhancedData.workExperience.length > 0 ? (
                          enhancedData.workExperience.map((work, index) => (
                            <div key={index} style={{ marginBottom: '20px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                marginBottom: '8px'
                              }}>
                                <div style={{
                                  width: '120px',
                                  flexShrink: 0,
                                  fontSize: '10pt',
                                  fontWeight: 'bold'
                                }}>
                                  {work.dates || `${work.startDate || 'Aug 2024'} - ${work.endDate || 'present'}`}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontSize: '11pt',
                                    fontWeight: 'bold',
                                    marginBottom: '2px'
                                  }}>
                                    {work.position || 'Deputy Team Leader'}, {work.company || 'UNHCR'} – {work.description?.split('.')[0] || 'Multi-Country Evaluation of Phone-Based Contact Centres in MENA'}
                                  </div>
                                  <div style={{
                                    fontSize: '10pt',
                                    lineHeight: '1.4',
                                    textAlign: 'justify'
                                  }}>
                                    {work.description || 'Ima is responsible for team management across three countries and leads on financial and project management for the assignment. She is the methodology lead, Jordan and Tunisia country case study lead, and responsible for data collection, analysis and reporting.'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div>
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ width: '120px', flexShrink: 0, fontSize: '10pt', fontWeight: 'bold' }}>
                                  August 2024 - present
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '2px' }}>
                                    Deputy Team Leader, UNHCR – Multi-Country Evaluation of Phone-Based Contact Centres in MENA
                                  </div>
                                  <div style={{ fontSize: '10pt', lineHeight: '1.4', textAlign: 'justify' }}>
                                    Ima is responsible for team management across three countries and leads on financial and project management for the assignment. She is the methodology lead, Jordan and Tunisia country case study lead, and responsible for data collection, analysis and reporting.
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ width: '120px', flexShrink: 0, fontSize: '10pt', fontWeight: 'bold' }}>
                                  July 2024 – present
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '2px' }}>
                                    Quality Assurer, UNHCR – LTA for the provision of Evaluation Quality Assurance Services
                                  </div>
                                  <div style={{ fontSize: '10pt', lineHeight: '1.4', textAlign: 'justify' }}>
                                    Panel member for the Evaluation Quality Assurance LTA, a service delivered to UNHCR Evaluation Unit. Ima is responsible for the delivery of timely formative feedback on draft TOR, Inception Reports, and Evaluation reports.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Employment Section */}
                      <div style={{ marginBottom: '30px' }}>
                        <h2 style={{
                          fontSize: '14pt',
                          fontWeight: 'bold',
                          margin: '0 0 15px 0'
                        }}>Employment:</h2>

                        <div style={{ marginBottom: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <div style={{ width: '120px', flexShrink: 0, fontSize: '10pt', fontWeight: 'bold' }}>
                              January 2024 – present
                            </div>
                            <div style={{ flex: 1, fontSize: '10pt' }}>
                              <strong>Employee-Owned Trust Director, IOD PARC</strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <div style={{ width: '120px', flexShrink: 0, fontSize: '10pt', fontWeight: 'bold' }}>
                              Apr 2020 - present
                            </div>
                            <div style={{ flex: 1, fontSize: '10pt' }}>
                              <strong>Senior Consultant, IOD PARC</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Publications Section */}
                      {enhancedData.publications && enhancedData.publications.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                          <h2 style={{
                            fontSize: '14pt',
                            fontWeight: 'bold',
                            margin: '0 0 15px 0'
                          }}>Publications:</h2>

                          {enhancedData.publications.map((pub, index) => (
                            <div key={index} style={{
                              marginBottom: '12px',
                              fontSize: '10pt',
                              lineHeight: '1.4'
                            }}>
                              <div>
                                {pub.authors || 'Author Name'} {pub.year && `${pub.year}.`} <strong>'{pub.title || 'Publication Title'}'</strong>
                                {pub.journal && `, ${pub.journal}`}
                                {pub.location && `, ${pub.location}`}.
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
