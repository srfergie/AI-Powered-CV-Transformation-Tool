const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables

const resumeRoutes = require('./routes/resumeRoutes');
const { initDatabase } = require('./services/databaseService');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
initDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch((error) => {
  console.error('❌ Database initialization failed:', error);
});

// CORS configuration for local development and Azure deployment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-app.azurestaticapps.net'] // Update with your Azure Static Web App URL
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Local React dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/resume', resumeRoutes);

// Serve static files in production (Azure deployment)
if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large. Maximum size is 5MB.',
      error: 'FILE_TOO_LARGE'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: 'Invalid file upload.',
      error: 'INVALID_FILE_UPLOAD'
    });
  }

  // Default error response
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});

module.exports = app;
