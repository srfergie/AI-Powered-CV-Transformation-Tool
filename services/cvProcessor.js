// services/cvProcessor.js (TRUE HTML-BASED PARSING - PHASE 1)
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const { extractStructuredDataFromSegments } = require('./llmService');

/**
 * Enhanced HTML extraction for structure preservation
 */
async function extractHtmlFromDocx(filePath) {
    console.log('📄 Extracting document as HTML to preserve structure...');
    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        console.log(`✅ HTML extracted: ${result.value.length} characters`);
        return result.value;
    } catch (error) {
        console.error('❌ Error converting DOCX to HTML:', error);
        throw new Error('Failed to parse Word document as HTML.');
    }
}

/**
 * Fallback raw text extraction for compatibility
 */
async function extractTextFromDocx(filePath) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    console.log(`Raw text extracted. Length: ${value.length} characters`);
    return value;
}

/**
 * TRUE HTML-BASED PARSING: Leverages DOM structure for section detection
 * This is the Phase 1 solution that preserves document hierarchy
 */
function parseCvFromHtml(htmlString) {
    console.log('⚙️ Parsing CV from HTML structure using DOM elements...');
    const $ = cheerio.load(htmlString);
    const sections = {};

    // Comprehensive list of section headers to search for
    const sectionHeaders = [
        "SUMMARY OF QUALIFICATIONS", "PROFESSIONAL EXPERIENCE", "ACADEMIC BACKGROUND",
        "Profile", "PROFILE", "Summary", "SUMMARY", "Personal Statement", "Career Objective",
        "Nationality", "NATIONALITY", "Personal Details", "PERSONAL DETAILS", "Nationality & Languages",
        "Qualifications", "QUALIFICATIONS", "Education", "EDUCATION", "Academic Background",
        "Country work experience", "COUNTRY WORK EXPERIENCE", "International Experience", "Country Work Experience",
        "Experience", "EXPERIENCE", "Work Experience", "WORK EXPERIENCE", "Work History", "Highlighted experience",
        "Employment", "EMPLOYMENT", "Career History", "CAREER HISTORY", "Professional Experience",
        "Publications", "PUBLICATIONS", "Research", "RESEARCH", "Research Publications", "Journal Articles", "Conference Papers",
        "Skills", "Technical Skills", "Languages"
    ];

    console.log(`🔍 Searching for headers in HTML DOM structure...`);

    // Strategy 1: Look for headers in semantic heading tags (h1, h2, h3, h4, h5, h6)
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
        const headerText = $(el).text().trim();
        const matchingHeader = sectionHeaders.find(h => headerText.toUpperCase().includes(h.toUpperCase()));

        if (matchingHeader) {
            console.log(`📑 Found semantic header: "${headerText}" → ${matchingHeader}`);
            const content = collectContentAfterElement($, $(el), sectionHeaders);
            sections[matchingHeader.toUpperCase()] = content;
        }
    });

    // Strategy 2: Look for headers in bold/strong tags (most common in CVs)
    $('strong, b').each((i, el) => {
        const headerText = $(el).text().trim();
        const matchingHeader = sectionHeaders.find(h => headerText.toUpperCase().includes(h.toUpperCase()));

        if (matchingHeader && !sections[matchingHeader.toUpperCase()]) {
            console.log(`📑 Found bold header: "${headerText}" → ${matchingHeader}`);
            const content = collectContentAfterElement($, $(el), sectionHeaders);
            sections[matchingHeader.toUpperCase()] = content;
        }
    });

    // Strategy 3: Look for headers in paragraph tags with specific styling
    $('p').each((i, el) => {
        const headerText = $(el).text().trim();
        const matchingHeader = sectionHeaders.find(h => headerText.toUpperCase().includes(h.toUpperCase()));

        // Only consider if the paragraph is short (likely a header) and not already found
        if (matchingHeader && headerText.length < 100 && !sections[matchingHeader.toUpperCase()]) {
            console.log(`📑 Found paragraph header: "${headerText}" → ${matchingHeader}`);
            const content = collectContentAfterElement($, $(el), sectionHeaders);
            sections[matchingHeader.toUpperCase()] = content;
        }
    });

    console.log(`✅ HTML parsing complete. Found sections:`, Object.keys(sections));
    console.log("Section lengths:", Object.fromEntries(
        Object.entries(sections).map(([key, value]) => [key, value.length])
    ));

    // If we found fewer than 2 sections, the HTML structure may be unconventional
    if (Object.keys(sections).length < 2) {
        console.warn(`⚠️ HTML parser found fewer than 2 sections. Layout may be highly unconventional.`);
        return { __heuristic_parser_failed: true, rawText: $('body').text() };
    }

    return sections;
}

