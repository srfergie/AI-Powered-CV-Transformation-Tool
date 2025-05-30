// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const { processCv } = require('./services/cvProcessor');
const { generateIodParcDocx } = require('./services/docxGenerator');
const { cleanupOutputDirectory } = require('./scripts/cleanup-output');
const cleanupConfig = require('./config/cleanup.config');

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

// Configurable periodic cleanup
if (cleanupConfig.enablePeriodicCleanup) {
    setInterval(() => {
        if (cleanupConfig.enableLogging) {
            console.log('🧹 Running periodic output directory cleanup...');
        }
        cleanupOutputDirectory();
    }, cleanupConfig.cleanupInterval);

    if (cleanupConfig.enableLogging) {
        console.log(`🕒 Periodic cleanup enabled: every ${cleanupConfig.cleanupInterval / (60 * 1000)} minutes`);
    }
}

// Run cleanup on startup if configured
if (cleanupConfig.cleanupOnStartup) {
    if (cleanupConfig.enableLogging) {
        console.log('🧹 Running startup cleanup...');
    }
    cleanupOutputDirectory();
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Admin endpoint for manual cleanup
app.post('/api/admin/cleanup', (req, res) => {
    try {
        console.log('🧹 Manual cleanup triggered...');
        cleanupOutputDirectory();
        res.json({
            success: true,
            message: 'Cleanup completed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error during manual cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Cleanup failed',
            details: error.message
        });
    }
});

// Admin endpoint for output folder status
app.get('/api/admin/output-status', (req, res) => {
    try {
        if (!fs.existsSync(outputDir)) {
            return res.json({
                exists: false,
                files: 0,
                totalSize: 0
            });
        }

        const files = fs.readdirSync(outputDir)
            .filter(file => file.startsWith('CV_') && file.endsWith('.docx'))
            .map(file => {
                const filePath = path.join(outputDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    created: stats.birthtime
                };
            })
            .sort((a, b) => b.created - a.created);

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);

        res.json({
            exists: true,
            fileCount: files.length,
            totalSize: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            oldestFile: files.length > 0 ? files[files.length - 1] : null,
            newestFile: files.length > 0 ? files[0] : null,
            files: files.slice(0, 10) // Return first 10 files
        });
    } catch (error) {
        console.error('Error getting output status:', error);
        res.status(500).json({
            error: 'Failed to get output status',
            details: error.message
        });
    }
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
        // Configurable cleanup after download
        if (cleanupConfig.deleteAfterDownload) {
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        if (cleanupConfig.enableLogging) {
                            console.log(`🗑️ Cleaned up downloaded file: CV_${resumeId}.docx`);
                        }
                    } catch (error) {
                        console.error(`❌ Error cleaning up file CV_${resumeId}.docx:`, error.message);
                    }
                }
            }, cleanupConfig.deleteDelay);
        }
    });

    fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        res.status(500).json({ error: 'Error downloading file' });
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
        }, req.file.originalname);

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
        const structuredData = await processCv(req.file.path, null, req.file.originalname);

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