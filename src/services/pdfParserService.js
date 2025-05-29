const fs = require('fs').promises; // Using promises version of fs
const pdf = require('pdf-parse');

/**
 * Parses a PDF file and extracts its text content.
 * @param {string} filePath - The path to the PDF file.
 * @returns {Promise<string>} - A promise that resolves with the extracted text content.
 * @throws {Error} - Throws an error if the file doesn't exist, is not a PDF, or if parsing fails.
 */
async function parsePdf(filePath) {
  try {
    // Check if file exists
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    // Log the original error for more details during debugging
    console.error('Error parsing PDF:', error); 
    if (error.message && error.message.includes('Invalid PDF_DOC')) {
      throw new Error('Invalid PDF file.');
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

module.exports = { parsePdf };

// Optional: Simple test call (comment out or remove before finalizing)
/*
if (require.main === module) {
  (async () => {
    // Create a dummy PDF for testing if you don't have one
    // For a real test, replace 'dummy.pdf' with an actual PDF file path
    const testFilePath = 'dummy.pdf'; // Replace with a real PDF path for testing

    try {
      // Create a very simple dummy PDF file for testing purposes
      // In a real scenario, you would use an actual PDF file.
      // This is a placeholder and not a valid PDF structure.
      // pdf-parse will likely fail on this, which is fine for testing the error handling.
      try {
        await fs.writeFile(testFilePath, '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>');
        console.log(`Attempting to parse dummy PDF: ${testFilePath}`);
        const text = await parsePdf(testFilePath);
        console.log('Extracted Text:', text);
      } catch (e) {
        console.error('Test Error:', e.message);
      } finally {
        // Clean up the dummy file
        await fs.unlink(testFilePath).catch(err => console.error('Failed to delete dummy file:', err));
      }


      // Test with a non-existent file
      console.log('\nAttempting to parse non-existent file:');
      await parsePdf('non_existent_file.pdf');

    } catch (error) {
      console.error('Test Error:', error.message);
    }
  })();
}
*/
