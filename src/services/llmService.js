const { processResumeWithOpenRouter } = require('./openRouterService');
const { getStructuredDataExtractionPrompt } = require('./prompts/prompt_stage_2_extraction');

/**
 * Extracts structured data from consolidated CV sections using AI
 * @param {Object} consolidatedSections - The consolidated CV sections
 * @returns {Promise<Object>} - Structured CV data
 */
async function extractStructuredDataFromSegments(consolidatedSections) {
    console.log('🤖 Starting structured data extraction from consolidated sections...');

    try {
        // Get the extraction prompt
        const extractionPrompt = getStructuredDataExtractionPrompt(consolidatedSections);

        // Process with OpenRouter
        console.log('📤 Sending consolidated sections to AI for extraction...');
        const structuredData = await processResumeWithOpenRouter(extractionPrompt, progress => {
            console.log(`📊 Extraction progress: ${progress}%`);
        });

        // Validate the extracted data
        validateExtractedData(structuredData, consolidatedSections);

        return structuredData;

    } catch (error) {
        console.error('❌ Error in structured data extraction:', error);
        throw new Error(`Failed to extract structured data: ${error.message}`);
    }
}

/**
 * Validates the extracted data against the source sections
 * @param {Object} extractedData - The AI-extracted structured data
 * @param {Object} sourceSections - The original consolidated sections
 */
function validateExtractedData(extractedData, sourceSections) {
    console.log('🔍 Validating extracted data...');

    // Check experience section length
    if (sourceSections.experience) {
        const totalExperienceChars = extractedData.workExperience.reduce((total, exp) =>
            total + (exp.description?.length || 0), 0);

        console.log(`📊 Experience validation:
        - Source length: ${sourceSections.experience.length} chars
        - Extracted length: ${totalExperienceChars} chars
        - Roles extracted: ${extractedData.workExperience.length}`);

        // Alert if significant content loss
        if (totalExperienceChars < sourceSections.experience.length * 0.8) {
            console.warn('⚠️ Warning: Possible experience content loss detected');
        }
    }

    // Check publications
    if (sourceSections.publications && (!extractedData.publications || extractedData.publications.length === 0)) {
        console.warn('⚠️ Warning: Publications section exists but none were extracted');
    }

    // Check profile/summary length
    if (sourceSections.profile && (!extractedData.summary || extractedData.summary.length < 800)) {
        console.warn('⚠️ Warning: Profile/summary section may be incomplete');
    }

    console.log('✅ Validation complete');
}

module.exports = {
    extractStructuredDataFromSegments
}; 