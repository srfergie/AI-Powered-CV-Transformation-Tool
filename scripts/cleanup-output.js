#!/usr/bin/env node
/**
 * Cleanup utility for removing old generated CV files from the output directory
 * This prevents the output folder from growing indefinitely and consuming disk space
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const MAX_AGE_DAYS = 7; // Files older than 7 days will be deleted
const MAX_FILES = 50; // Keep maximum 50 most recent files

function cleanupOutputDirectory() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.log('📁 Output directory does not exist');
        return;
    }

    const files = fs.readdirSync(OUTPUT_DIR)
        .filter(file => file.startsWith('CV_') && file.endsWith('.docx'))
        .map(file => {
            const filePath = path.join(OUTPUT_DIR, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                created: stats.birthtime,
                size: stats.size
            };
        })
        .sort((a, b) => b.created - a.created); // Sort by newest first

    console.log(`📊 Found ${files.length} CV files in output directory`);

    let deletedFiles = 0;
    let freedSpace = 0;
    const now = new Date();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Delete files older than MAX_AGE_DAYS
    files.forEach(file => {
        const age = now - file.created;
        if (age > maxAge) {
            try {
                fs.unlinkSync(file.path);
                deletedFiles++;
                freedSpace += file.size;
                console.log(`🗑️  Deleted old file: ${file.name} (${Math.round(age / (24 * 60 * 60 * 1000))} days old)`);
            } catch (error) {
                console.error(`❌ Error deleting ${file.name}:`, error.message);
            }
        }
    });

    // If still too many files, delete oldest ones to keep only MAX_FILES
    const remainingFiles = files.filter(file => fs.existsSync(file.path));
    if (remainingFiles.length > MAX_FILES) {
        const filesToDelete = remainingFiles.slice(MAX_FILES);
        filesToDelete.forEach(file => {
            try {
                fs.unlinkSync(file.path);
                deletedFiles++;
                freedSpace += file.size;
                console.log(`🗑️  Deleted excess file: ${file.name}`);
            } catch (error) {
                console.error(`❌ Error deleting ${file.name}:`, error.message);
            }
        });
    }

    const remainingCount = fs.readdirSync(OUTPUT_DIR).filter(file =>
        file.startsWith('CV_') && file.endsWith('.docx')
    ).length;

    console.log(`✅ Cleanup complete:`);
    console.log(`   📁 Files deleted: ${deletedFiles}`);
    console.log(`   💾 Space freed: ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📄 Files remaining: ${remainingCount}`);
}

// Run cleanup if called directly
if (require.main === module) {
    console.log('🧹 Starting output directory cleanup...');
    cleanupOutputDirectory();
}

module.exports = { cleanupOutputDirectory }; 