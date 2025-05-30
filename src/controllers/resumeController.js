const fs = require('fs');
const path = require('path');
const { parseWordDocument } = require('../services/wordParserService');
const { parsePdf } = require('../services/pdfParserService');
const { processResumeWithOpenRouter } = require('../services/openRouterService');
const { generateResumeDocx } = require('../services/docxGeneratorService');
const { storeResumeData, getAllResumes, getResumeById, updateResumeData, deleteResume } = require('../services/sqliteDatabaseService');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { processCv } = require('../../services/cvProcessor');
const { generateTemplateMatchingDocx } = require('../../services/templateDocxGenerator');

// Helper function to check if file is a Word document
function isWordDocument(fileName) {
  const wordExtensions = ['.doc', '.docx'];
  return wordExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

/**
 * Parse document based on file type (PDF or Word)
 * @param {string} filePath - Path to the file
 * @param {string} fileName - Name of the file
 * @returns {Promise<string>} - Extracted text content
 */
async function parseDocument(filePath, fileName) {
  if (isWordDocument(fileName)) {
    console.log('📄 Detected Word document, using Word parser');
    return await parseWordDocument(filePath);
  } else if (fileName.toLowerCase().endsWith('.pdf')) {
    console.log('📋 Detected PDF document, using PDF parser');
    return await parsePdf(filePath);
  } else {
    throw new Error('Unsupported file format. Please upload a PDF or Word document (.pdf, .docx, .doc)');
  }
}

/**
 * Controller for handling CV upload and processing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleResumeUploadAndProcess(req, res) {
  let tempFilePath = null;

  try {
    console.log('📤 CV upload request received');

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded. Please select a PDF or Word document.',
        error: 'NO_FILE_UPLOADED'
      });
    }

    tempFilePath = req.file.path;
    const fileName = req.file.originalname;
    console.log(`📂 File uploaded: ${fileName}`);

    // Validate file type
    const isValidFile = fileName.toLowerCase().endsWith('.pdf') || isWordDocument(fileName);
    if (!isValidFile) {
      throw new Error('Invalid file type. Please upload a PDF or Word document (.pdf, .docx, .doc)');
    }

    // Parse document (PDF or Word)
    console.log('🔍 Starting document parsing...');
    const extractedText = await parseDocument(tempFilePath, fileName);
    console.log(`✅ Document parsed successfully! Text length: ${extractedText.length} characters`);

    // Process with OpenRouter AI
    console.log('🤖 Starting AI processing...');
    const processedData = await processResumeWithOpenRouter(extractedText);
    console.log('✅ AI processing completed');

    // Store in database
    console.log('💾 Storing in database...');
    const resumeId = await storeResumeData(fileName, processedData, 'processed', extractedText);
    console.log(`✅ CV stored with ID: ${resumeId}`);

    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('🧹 Temporary file cleaned up');
    }

    // Return success response
    res.status(200).json({
      message: 'CV processed successfully!',
      id: resumeId,
      data: processedData,
      fileName: fileName,
      fileType: isWordDocument(fileName) ? 'word' : 'pdf'
    });

  } catch (error) {
    console.error('❌ Error in handleResumeUploadAndProcess:', error);

    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 Temporary file cleaned up after error');
      } catch (cleanupError) {
        console.error('❌ Error cleaning up temporary file:', cleanupError);
      }
    }

    // Return error response
    const statusCode = error.message.includes('API key') ? 401 : 500;
    res.status(statusCode).json({
      message: 'Failed to process CV',
      error: error.message
    });
  }
}

/**
 * Controller for handling bulk resume upload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleBulkResumeUpload(req, res) {
  const tempFiles = [];

  try {
    console.log('Bulk upload request received');

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded. Please select PDF files.',
        error: 'NO_FILES_UPLOADED'
      });
    }

    console.log(`Processing ${req.files.length} files`);
    const results = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      tempFiles.push(file.path);

      try {
        console.log(`Processing file ${i + 1}/${req.files.length}: ${file.originalname}`);

        // Parse PDF
        const extractedText = await parseDocument(file.path, file.originalname);

        // Process with AI
        const processedData = await processResumeWithOpenRouter(extractedText);

        // Store in database
        const resumeId = await storeResumeData(file.originalname, processedData, 'processed', extractedText);

        results.push({
          id: resumeId,
          fileName: file.originalname,
          status: 'success',
          data: processedData
        });

        console.log(`File ${i + 1} processed successfully: ${file.originalname}`);

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        errors.push({
          fileName: file.originalname,
          error: fileError.message
        });
      }
    }

    // Clean up temporary files
    tempFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Return response
    const response = {
      message: `Bulk upload completed. ${results.length} files processed successfully, ${errors.length} errors.`,
      results,
      errors,
      summary: {
        total: req.files.length,
        successful: results.length,
        failed: errors.length
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in handleBulkResumeUpload:', error);

    // Clean up temporary files in case of error
    tempFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary file:', cleanupError);
        }
      }
    });

    res.status(500).json({
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
}

/**
 * Controller for getting all resumes with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllResumesController(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    console.log(`Getting resumes: page=${page}, limit=${limit}, status=${status}, search=${search}`);

    const resumes = await getAllResumes(page, limit, status, search);

    res.status(200).json({
      message: 'Resumes retrieved successfully',
      data: resumes.data,
      pagination: resumes.pagination
    });

  } catch (error) {
    console.error('Error in getAllResumesController:', error);
    res.status(500).json({
      message: 'Failed to retrieve resumes',
      error: error.message
    });
  }
}

/**
 * Controller for getting a specific resume by ID
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 */
async function getResumeController(req, res) {
  try {
    const resumeId = req.params.id;
    console.log(`Getting resume with ID: ${resumeId}`);

    const resume = await getResumeById(resumeId);

    if (!resume) {
      return res.status(404).json({
        message: 'Resume not found',
        id: resumeId
      });
    }

    res.status(200).json(resume);

  } catch (error) {
    console.error('Error in getResumeController:', error);
    res.status(500).json({
      message: 'Failed to retrieve resume',
      error: error.message
    });
  }
}

/**
 * Controller for updating a specific resume by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 */
async function updateResumeController(req, res) {
  try {
    const resumeId = req.params.id;
    const { editedData, newStatus } = req.body;

    console.log(`Updating resume with ID: ${resumeId}`);

    if (!editedData) {
      return res.status(400).json({
        message: 'No data provided for update',
        error: 'MISSING_DATA'
      });
    }

    const updatedResume = await updateResumeData(resumeId, editedData, newStatus);

    if (!updatedResume) {
      return res.status(404).json({
        message: 'Resume not found',
        id: resumeId
      });
    }

    res.status(200).json({
      message: 'Resume updated successfully',
      data: updatedResume
    });

  } catch (error) {
    console.error('Error in updateResumeController:', error);
    res.status(500).json({
      message: 'Failed to update resume',
      error: error.message
    });
  }
}

/**
 * Controller for downloading a CV as .docx file with template-based generation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function downloadResumeDocxController(req, res) {
  try {
    const resumeId = req.params.id;

    // Get resume data from database
    const resume = await getResumeById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Generate DOCX using template-matching generator
    const docxBuffer = await generateTemplateMatchingDocx(resume.extractedData);

    // Create filename using original filename + _IODPARC.docx
    const baseFilename = resume.fileName
      .replace(/\.[^/.]+$/, '') // Remove existing extension (.pdf, .docx, etc.)
      .replace(/[^a-zA-Z0-9\-_\s]/g, '_') // Replace special chars but keep hyphens, underscores, spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    const filename = `${baseFilename}_IODPARC_Template.docx`;

    // Send the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);

  } catch (error) {
    console.error('❌ Error generating template-matching DOCX:', error);
    res.status(500).json({
      message: 'Failed to generate DOCX with template formatting',
      error: error.message
    });
  }
}

/**
 * Controller for deleting a resume by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteResumeController(req, res) {
  try {
    const resumeId = req.params.id;
    console.log(`Deleting resume with ID: ${resumeId}`);

    const deleted = await deleteResume(resumeId);

    if (!deleted) {
      return res.status(404).json({
        message: 'Resume not found',
        id: resumeId
      });
    }

    res.status(200).json({
      message: 'Resume deleted successfully',
      id: resumeId
    });

  } catch (error) {
    console.error('Error in deleteResumeController:', error);
    res.status(500).json({
      message: 'Failed to delete resume',
      error: error.message
    });
  }
}

/**
 * Controller for handling CV upload with real-time progress tracking via SSE
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleResumeUploadWithProgress(req, res) {
  let tempFilePath = null;

  try {
    console.log('📤 CV upload request with progress tracking received');

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded. Please select a Word document (.docx).',
        error: 'NO_FILE_UPLOADED'
      });
    }

    tempFilePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = 'Word';
    console.log(`📂 File uploaded: ${fileName} (${fileType})`);

    // Validate file type
    const isValidFile = fileName.toLowerCase().endsWith('.docx');
    if (!isValidFile) {
      return res.status(400).json({
        message: 'Invalid file type. Please upload a Word document (.docx)',
        error: 'INVALID_FILE_TYPE'
      });
    }

    // Set up Server-Sent Events for progress tracking
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendProgress = (stage, progress, message) => {
      const data = JSON.stringify({
        stage,
        progress,
        message,
        timestamp: new Date().toISOString(),
        fileType
      });
      res.write(`data: ${data}\n\n`);
    };

    // Stage 1: Document Parsing (10-30%)
    sendProgress('parsing', 10, `🔍 Starting ${fileType} document parsing...`);

    const extractedText = await parseDocument(tempFilePath, fileName);
    sendProgress('parsing', 30, `✅ ${fileType} parsed successfully! Extracted ${extractedText.length} characters.`);

    console.log(`${fileType} parsed successfully. Text length: ${extractedText.length} characters`);

    // Stage 2: AI Processing (30-80%)
    sendProgress('ai-processing', 30, '🤖 Sending data to AI for intelligent extraction...');

    const processedData = await processResumeWithOpenRouter(extractedText, (aiProgress) => {
      // Callback for AI processing progress
      const overallProgress = 30 + (aiProgress * 0.5); // AI takes 50% of total progress
      sendProgress('ai-processing', overallProgress, '🧠 AI analyzing CV structure and content...');
    });

    sendProgress('ai-processing', 80, '✅ AI processing completed successfully!');
    console.log('AI processing completed');

    // Stage 3: Database Storage (80-90%)
    sendProgress('storing', 80, '💾 Saving processed data to database...');

    const resumeId = await storeResumeData(fileName, processedData, 'processed', extractedText);
    sendProgress('storing', 90, `✅ CV stored with ID: ${resumeId}`);

    console.log(`CV stored with ID: ${resumeId}`);

    // Stage 4: Cleanup and Completion (90-100%)
    sendProgress('finishing', 90, '🧹 Cleaning up temporary files...');

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('Temporary file cleaned up');
    }

    sendProgress('complete', 100, '🎉 CV transformation completed successfully!');

    // Send final result
    const finalResult = JSON.stringify({
      type: 'result',
      success: true,
      data: {
        id: resumeId,
        data: processedData,
        fileName: fileName,
        fileType: fileType.toLowerCase()
      }
    });
    res.write(`data: ${finalResult}\n\n`);
    res.end();

  } catch (error) {
    console.error('❌ Error in handleResumeUploadWithProgress:', error);

    // Send error progress update
    const errorData = JSON.stringify({
      stage: 'error',
      progress: 0,
      message: `❌ Error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    res.write(`data: ${errorData}\n\n`);

    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 Temporary file cleaned up after error');
      } catch (cleanupError) {
        console.error('❌ Error cleaning up temporary file:', cleanupError);
      }
    }

    // Send final error result
    const errorResult = JSON.stringify({
      type: 'result',
      success: false,
      error: error.message
    });
    res.write(`data: ${errorResult}\n\n`);
    res.end();
  }
}

module.exports = {
  handleResumeUploadAndProcess,
  handleBulkResumeUpload,
  getAllResumesController,
  getResumeController,
  updateResumeController,
  downloadResumeDocxController,
  deleteResumeController,
  handleResumeUploadWithProgress
};
