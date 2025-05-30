const mammoth = require('mammoth');
const fs = require('fs').promises;

/**
 * Enhanced Word Document Parser Service
 * Extracts text from .docx files with better formatting preservation
 * @param {string} filePath - Path to the Word document
 * @returns {Promise<string>} - Extracted text content
 */
async function parseWordDocument(filePath) {
    try {
        console.log(`📄 Starting Word document parsing: ${filePath}`);

        // Check if file exists
        await fs.access(filePath);

        // Read the file as a buffer (more reliable than file path)
        const fileBuffer = await fs.readFile(filePath);
        console.log(`📁 File read successfully, size: ${fileBuffer.length} bytes`);

        // Configure mammoth options for better text extraction
        const options = {
            // Style mapping for better text extraction
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Title'] => h1:fresh",
                "p[style-name='Subtitle'] => h2:fresh",
                "b => strong",
                "i => em"
            ]
        };

        // Parse the document using buffer instead of file path
        const result = await mammoth.extractRawText({ buffer: fileBuffer }, options);

        if (result.messages && result.messages.length > 0) {
            console.log('⚠️ Word parsing warnings:', result.messages);
        }

        const extractedText = result.value;

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text content found in Word document');
        }

        console.log(`✅ Word document parsed successfully! Text length: ${extractedText.length} characters`);

        // Clean and format the extracted text
        const cleanedText = cleanExtractedText(extractedText);

        return cleanedText;

    } catch (error) {
        console.error('❌ Error parsing Word document:', error);

        // More specific error handling
        if (error.message.includes('Could not find file in options')) {
            throw new Error('Word document format not supported or file is corrupted');
        } else if (error.code === 'ENOENT') {
            throw new Error('Word document file not found');
        } else {
            throw new Error(`Failed to parse Word document: ${error.message}`);
        }
    }
}

/**
 * Enhanced version that extracts formatted content for better AI processing
 * @param {string} filePath - Path to the Word document
 * @returns {Promise<Object>} - Extracted content with formatting information
 */
async function parseWordDocumentWithFormatting(filePath) {
    try {
        console.log(`📄 Starting enhanced Word document parsing: ${filePath}`);

        // Check if file exists
        await fs.access(filePath);

        // Read the file as a buffer
        const fileBuffer = await fs.readFile(filePath);

        // Configure mammoth for HTML extraction with formatting
        const options = {
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Title'] => h1.title:fresh",
                "p[style-name='Subtitle'] => h2.subtitle:fresh",
                "b => strong",
                "i => em",
                "u => u"
            ]
        };

        // Get both HTML and raw text using buffer
        const [htmlResult, textResult] = await Promise.all([
            mammoth.convertToHtml({ buffer: fileBuffer }, options),
            mammoth.extractRawText({ buffer: fileBuffer })
        ]);

        const htmlContent = htmlResult.value;
        const textContent = textResult.value;

        console.log(`✅ Enhanced Word parsing complete! HTML: ${htmlContent.length}, Text: ${textContent.length} characters`);

        return {
            html: htmlContent,
            text: cleanExtractedText(textContent),
            rawText: textContent,
            messages: [...(htmlResult.messages || []), ...(textResult.messages || [])]
        };

    } catch (error) {
        console.error('❌ Error in enhanced Word document parsing:', error);

        // More specific error handling
        if (error.message.includes('Could not find file in options')) {
            throw new Error('Word document format not supported or file is corrupted');
        } else {
            throw new Error(`Failed to parse Word document with formatting: ${error.message}`);
        }
    }
}

/**
 * Clean and format extracted text for better AI processing
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
function cleanExtractedText(text) {
    if (!text) return '';

    return text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove empty lines
        .replace(/\n\s*\n/g, '\n')
        // Clean up bullet points and special characters
        .replace(/[•·▪▫]/g, '•')
        // Normalize quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove extra spaces around punctuation
        .replace(/\s+([,.;:!?])/g, '$1')
        // Trim whitespace
        .trim();
}

/**
 * Detect if a file is a Word document based on extension
 * @param {string} fileName - Name of the file
 * @returns {boolean} - True if it's a Word document
 */
function isWordDocument(fileName) {
    if (!fileName) return false;
    const extension = fileName.toLowerCase().split('.').pop();
    return ['docx', 'doc'].includes(extension);
}

module.exports = {
    parseWordDocument,
    parseWordDocumentWithFormatting,
    isWordDocument,
    cleanExtractedText
}; 