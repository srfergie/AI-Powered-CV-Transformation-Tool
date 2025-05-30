const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  handleResumeUploadAndProcess,
  handleBulkResumeUpload,
  getResumeController,
  getAllResumesController,
  updateResumeController,
  downloadResumeDocxController,
  deleteResumeController,
  handleResumeUploadWithProgress
} = require('../controllers/resumeController'); // Import the controller functions

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Supported file types for CV processing
const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx only
];

const SUPPORTED_EXTENSIONS = ['.docx'];

// Multer configuration with enhanced file support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Add timestamp and preserve extension for better file management
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  console.log(`📁 File upload attempt: ${file.originalname} (${file.mimetype})`);

  // Check MIME type first
  if (SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
    console.log(`✅ File accepted by MIME type: ${file.mimetype}`);
    cb(null, true);
    return;
  }

  // Fallback: Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(extension)) {
    console.log(`✅ File accepted by extension: ${extension}`);
    cb(null, true);
    return;
  }

  // Reject file
  console.log(`❌ File rejected: ${file.originalname} (${file.mimetype}) - unsupported type`);
  cb(new Error('Invalid file type. Only Word documents (.docx) are allowed.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased for Word documents)
    files: 1 // Single file for regular upload
  },
});

const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Up to 10 files for bulk upload
  },
});

// POST /api/resume/upload-progress - Single file upload with real-time progress tracking
// Uses Server-Sent Events to provide real-time updates during processing
// Supports PDF and Word documents (.pdf, .docx, .doc)
router.post('/upload-progress', upload.single('resume'), handleResumeUploadWithProgress);

// POST /api/resume/upload - Single file upload
// The multer middleware (upload.single('resume')) handles the file upload first.
// If successful, it passes control to handleResumeUploadAndProcess.
// The 'resume' string in upload.single('resume') must match the field name in the form-data from the client.
// Supports PDF and Word documents (.pdf, .docx, .doc)
router.post('/upload', upload.single('resume'), handleResumeUploadAndProcess);

// POST /api/resume/bulk-upload - Multiple files upload
// Handles multiple PDF and Word documents at once (up to 10 files)
// Supports PDF and Word documents (.pdf, .docx, .doc)
router.post('/bulk-upload', uploadMultiple.array('resumes', 10), handleBulkResumeUpload);

// GET /api/resume - Get all resumes with pagination and filtering
router.get('/', getAllResumesController);

// GET /api/resume/:id - Get a specific resume by ID
router.get('/:id', getResumeController);

// PUT /api/resume/:id - Update a specific resume by ID
router.put('/:id', updateResumeController);

// GET /api/resume/:id/download - Download resume as .docx file
router.get('/:id/download', downloadResumeDocxController);

// DELETE /api/resume/:id - Delete a resume by ID
router.delete('/:id', deleteResumeController);

module.exports = router;