/**
 * Helper function to collect content after a header element until the next header
 */
function collectContentAfterElement($, headerEl, sectionHeaders) {
    let content = '';
    let currentEl = headerEl;

    // Remove the header text itself from content
    const headerText = headerEl.text().trim();

    // Start from the next sibling or parent's next sibling
    currentEl = headerEl.next();
    if (currentEl.length === 0) {
        currentEl = headerEl.parent().next();
    }

    // Collect content until we hit another header or end of document
    while (currentEl.length > 0) {
        const elementText = currentEl.text().trim();

        // Check if this element contains a section header (stop collecting)
        const isNextHeader = sectionHeaders.some(header =>
            elementText.toUpperCase().includes(header.toUpperCase()) &&
            elementText.length < 200 // Headers are usually short
        );

        if (isNextHeader) {
            break;
        }

        // Add this element's content
        if (elementText) {
            content += elementText + '\n';
        }

        // Move to next sibling
        currentEl = currentEl.next();

        // If no more siblings, try parent's next sibling
        if (currentEl.length === 0) {
            let parentEl = currentEl.parent();
            while (parentEl.length > 0 && parentEl.next().length === 0) {
                parentEl = parentEl.parent();
            }
            currentEl = parentEl.next();
        }
    }

    return content.trim();
}

/**
 * Fallback character position parsing for when HTML parsing fails
 */
function parseWithCharacterSlicing(text) {
    console.log("🔄 Using fallback character position parsing...");

    const sectionHeaders = [
        "SUMMARY OF QUALIFICATIONS", "PROFESSIONAL EXPERIENCE", "ACADEMIC BACKGROUND",
        "Profile", "PROFILE", "Summary", "SUMMARY", "Personal Statement", "Career Objective",
        "Nationality", "NATIONALITY", "Personal Details", "PERSONAL DETAILS", "Nationality & Languages",
        "Qualifications", "QUALIFICATIONS", "Education", "EDUCATION", "Academic Background",
        "Country work experience", "COUNTRY WORK EXPERIENCE", "International Experience", "Country Work Experience",
        "Experience", "EXPERIENCE", "Work Experience", "WORK EXPERIENCE", "Work History", "Highlighted experience",
        "Employment", "EMPLOYMENT", "Career History", "CAREER HISTORY", "Professional Experience",
        "Publications", "PUBLICATIONS", "Research", "RESEARCH", "Research Publications", "Journal Articles", "Conference Papers",
        "Skills", "Technical Skills", "Languages"
    ];

    const headerPattern = new RegExp(`(${sectionHeaders.join('|')})(?:\\s*\\(.*?\\))?\\s*:?`, 'gi');
    const matches = [...text.matchAll(headerPattern)];

    if (matches.length < 2) {
        console.warn(`⚠️ Character slicing found fewer than 2 headers. Returning as Header section.`);
        return { 'HEADER': text };
    }

    const sections = {};
    matches.sort((a, b) => a.index - b.index);

    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];

        const sectionName = currentMatch[1].trim().toUpperCase();
        const startIndex = currentMatch.index + currentMatch[0].length;
        const endIndex = nextMatch ? nextMatch.index : text.length;

        const content = text.substring(startIndex, endIndex).trim();
        sections[sectionName] = content;
    }

    console.log('✅ Character slicing complete. Found sections:', Object.keys(sections));
    return sections;
}

/**
 * Enhanced section consolidation with comprehensive mapping
 */
