// services/cvProcessor.js (FINAL, MOST RESILIENT VERSION)
const cheerio = require('cheerio');
// Assume you have these service files to handle DOCX and PDF parsing
const { parseWordDocument } = require('./wordParserService');
const { parsePdf } = require('./pdfParserService');
// Assume llmService exports these functions
const { extractStructuredDataFromSegments, segmentCvWithAi } = require('./llmService');
const path = require('path');

async function extractHtmlFromDocx(filePath) {
    console.log('📄 Extracting as HTML to preserve structure...');
    const result = await mammoth.convertToHtml({ path: filePath });
    console.log(`✅ HTML extracted: ${result.value.length} characters`);
    return result.value;
}
/**
 * FINAL VERSION: Parses CV text by finding all known headers and slicing the document by their character positions.
 * This is highly resilient to complex DOCX/PDF layouts that can garble the raw text output.
 * @param {string} text - Raw CV text
 * @returns {Object} - An object containing the parsed sections or a failure signal.
 */
function parseCvWithHeuristics(text) {
    console.log("⚙️ Starting advanced rule-based CV parsing (slicing method)...");

    const sectionHeaders = [
        "SUMMARY OF QUALIFICATIONS", "PROFESSIONAL EXPERIENCE", "ACADEMIC BACKGROUND",
        "Profile", "Summary", "Career Objective", "Personal Statement",
        "Experience", "Work History", "Employment", "Highlighted experience",
        "Education", "Qualifications",
        "Publications", "Research Publications", "Journal Articles", "Conference Papers",
        "Skills", "Technical Skills",
        "Languages", "Nationality & Languages",
        "Country Work Experience"
    ];

    // Create a global, case-insensitive regex to find all occurrences.
    const headerPattern = new RegExp(`(${sectionHeaders.join('|')})(?:\\s*\\(.*?\\))?:?`, 'gi');

    // Use matchAll to get all matches along with their character indices.
    const matches = [...text.matchAll(headerPattern)];

    // If we find fewer than 2 headers, the CV is likely unstructured.
    // Trigger the fallback to let the AI try to segment it.
    if (matches.length < 2) {
        console.warn(`⚠️ Rule-based parser found fewer than 2 section headers. This CV may be unstructured. Triggering AI fallback.`);
        return { __heuristic_parser_failed: true, rawText: text };
    }

    const sections = {};
    // Sort matches by their character index to ensure correct processing order.
    matches.sort((a, b) => a.index - b.index);

    // Slice the main text string based on the positions of the found headers.
    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];

        // The name of the section is the first captured group in the regex.
        const sectionName = currentMatch[1].trim();
        // The content starts after the full matched header string.
        const startIndex = currentMatch.index + currentMatch[0].length;
        // The content ends at the start of the next header, or at the end of the text if it's the last one.
        const endIndex = nextMatch ? nextMatch.index : text.length;

        const content = text.substring(startIndex, endIndex).trim();

        // Use the most specific header found (e.g. "PROFESSIONAL EXPERIENCE" is more specific than "Experience")
        const normalizedSectionName = sectionName.toUpperCase();
        if (!sections[normalizedSectionName] || content.length > (sections[normalizedSectionName] || "").length) {
            sections[normalizedSectionName] = content;
        }
    }

    console.log('✅ Advanced parsing complete. Found sections:', Object.keys(sections));
    return sections;
}

/**
 * Consolidates the parsed sections into a standardized format for the AI.
 */
function consolidateSections(parsedSections) {
    console.log('⚙️ Consolidating sections for AI processing...');

    const consolidated = {
        profile: '',
        personal_details: '',
        qualifications: '',
        experience: '',
        publications: '',
        skills: '',
        additional: ''
    };

    // Define all possible aliases for our standard sections.
    const sectionMappings = {
        'SUMMARY OF QUALIFICATIONS': 'profile',
        'PROFILE': 'profile',
        'NATIONALITY & LANGUAGES': 'personal_details',
        'ACADEMIC BACKGROUND': 'qualifications', 'QUALIFICATIONS': 'qualifications',
        'PROFESSIONAL EXPERIENCE': 'experience', 'EXPERIENCE': 'experience', 'EMPLOYMENT': 'experience',
        'PUBLICATIONS': 'publications'
        // Add other mappings as needed
    };

    // Combine all sections that map to the same category.
    for (const [sectionName, content] of Object.entries(parsedSections)) {
        const upperCaseSectionName = sectionName.toUpperCase();
        const targetCategory = sectionMappings[upperCaseSectionName];

        if (targetCategory) {
            consolidated[targetCategory] = consolidated[targetCategory]
                ? `${consolidated[targetCategory]}\n\n${content}`
                : content;
        } else {
            console.log(`📝 Found unmapped section: "${sectionName}". Adding to 'additional'.`);
            consolidated.additional = consolidated.additional
                ? `${consolidated.additional}\n\n--- ${sectionName} ---\n${content}`
                : `--- ${sectionName} ---\n${content}`;
        }
    }

    console.log('✅ Consolidation complete.');
    return consolidated;
}

/**
 * The main orchestrator function for processing a CV file.
 */
async function processAndTransformCv(filePath) {
    try {
        console.log(`🔄 Starting CV processing for: ${filePath}`);
        const fileExt = path.extname(filePath).toLowerCase();
        let rawText;

        if (['.docx', '.doc'].includes(fileExt)) {
            rawText = await parseWordDocument(filePath);
        } else if (fileExt === '.pdf') {
            rawText = await parsePdf(filePath);
        } else {
            throw new Error('Unsupported file format.');
        }
        console.log(`📝 Extracted ${rawText.length} characters`);

        // STAGE 1: Rule-based Parsing
        let parsedSections = parseCvWithHeuristics(rawText);
        let consolidatedSections;

        // STAGE 1.5: Fallback and Consolidation
        if (parsedSections.__heuristic_parser_failed) {
            console.log("🚦 Heuristic parsing failed, falling back to AI segmentation...");
            // The AI gets the raw text to try and identify sections itself.
            consolidatedSections = await segmentCvWithAi(parsedSections.rawText);
        } else {
            consolidatedSections = consolidateSections(parsedSections);
        }

        console.log(`Experience section ready for AI: ${consolidatedSections.experience.length} characters`);

        // STAGE 2: AI-based Structured Extraction
        console.log('🤖 Stage 2: Extracting structured data from consolidated sections...');
        const structuredData = await extractStructuredDataFromSegments(consolidatedSections);

        console.log('✅ CV processing complete');
        return structuredData;

    } catch (error) {
        console.error('❌ Error in CV processing:', error);
        throw error;
    }
}

module.exports = {
    processAndTransformCv
};