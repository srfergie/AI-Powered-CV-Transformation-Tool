// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const { processCv } = require('./services/cvProcessor');
const { generateIodParcDocx } = require('./services/docxGenerator');

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-frontend-app.azurestaticapps.net']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const upload = multer({ dest: uploadDir });

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Download endpoint for generated CVs
app.get('/api/resume/:id/download', (req, res) => {
    const resumeId = req.params.id;
    const filePath = path.join(outputDir, `CV_${resumeId}.docx`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            error: 'File not found',
            message: 'The requested CV file does not exist or has expired.'
        });
    }

    res.setHeader('Content-Disposition', `attachment; filename=CV_IODPARC_${resumeId}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
        // Optional: Clean up file after download
        // fs.unlinkSync(filePath);
    });
});

// Main CV transformation endpoint
app.post('/api/resume/upload-progress', upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: 'No CV file uploaded.',
            error: 'NO_FILE_UPLOADED'
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
            timestamp: new Date().toISOString()
        });
        res.write(`data: ${data}\n\n`);
    };

    try {
        console.log(`Processing file: ${req.file.path}`);

        sendProgress('parsing', 10, '🔍 Starting document parsing...');

        const structuredData = await processCv(req.file.path, (progress, message) => {
            sendProgress('ai-processing', 30 + (progress * 0.5), message || '🧠 AI analyzing CV structure...');
        });

        sendProgress('generating', 80, '📄 Generating DOCX document...');

        const docxBuffer = await generateIodParcDocx(structuredData);

        // Generate unique ID and save file
        const resumeId = Date.now();
        const outputPath = path.join(outputDir, `CV_${resumeId}.docx`);
        fs.writeFileSync(outputPath, docxBuffer);

        sendProgress('complete', 100, '🎉 CV transformation completed successfully!');

        // Send final result with structured data
        const finalResult = JSON.stringify({
            type: 'result',
            success: true,
            data: {
                id: resumeId,
                data: structuredData,
                fileName: req.file.originalname,
                fileType: 'docx',
                downloadUrl: `/api/resume/${resumeId}/download`
            }
        });
        res.write(`data: ${finalResult}\n\n`);
        res.end();

    } catch (error) {
        console.error('An error occurred during CV transformation:', error);

        const errorData = JSON.stringify({
            stage: 'error',
            progress: 0,
            message: `❌ Error: ${error.message}`,
            timestamp: new Date().toISOString()
        });
        res.write(`data: ${errorData}\n\n`);

        const errorResult = JSON.stringify({
            type: 'result',
            success: false,
            error: error.message
        });
        res.write(`data: ${errorResult}\n\n`);
        res.end();
    } finally {
        // Clean up the uploaded file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// Simple download endpoint for testing
app.post('/transform-cv', upload.single('cv_file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No CV file uploaded.');
    }

    try {
        console.log(`Processing file: ${req.file.path}`);
        const structuredData = await processCv(req.file.path);

        console.log('Generating DOCX document...');
        const docxBuffer = await generateIodParcDocx(structuredData);

        res.setHeader('Content-Disposition', 'attachment; filename=CV_IODPARC_Generated.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(docxBuffer);

    } catch (error) {
        console.error('An error occurred during CV transformation:', error);
        res.status(500).json({ error: 'An error occurred during processing.', details: error.message });
    } finally {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file
    }
});

app.listen(port, () => {
    console.log(`🚀 BD Assistant FINAL backend listening at http://localhost:${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
}); 