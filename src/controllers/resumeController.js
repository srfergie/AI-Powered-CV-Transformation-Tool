const fs = require('fs').promises;
const { parsePdf } = require('../services/pdfParserService');
const { processResumeWithOpenRouter } = require('../services/openRouterService');
const { storeResume, getResumeById, updateResume } = require('../services/databaseService'); // Import database functions

/**
 * Handles the resume upload, parsing, processing with OpenRouter, storing, and returns structured data.
 * After successful processing, it deletes the uploaded PDF file.
 */
async function handleResumeUploadAndProcess(req, res) {
  // 1. Check if a file was uploaded
  if (!req.file || !req.file.path) {
    return res.status(400).json({ message: 'No file uploaded or file path is missing.' });
  }

  const filePath = req.file.path;
  const originalFileName = req.file.originalname;

  try {
    // 2. Call parsePdf with the path of the uploaded file
    console.log(`Parsing PDF: ${filePath}`);
    const resumeText = await parsePdf(filePath);
    if (!resumeText.trim()) {
      console.warn(`PDF parsed successfully but no text content found: ${filePath}`);
      return res.status(400).json({ message: 'PDF parsed, but no text content was found. Cannot process further.' });
    }
    console.log('PDF parsed successfully.');

    // 3. Call processResumeWithOpenRouter with the extracted text
    console.log('Processing resume text with OpenRouter...');
    const structuredResumeData = await processResumeWithOpenRouter(resumeText);
    console.log('Resume processed by OpenRouter successfully.');

    // 4. Store the processed resume in the database
    console.log('Storing resume in database...');
    const extractedDataJsonString = JSON.stringify(structuredResumeData);
    const newResumeId = await storeResume(originalFileName, extractedDataJsonString, 'processed');
    console.log(`Resume stored successfully with ID: ${newResumeId}`);

    // 5. If successful, respond with the ID and structured resume data
    res.status(201).json({ // 201 Created for new resource
      id: newResumeId,
      message: 'Resume processed and stored successfully.',
      data: structuredResumeData,
    });

  } catch (error) {
    console.error('Error in resume processing pipeline:', error);
    // Robust error handling from previous step, ensure it covers database errors too.
    // 5. Implement robust error handling
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred during resume processing.';

    if (error.message.includes('File not found')) {
      statusCode = 404;
      errorMessage = `Uploaded file not found at path: ${filePath}.`;
    } else if (error.message.includes('Invalid PDF') || error.message.includes('Failed to parse PDF')) {
      statusCode = 400;
      errorMessage = `Failed to parse the uploaded PDF: ${error.message}`;
    } else if (error.message.includes('OpenRouter API key is missing')) {
        statusCode = 500; // Server configuration issue
        errorMessage = 'OpenRouter API key is not configured on the server.';
    } else if (error.message.includes('OpenRouter API') || error.message.includes('No response received from OpenRouter API')) {
      statusCode = 502; // Bad Gateway, if OpenRouter itself has issues
      errorMessage = `Error interacting with OpenRouter API: ${error.message}`;
    } else if (error.message.includes('Failed to parse JSON response from OpenRouter')) {
        statusCode = 500;
        errorMessage = `Error parsing the response from OpenRouter: ${error.message}`;
    } else if (error.message.includes('Database error')) { // Catch database specific errors
        statusCode = 500;
        errorMessage = `A database error occurred: ${error.message}`;
    }
    
    return res.status(statusCode).json({ message: errorMessage, error: error.message });

  } finally {
    // 6. After processing (success or failure with file path available), delete the temporary uploaded PDF file.
    try {
      if (filePath) { // Ensure filePath is defined before trying to unlink
        console.log(`Attempting to delete temporary file: ${filePath}`);
        await fs.unlink(filePath);
        console.log(`Successfully deleted temporary file: ${filePath}`);
      }
    } catch (unlinkError) {
      console.error(`Failed to delete temporary file ${filePath}:`, unlinkError);
    }
  }
}

/**
 * Retrieves a resume by its ID.
 */
async function getResumeController(req, res) {
  const { id } = req.params;
  const resumeId = parseInt(id, 10);

  if (isNaN(resumeId)) {
    return res.status(400).json({ message: 'Invalid resume ID format. ID must be a number.' });
  }

  try {
    console.log(`Fetching resume with ID: ${resumeId}`);
    const resume = await getResumeById(resumeId);

    if (resume) {
      res.status(200).json(resume);
    } else {
      res.status(404).json({ message: `Resume with ID ${resumeId} not found.` });
    }
  } catch (error) {
    console.error(`Error fetching resume ID ${resumeId}:`, error);
    if (error.message.includes('Database error')) {
        return res.status(500).json({ message: `A database error occurred while fetching the resume: ${error.message}` });
    }
    res.status(500).json({ message: 'An unexpected error occurred while fetching the resume.' });
  }
}

/**
 * Updates an existing resume.
 */
async function updateResumeController(req, res) {
  const { id } = req.params;
  const resumeId = parseInt(id, 10);

  if (isNaN(resumeId)) {
    return res.status(400).json({ message: 'Invalid resume ID format. ID must be a number.' });
  }

  const { editedData, newStatus } = req.body;

  if (!editedData) {
    return res.status(400).json({ message: 'Missing "editedData" in request body.' });
  }
  if (!newStatus) {
    // Optional: default status or require it
    return res.status(400).json({ message: 'Missing "newStatus" in request body.' });
  }
  if (typeof newStatus !== 'string' || newStatus.trim() === '') {
      return res.status(400).json({ message: '"newStatus" must be a non-empty string.' });
  }
  if (typeof editedData !== 'object' || editedData === null) {
    return res.status(400).json({ message: '"editedData" must be a valid JSON object.' });
  }


  try {
    const extractedDataJsonString = JSON.stringify(editedData);
    console.log(`Updating resume with ID: ${resumeId}`);
    const updatedResume = await updateResume(resumeId, extractedDataJsonString, newStatus);

    if (updatedResume) {
      res.status(200).json({
        message: `Resume with ID ${resumeId} updated successfully.`,
        data: updatedResume,
      });
    } else {
      // This case might be covered by updateResume throwing an error if ID not found.
      // If updateResume returns null/undefined for "not found", this is correct.
      res.status(404).json({ message: `Resume with ID ${resumeId} not found or update failed.` });
    }
  } catch (error) {
    console.error(`Error updating resume ID ${resumeId}:`, error);
    if (error.message.includes('Database error')) {
        return res.status(500).json({ message: `A database error occurred while updating the resume: ${error.message}` });
    } else if (error.message.includes(`Resume with ID ${resumeId} not found`)) { // Check if databaseService throws specific not found
        return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred while updating the resume.' });
  }
}

module.exports = { 
  handleResumeUploadAndProcess,
  getResumeController,
  updateResumeController,
};