function consolidateSections(parsedSections) {
    console.log("⚙️ Consolidating sections with enhanced mapping...");

    // Define comprehensive section mappings
    const sectionMappings = {
        // Profile/Summary variations
        'PROFILE': 'profile',
        'SUMMARY': 'profile',
        'PERSONAL STATEMENT': 'profile',
        'CAREER OBJECTIVE': 'profile',
        'SUMMARY OF QUALIFICATIONS': 'profile',

        // Personal details variations
        'NATIONALITY': 'personal_details',
        'PERSONAL DETAILS': 'personal_details',
        'NATIONALITY & LANGUAGES': 'personal_details',

        // Qualifications/Education variations
        'QUALIFICATIONS': 'qualifications',
        'EDUCATION': 'qualifications',
        'ACADEMIC BACKGROUND': 'qualifications',

        // Experience variations  
        'EXPERIENCE': 'experience',
        'PROFESSIONAL EXPERIENCE': 'experience',
        'WORK EXPERIENCE': 'experience',
        'EMPLOYMENT': 'experience',
        'CAREER HISTORY': 'experience',
        'WORK HISTORY': 'experience',
        'HIGHLIGHTED EXPERIENCE': 'experience',

        // Country experience
        'COUNTRY WORK EXPERIENCE': 'country_experience',
        'INTERNATIONAL EXPERIENCE': 'country_experience',

        // Publications variations
        'PUBLICATIONS': 'publications',
        'RESEARCH': 'publications',
        'RESEARCH PUBLICATIONS': 'publications',
        'JOURNAL ARTICLES': 'publications',
        'CONFERENCE PAPERS': 'publications'
    };

    const consolidated = {
        profile: '',
        personal_details: '',
        country_experience: '',
        qualifications: '',
        publications: '',
        experience: ''
    };

    // Process all sections with enhanced mapping
    for (const [sectionName, content] of Object.entries(parsedSections)) {
        const upperCaseSectionName = sectionName.toUpperCase();
        const targetCategory = sectionMappings[upperCaseSectionName];

        if (targetCategory && content.trim()) {
            if (consolidated[targetCategory]) {
                consolidated[targetCategory] += '\n\n' + content.trim();
            } else {
                consolidated[targetCategory] = content.trim();
            }
        } else if (content.trim() && upperCaseSectionName !== 'HEADER') {
            console.log(`📝 Found unmapped section: "${sectionName}". Adding to experience.`);
            if (consolidated.experience) {
                consolidated.experience += '\n\n--- ' + sectionName + ' ---\n' + content.trim();
            } else {
                consolidated.experience = '--- ' + sectionName + ' ---\n' + content.trim();
            }
        }
    }

    console.log("✅ Enhanced consolidation complete. Final sections:");
    Object.entries(consolidated).forEach(([key, value]) => {
        console.log(`- ${key}: ${value.length} characters`);
    });

    return consolidated;
}

/**
 * Main processing function with TRUE HTML-based parsing (Phase 1)
 */
async function processCv(filePath, progressCallback = null) {
    try {
        if (progressCallback) progressCallback(5, 'Extracting HTML structure from document...');

        // PRIMARY: HTML-based parsing for structure preservation
        let parsedSections;
        try {
            const htmlContent = await extractHtmlFromDocx(filePath);
            parsedSections = parseCvFromHtml(htmlContent);

            // Check if HTML parsing succeeded
            if (parsedSections.__heuristic_parser_failed) {
                console.log(`⚠️ HTML parsing failed, falling back to character slicing...`);
                parsedSections = parseWithCharacterSlicing(parsedSections.rawText);
            } else {
                console.log(`🎉 HTML parsing successful! Found ${Object.keys(parsedSections).length} sections`);
            }
        } catch (htmlError) {
            console.log(`⚠️ HTML extraction failed: ${htmlError.message}`);
            console.log(`🔄 Falling back to raw text extraction...`);

            const rawText = await extractTextFromDocx(filePath);
            parsedSections = parseWithCharacterSlicing(rawText);
        }

        if (progressCallback) progressCallback(15, 'Consolidating sections...');

        const finalSegments = consolidateSections(parsedSections);

        // Pre-split experience entries using enhanced pattern matching
        if (progressCallback) progressCallback(25, 'Pre-splitting experience entries...');

        const experienceEntries = finalSegments.experience
            .split(/\n(?=\d{4})/) // Split on newlines followed by 4-digit years
            .filter(entry => entry.trim() !== "")
            .map(entry => entry.trim());

        console.log(`🔍 Pre-split the consolidated experience block into ${experienceEntries.length} individual entries.`);

        if (experienceEntries.length > 0) {
            console.log("📋 Sample entries:");
            experienceEntries.slice(0, 2).forEach((entry, index) => {
                console.log(`Entry ${index + 1} (${entry.length} chars): ${entry.substring(0, 100)}...`);
            });
        }

        if (progressCallback) progressCallback(30, 'Sending data to AI for extraction...');

        // Enhanced AI processing with pre-split entries
        const structuredData = await extractStructuredDataFromSegments(finalSegments, experienceEntries, progressCallback);

        console.log('🎉 TRUE HTML-based CV processing completed successfully!');
        console.log('📊 Final structured data preview:');
        console.log(`- Profile: ${structuredData.profile ? structuredData.profile.substring(0, 50) + '...' : 'Not extracted'}`);
        console.log(`- Experience entries: ${structuredData.experience ? structuredData.experience.length : 0}`);
        console.log(`- Publications: ${structuredData.publications ? structuredData.publications.length : 0}`);
        console.log(`- Qualifications: ${structuredData.qualifications ? structuredData.qualifications.length : 0}`);

        return structuredData;

    } catch (error) {
        console.error('❌ Error in TRUE HTML-based CV processing:', error);
        throw error;
    }
}

module.exports = { processCv }; 