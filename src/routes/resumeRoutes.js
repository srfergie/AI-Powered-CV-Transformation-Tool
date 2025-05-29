const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  handleResumeUploadAndProcess,
  getResumeController,
  updateResumeController 
} = require('../controllers/resumeController'); // Import the controller functions

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// POST /api/resume/upload
// The multer middleware (upload.single('resume')) handles the file upload first.
// If successful, it passes control to handleResumeUploadAndProcess.
// The 'resume' string in upload.single('resume') must match the field name in the form-data from the client.
router.post('/upload', upload.single('resume'), handleResumeUploadAndProcess);

// Route to get a specific resume by ID
router.get('/:id', getResumeController);

// Route to update a specific resume by ID
router.put('/:id', updateResumeController);

module.exports = router;
