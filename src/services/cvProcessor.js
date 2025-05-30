const { parseWordDocument } = require('./wordParserService');
const { parsePdf } = require('./pdfParserService');
const { extractStructuredDataFromSegments } = require('./llmService');
const path = require('path');

/**
 * Parses CV text into sections using deterministic, rule-based heuristics
 * @param {string} text - Raw CV text
 * @returns {Object} - Sections identified in the CV
 */
function parseCvWithHeuristics(text) {
    console.log("⚙️ Starting rule-based CV parsing...");

    // Known section headers to look for (case-insensitive)
    const sectionHeaders = [
        "Profile",
        "Nationality & Languages",
        "Qualifications",
        "Country Work Experience",
        "Experience",
        "Highlighted experience",
        "Employment",
        "Publications",
        "Education",
        "Skills",
        "Languages",
        "Technical Skills",
        "Professional Experience",
        "Work History",
        "Career Summary",
        "Academic Background",
        "Research Publications",
        "Journal Articles",
        "Conference Papers"
    ];

    // Create a regex pattern that matches any of these headers at the start of a line
    // The pattern accounts for variations like "(selected)" or ":" after the header
    const headerPattern = new RegExp(
        `^(${sectionHeaders.join('|')})(?:\\s*\\([^)]*\\))?\\s*:?\\s*$`,
        'im'
    );

    // Split the text into lines while preserving empty lines
    const lines = text.split(/\r?\n/);
    const sections = {};
    let currentSection = null;
    let currentContent = [];
    let inHeader = false; // Track if we're in a potential header region

    // Helper function to save the current section
    const saveCurrentSection = () => {
        if (currentSection && currentContent.length > 0) {
            // Clean up the content: remove empty lines from start/end, preserve internal spacing
            const cleanContent = currentContent
                .join('\n')
                .trim()
                .replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2
            if (cleanContent) {
                sections[currentSection] = cleanContent;
            }
        }
    };

    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

        // Check for section header
        const headerMatch = line.match(headerPattern);

        if (headerMatch) {
            // Save previous section if it exists
            saveCurrentSection();

            // Start new section
            currentSection = headerMatch[1];
            currentContent = [];
            inHeader = true;
            console.log(`📑 Found section: ${currentSection}`);
            continue;
        }

        // If we're in a section, add content
        if (currentSection) {
            // Skip empty lines at the start of a section
            if (currentContent.length === 0 && !line) continue;

            currentContent.push(lines[i]); // Use original line to preserve formatting
        }
    }

    // Save the last section
    saveCurrentSection();

    // Log the results
    console.log('✅ Rule-based parsing complete. Found sections:', Object.keys(sections));

    // Log character counts for verification
    for (const [section, content] of Object.entries(sections)) {
        console.log(`📊 ${section}: ${content.length} characters`);
    }

    return sections;
}

/**
 * Consolidates parsed sections into a standardized format
 * @param {Object} parsedSections - Sections from rule-based parsing
 * @returns {Object} - Consolidated sections
 */
function consolidateSections(parsedSections) {
    console.log('⚙️ Consolidating sections...');

    const consolidated = {
        profile: '',
        personal_details: '',
        country_experience: '',
        qualifications: '',
        experience: '',
        publications: '',
        skills: '',
        languages: '',
        additional: ''
    };

    // Helper function to append content with proper spacing
    const appendContent = (target, content) => {
        if (!content) return target;
        return target ? `${target}\n\n${content}` : content;
    };

    // Map sections to their consolidated categories
    const sectionMappings = {
        'Profile': 'profile',
        'Nationality & Languages': 'personal_details',
        'Country Work Experience': 'country_experience',
        'Qualifications': 'qualifications',
        'Education': 'qualifications',
        'Academic Background': 'qualifications',
        'Publications': 'publications',
        'Research Publications': 'publications',
        'Journal Articles': 'publications',
        'Conference Papers': 'publications',
        'Skills': 'skills',
        'Technical Skills': 'skills',
        'Languages': 'languages'
    };

    // Experience sections to combine (in order)
    const experienceSections = [
        'Highlighted experience',
        'Experience',
        'Professional Experience',
        'Employment',
        'Work History',
        'Career Summary'
    ];

    // Process experience sections first (to maintain order)
    for (const section of experienceSections) {
        if (parsedSections[section]) {
            consolidated.experience = appendContent(consolidated.experience, parsedSections[section]);
            console.log(`📝 Added ${section} to experience (${parsedSections[section].length} chars)`);
        }
    }

    // Process other mapped sections
    for (const [originalSection, content] of Object.entries(parsedSections)) {
        const targetSection = sectionMappings[originalSection];
        if (targetSection && targetSection !== 'experience') { // Skip experience as it's already handled
            consolidated[targetSection] = appendContent(consolidated[targetSection], content);
            console.log(`📝 Added ${originalSection} to ${targetSection} (${content.length} chars)`);
        }
    }

    // Log final character counts
    console.log('\n📊 Final consolidated section lengths:');
    for (const [section, content] of Object.entries(consolidated)) {
        console.log(`${section}: ${content.length} characters`);
    }

    return consolidated;
}

/**
 * Processes a CV file and transforms it into structured data
 * @param {string} filePath - Path to the CV file
 * @returns {Promise<Object>} - Structured CV data
 */
async function processAndTransformCv(filePath) {
    try {
        console.log(`🔄 Starting CV processing for: ${filePath}`);

        // Step 1: Extract raw text based on file type
        console.log('📄 Extracting text from document...');
        const fileExt = path.extname(filePath).toLowerCase();
        let rawText;

        if (['.docx', '.doc'].includes(fileExt)) {
            rawText = await parseWordDocument(filePath);
        } else if (fileExt === '.pdf') {
            rawText = await parsePdf(filePath);
        } else {
            throw new Error('Unsupported file format. Please upload a PDF or Word document.');
        }

        console.log(`📝 Extracted ${rawText.length} characters`);

        // Step 2: Rule-based Section Parsing (No AI)
        console.log('🔍 Stage 1: Performing rule-based section parsing...');
        const parsedSections = parseCvWithHeuristics(rawText);

        // Step 3: Section Consolidation (No AI)
        console.log('⚙️ Stage 1.5: Consolidating sections with code-based logic...');
        const consolidatedSections = consolidateSections(parsedSections);

        // Log the length of the experience section for verification
        console.log(`✅ Experience section consolidated: ${consolidatedSections.experience.length} characters`);

        // Step 4: Structured Extraction (AI)
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
    processAndTransformCv,
    parseCvWithHeuristics,  // Exported for testing
    consolidateSections     // Exported for testing
}; 