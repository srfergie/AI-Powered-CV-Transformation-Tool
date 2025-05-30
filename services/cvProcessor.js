// services/cvProcessor.js (FINAL ADAPTIVE ENGINE)

const mammoth = require('mammoth');
const cheerio = require('cheerio');
const { extractStructuredDataFromSegments, segmentCvWithAi, extractCountriesFromText } = require('./llmService');

/**
 * Enhanced HTML extraction for better structure preservation
 */
async function extractHtmlFromDocx(filePath) {
    console.log('📄 Extracting HTML to preserve document structure...');
    const result = await mammoth.convertToHtml({ path: filePath });
    console.log(`✅ HTML extracted: ${result.value.length} characters`);
    return result.value;
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
 * ADAPTIVE HTML-BASED PARSING: Leverages DOM structure for section detection
 */
function parseCvFromHtml(htmlString) {
    console.log('⚙️ Parsing CV from HTML structure using adaptive DOM parsing...');
    const $ = cheerio.load(htmlString);
    const sections = {};

    // --- ENHANCEMENT 1: Expanded dictionary of headers ---
    const sectionHeaders = [
        "Overview", "Key Skills AND CONTRIBUTIONS", "Employment record", // Added for complex CVs
        "SUMMARY OF QUALIFICATIONS", "PROFESSIONAL EXPERIENCE", "ACADEMIC BACKGROUND",
        "Profile", "PROFILE", "Summary", "SUMMARY", "Personal Statement", "Career Objective",
        "Nationality", "NATIONALITY", "Personal Details", "PERSONAL DETAILS", "Nationality & Languages",
        "Qualifications", "QUALIFICATIONS", "Education", "EDUCATION", "Academic Background", "Affiliations", "Community Activities",
        "Country work experience", "COUNTRY WORK EXPERIENCE", "International Experience", "Country Work Experience",
        "Experience", "EXPERIENCE", "Work Experience", "WORK EXPERIENCE", "Work History", "Highlighted experience",
        "Employment", "EMPLOYMENT", "Career History", "CAREER HISTORY", "Professional Experience",
        "Publications", "PUBLICATIONS", "Research", "RESEARCH", "Research Publications", "Journal Articles", "Conference Papers",
        "Skills", "Technical Skills", "Languages"
    ];

    console.log(`🔍 Searching for headers using adaptive parsing with ${sectionHeaders.length} header patterns...`);

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

    console.log(`✅ Adaptive HTML parsing complete. Found sections:`, Object.keys(sections));
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
 * ADAPTIVE RULE-BASED PARSING: Enhanced fallback for text-based parsing
 */
function parseCvWithHeuristics(text) {
    console.log("⚙️ Starting adaptive rule-based CV parsing (slicing method)...");

    // --- ENHANCEMENT 1: Expanded dictionary of headers ---
    const sectionHeaders = [
        "Overview", "Key Skills AND CONTRIBUTIONS", "Employment record", // Added for complex CVs
        "Profile", "Summary", "Career Objective", "Personal Statement",
        "Experience", "Professional Experience", "Work History", "Employment", "Highlighted experience",
        "Education", "Academic Background", "Qualifications", "Affiliations", "Community Activities",
        "Publications", "Research Publications", "Journal Articles", "Conference Papers",
        "Skills", "Technical Skills",
        "Languages", "Nationality & Languages",
        "Country Work Experience"
    ];

    const headerPattern = new RegExp(`^\\s*(${sectionHeaders.join('|')})\\s*(?:\\(.*?\\))?:?\\s*$`, 'im');
    const sections = {};
    const lines = text.split(/\r?\n/);
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
        const match = line.match(headerPattern);
        if (match) {
            if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
            currentSection = match[1].trim();
            currentContent = [];
            console.log(`📑 Found section: "${currentSection}"`);
        } else if (currentSection) {
            currentContent.push(line);
        }
    }
    if (currentSection) sections[currentSection] = currentContent.join('\n').trim();

    if (Object.keys(sections).length < 2) {
        console.warn(`⚠️ Rule-based parser found fewer than 2 sections. Triggering AI fallback.`);
        return { __heuristic_parser_failed: true, rawText: text };
    }

    console.log('✅ Advanced parsing complete. Found sections:', Object.keys(sections));
    return sections;
}

/**
 * ENHANCED SECTION CONSOLIDATION: Handles wider range of section variations
 */
function consolidateSections(parsedSections) {
    console.log("⚙️ Consolidating sections with adaptive mapping...");

    // Define comprehensive section mappings
    const consolidated = {
        profile: '',
        personal_details: '',
        country_experience: '',
        qualifications: '',
        publications: '',
        experience: '',
        skills: ''
    };

    // --- ENHANCEMENT 2: Consolidate from a wider range of sections ---
    consolidated.profile = parsedSections['PROFILE'] || parsedSections['Profile'] || parsedSections['Overview'] || parsedSections['SUMMARY'] || parsedSections['Summary'] || parsedSections['PERSONAL STATEMENT'] || parsedSections['CAREER OBJECTIVE'] || parsedSections['SUMMARY OF QUALIFICATIONS'] || '';

    consolidated.qualifications = parsedSections['QUALIFICATIONS'] || parsedSections['Qualifications'] || parsedSections['EDUCATION'] || parsedSections['Education'] || parsedSections['ACADEMIC BACKGROUND'] || parsedSections['Academic Background'] || parsedSections['Affiliations'] || parsedSections['Community Activities'] || '';

    consolidated.publications = parsedSections['PUBLICATIONS'] || parsedSections['Publications'] || parsedSections['RESEARCH'] || parsedSections['Research'] || parsedSections['RESEARCH PUBLICATIONS'] || parsedSections['JOURNAL ARTICLES'] || parsedSections['CONFERENCE PAPERS'] || '';

    consolidated.skills = parsedSections['Key Skills AND CONTRIBUTIONS'] || parsedSections['SKILLS'] || parsedSections['Skills'] || parsedSections['TECHNICAL SKILLS'] || parsedSections['Technical Skills'] || '';

    consolidated.personal_details = parsedSections['NATIONALITY & LANGUAGES'] || parsedSections['Nationality & Languages'] || parsedSections['NATIONALITY'] || parsedSections['PERSONAL DETAILS'] || parsedSections['Languages'] || '';

    consolidated.country_experience = parsedSections['COUNTRY WORK EXPERIENCE'] || parsedSections['Country work experience'] || parsedSections['INTERNATIONAL EXPERIENCE'] || parsedSections['International Experience'] || '';

    // Combine all possible experience-related sections
    const experienceSources = [
        parsedSections['HIGHLIGHTED EXPERIENCE'],
        parsedSections['Highlighted experience'],
        parsedSections['EXPERIENCE'],
        parsedSections['Experience'],
        parsedSections['PROFESSIONAL EXPERIENCE'],
        parsedSections['Professional Experience'],
        parsedSections['WORK EXPERIENCE'],
        parsedSections['Work Experience'],
        parsedSections['EMPLOYMENT'],
        parsedSections['Employment'],
        parsedSections['CAREER HISTORY'],
        parsedSections['Career History'],
        parsedSections['WORK HISTORY'],
        parsedSections['Work History'],
        parsedSections['Employment record']
    ];
    consolidated.experience = experienceSources.filter(Boolean).join('\n\n');

    console.log("✅ Adaptive consolidation complete. Final sections:");
    Object.entries(consolidated).forEach(([key, value]) => {
        console.log(`- ${key}: ${value.length} characters`);
    });

    return consolidated;
}

/**
 * MAIN PROCESSING FUNCTION: Adaptive CV processing with multiple strategies
 */
async function processCv(filePath, progressCallback = null) {
    try {
        if (progressCallback) progressCallback(5, 'Starting adaptive CV processing...');

        console.log(`🔄 Starting adaptive CV processing for: ${filePath}`);

        // PRIMARY: HTML-based parsing for structure preservation
        let parsedSections;
        let consolidatedSections;

        try {
            const htmlContent = await extractHtmlFromDocx(filePath);
            parsedSections = parseCvFromHtml(htmlContent);

            // Check if HTML parsing succeeded
            if (parsedSections.__heuristic_parser_failed) {
                console.log(`⚠️ HTML parsing failed, falling back to rule-based parsing...`);
                parsedSections = parseCvWithHeuristics(parsedSections.rawText);

                if (parsedSections.__heuristic_parser_failed) {
                    console.log("🚦 Rule-based parsing also failed, falling back to AI segmentation...");
                    consolidatedSections = await segmentCvWithAi(parsedSections.rawText);
                } else {
                    consolidatedSections = consolidateSections(parsedSections);
                }
            } else {
                console.log(`🎉 HTML parsing successful! Found ${Object.keys(parsedSections).length} sections`);
                consolidatedSections = consolidateSections(parsedSections);
            }
        } catch (htmlError) {
            console.log(`⚠️ HTML extraction failed: ${htmlError.message}`);
            console.log(`🔄 Falling back to raw text extraction...`);

            const rawText = await extractTextFromDocx(filePath);
            parsedSections = parseCvWithHeuristics(rawText);

            if (parsedSections.__heuristic_parser_failed) {
                console.log("🚦 All parsing methods failed, using AI segmentation...");
                consolidatedSections = await segmentCvWithAi(parsedSections.rawText);
            } else {
                consolidatedSections = consolidateSections(parsedSections);
            }
        }

        if (progressCallback) progressCallback(15, 'Sections identified and consolidated...');

        // --- ENHANCEMENT 3: More flexible experience splitting ---
        // This new regex splits on a newline that is followed by EITHER a 4-digit year OR the text "From–To:".
        const experienceSplitter = /\n(?=\d{4}|From–To:)/i;
        const experienceEntries = consolidatedSections.experience
            .split(experienceSplitter)
            .filter(entry => entry.trim().length > 10); // Filter out small fragments

        console.log(`✅ Experience section consolidated: ${consolidatedSections.experience.length} characters`);
        console.log(`✅ Pre-split consolidated experience block into ${experienceEntries.length} individual entries using adaptive splitting.`);

        if (experienceEntries.length > 0) {
            console.log("📋 Sample entries:");
            experienceEntries.slice(0, 2).forEach((entry, index) => {
                console.log(`Entry ${index + 1} (${entry.length} chars): ${entry.substring(0, 100)}...`);
            });
        }

        if (progressCallback) progressCallback(25, 'Experience entries split and analyzed...');

        // --- ENHANCEMENT 4: Add targeted data extraction for embedded data ---
        // If country data wasn't found in a dedicated section, we ask the AI to find it in the profile.
        if (!consolidatedSections.country_experience && consolidatedSections.profile) {
            console.log('🕵️‍♀️ Country Experience section not found. Searching for embedded country data in profile...');
            if (progressCallback) progressCallback(28, 'Extracting embedded country data...');
            consolidatedSections.country_experience = await extractCountriesFromText(consolidatedSections.profile);
        }

        if (progressCallback) progressCallback(30, 'Sending data to AI for extraction...');

        // Enhanced AI processing with pre-split entries
        const structuredData = await extractStructuredDataFromSegments(consolidatedSections, experienceEntries, progressCallback);

        console.log('🎉 ADAPTIVE CV processing completed successfully!');
        console.log('📊 Final structured data preview:');
        console.log(`- Profile: ${structuredData.profile ? structuredData.profile.substring(0, 50) + '...' : 'Not extracted'}`);
        console.log(`- Experience entries: ${structuredData.experience ? structuredData.experience.length : 0}`);
        console.log(`- Publications: ${structuredData.publications ? structuredData.publications.length : 0}`);
        console.log(`- Qualifications: ${structuredData.qualifications ? structuredData.qualifications.length : 0}`);

        return structuredData;

    } catch (error) {
        console.error('❌ Error in ADAPTIVE CV processing:', error);
        throw error;
    }
}

module.exports = { processCv }; 