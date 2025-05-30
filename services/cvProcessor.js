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
 * COMPREHENSIVE SECTION DICTIONARIES: Extensive employment and section terms
 */
const SECTION_DICTIONARIES = {
    // Formal Employment terms - job positions, work history, employment records
    employment: [
        'EMPLOYMENT', 'Employment', 'employment',
        'EMPLOYMENT RECORD', 'Employment record', 'employment record',
        'EMPLOYMENT HISTORY', 'Employment History', 'employment history',
        'PROFESSIONAL EMPLOYMENT', 'Professional Employment', 'professional employment',
        'WORK EMPLOYMENT', 'Work Employment', 'work employment',
        'JOB HISTORY', 'Job History', 'job history',
        'CAREER RECORD', 'Career Record', 'career record',
        'WORK RECORD', 'Work Record', 'work record',
        'WORK HISTORY', 'Work History', 'work history',
        'CAREER HISTORY', 'Career History', 'career history',
        'POSITIONS HELD', 'Positions Held', 'positions held',
        'PROFESSIONAL ROLES', 'Professional Roles', 'professional roles',
        'CURRENT POSITION', 'Current Position', 'current position',
        'PREVIOUS POSITIONS', 'Previous Positions', 'previous positions',
        'EMPLOYMENT BACKGROUND', 'Employment Background', 'employment background',
        'JOB BACKGROUND', 'Job Background', 'job background'
    ],

    // Broader Experience terms - projects, consulting, relevant experience
    experience: [
        'EXPERIENCE', 'Experience', 'experience',
        'PROFESSIONAL EXPERIENCE', 'Professional Experience', 'professional experience',
        'RELEVANT EXPERIENCE', 'Relevant Experience', 'relevant experience',
        'OTHER RELEVANT EXPERIENCE', 'Other relevant experience', 'other relevant experience',
        'PREVIOUS EXPERIENCE', 'Previous Experience', 'previous experience',
        'ADDITIONAL EXPERIENCE', 'Additional Experience', 'additional experience',
        'WORK EXPERIENCE', 'Work Experience', 'work experience',
        'JOB EXPERIENCE', 'Job Experience', 'job experience',
        'CAREER EXPERIENCE', 'Career Experience', 'career experience',
        'PROFESSIONAL BACKGROUND', 'Professional Background', 'professional background',
        'WORK BACKGROUND', 'Work Background', 'work background',
        'CAREER PROGRESSION', 'Career Progression', 'career progression',
        'CAREER SUMMARY', 'Career Summary', 'career summary',
        'WORK SUMMARY', 'Work Summary', 'work summary',
        'PROFESSIONAL SUMMARY', 'Professional Summary', 'professional summary',
        'ROLES AND RESPONSIBILITIES', 'Roles and Responsibilities', 'roles and responsibilities',
        'HIGHLIGHTED EXPERIENCE', 'Highlighted experience', 'highlighted experience',
        'KEY EXPERIENCE', 'Key Experience', 'key experience',
        'OCCUPATIONAL EXPERIENCE', 'Occupational Experience', 'occupational experience',
        'CONSULTING EXPERIENCE', 'Consulting Experience', 'consulting experience',
        'PROJECT EXPERIENCE', 'Project Experience', 'project experience',
        'VOLUNTEER EXPERIENCE', 'Volunteer Experience', 'volunteer experience',
        'RELATED EXPERIENCE', 'Related Experience', 'related experience'
    ],

    // Profile/Summary terms
    profile: [
        'PROFILE', 'Profile', 'profile',
        'OVERVIEW', 'Overview', 'overview',
        'SUMMARY', 'Summary', 'summary',
        'PERSONAL STATEMENT', 'Personal Statement', 'personal statement',
        'CAREER OBJECTIVE', 'Career Objective', 'career objective',
        'SUMMARY OF QUALIFICATIONS', 'Summary of Qualifications', 'summary of qualifications',
        'EXECUTIVE SUMMARY', 'Executive Summary', 'executive summary',
        'PROFESSIONAL PROFILE', 'Professional Profile', 'professional profile',
        'PERSONAL PROFILE', 'Personal Profile', 'personal profile',
        'ABOUT ME', 'About Me', 'about me',
        'INTRODUCTION', 'Introduction', 'introduction'
    ],

    // Education/Qualifications terms
    qualifications: [
        'QUALIFICATIONS', 'Qualifications', 'qualifications',
        'EDUCATION', 'Education', 'education',
        'ACADEMIC BACKGROUND', 'Academic Background', 'academic background',
        'EDUCATIONAL BACKGROUND', 'Educational Background', 'educational background',
        'ACADEMIC QUALIFICATIONS', 'Academic Qualifications', 'academic qualifications',
        'EDUCATIONAL QUALIFICATIONS', 'Educational Qualifications', 'educational qualifications',
        'ACADEMIC HISTORY', 'Academic History', 'academic history',
        'EDUCATIONAL HISTORY', 'Educational History', 'educational history',
        'DEGREES', 'Degrees', 'degrees',
        'CERTIFICATIONS', 'Certifications', 'certifications',
        'CREDENTIALS', 'Credentials', 'credentials',
        'TRAINING', 'Training', 'training',
        'AFFILIATIONS', 'Affiliations', 'affiliations',
        'COMMUNITY ACTIVITIES', 'Community Activities', 'community activities',
        'MEMBERSHIPS', 'Memberships', 'memberships'
    ],

    // Publications/Research terms
    publications: [
        'PUBLICATIONS', 'Publications', 'publications',
        'RESEARCH', 'Research', 'research',
        'RESEARCH PUBLICATIONS', 'Research Publications', 'research publications',
        'JOURNAL ARTICLES', 'Journal Articles', 'journal articles',
        'CONFERENCE PAPERS', 'Conference Papers', 'conference papers',
        'ACADEMIC PUBLICATIONS', 'Academic Publications', 'academic publications',
        'SCHOLARLY WORK', 'Scholarly Work', 'scholarly work',
        'PAPERS', 'Papers', 'papers',
        'ARTICLES', 'Articles', 'articles',
        'BOOKS', 'Books', 'books',
        'CHAPTERS', 'Chapters', 'chapters',
        'PRESENTATIONS', 'Presentations', 'presentations'
    ],

    // Skills terms
    skills: [
        'SKILLS', 'Skills', 'skills',
        'KEY SKILLS', 'Key Skills', 'key skills',
        'KEY SKILLS AND CONTRIBUTIONS', 'Key Skills AND CONTRIBUTIONS', 'key skills and contributions',
        'TECHNICAL SKILLS', 'Technical Skills', 'technical skills',
        'CORE COMPETENCIES', 'Core Competencies', 'core competencies',
        'COMPETENCIES', 'Competencies', 'competencies',
        'EXPERTISE', 'Expertise', 'expertise',
        'AREAS OF EXPERTISE', 'Areas of Expertise', 'areas of expertise',
        'CORE SKILLS', 'Core Skills', 'core skills',
        'PROFESSIONAL SKILLS', 'Professional Skills', 'professional skills',
        'SPECIALIZED SKILLS', 'Specialized Skills', 'specialized skills',
        'CAPABILITIES', 'Capabilities', 'capabilities',
        'STRENGTHS', 'Strengths', 'strengths'
    ],

    // Personal details terms
    personal_details: [
        'NATIONALITY', 'Nationality', 'nationality',
        'NATIONALITY & LANGUAGES', 'Nationality & Languages', 'nationality & languages',
        'PERSONAL DETAILS', 'Personal Details', 'personal details',
        'PERSONAL INFORMATION', 'Personal Information', 'personal information',
        'CONTACT DETAILS', 'Contact Details', 'contact details',
        'CONTACT INFORMATION', 'Contact Information', 'contact information',
        'LANGUAGES', 'Languages', 'languages',
        'LANGUAGE SKILLS', 'Language Skills', 'language skills',
        'LINGUISTIC SKILLS', 'Linguistic Skills', 'linguistic skills'
    ],

    // Country experience terms
    country_experience: [
        'COUNTRY WORK EXPERIENCE', 'Country work experience', 'country work experience',
        'COUNTRY EXPERIENCE', 'Country Experience', 'country experience',
        'INTERNATIONAL EXPERIENCE', 'International Experience', 'international experience',
        'GLOBAL EXPERIENCE', 'Global Experience', 'global experience',
        'OVERSEAS EXPERIENCE', 'Overseas Experience', 'overseas experience',
        'CROSS-CULTURAL EXPERIENCE', 'Cross-Cultural Experience', 'cross-cultural experience',
        'MULTICULTURAL EXPERIENCE', 'Multicultural Experience', 'multicultural experience',
        'REGIONAL EXPERIENCE', 'Regional Experience', 'regional experience'
    ]
};

/**
 * Smart section mapping function using comprehensive dictionaries
 */
function mapSectionToCategory(sectionName) {
    console.log(`🔍 Attempting to map section: "${sectionName}"`);

    const sectionUpper = sectionName.toUpperCase();

    // First pass: Look for exact matches (prioritize precision)
    for (const [category, terms] of Object.entries(SECTION_DICTIONARIES)) {
        for (const term of terms) {
            const termUpper = term.toUpperCase();

            if (sectionUpper === termUpper) {
                console.log(`✅ EXACT MATCH: "${sectionName}" → ${category} (exact term: "${term}")`);
                return category;
            }
        }
    }

    // Second pass: Look for contains matches (broader matching)
    for (const [category, terms] of Object.entries(SECTION_DICTIONARIES)) {
        for (const term of terms) {
            const termUpper = term.toUpperCase();

            // Check both directions for flexible matching
            const includesMatch = sectionUpper.includes(termUpper);
            const reverseMatch = termUpper.includes(sectionUpper);

            if (includesMatch || reverseMatch) {
                console.log(`✅ PARTIAL MATCH: "${sectionName}" → ${category} (matched term: "${term}")`);
                return category;
            }
        }
    }

    console.log(`❌ NO MATCH: "${sectionName}" - checking fallback options`);
    return null; // No match found
}

/**
 * ENHANCED SECTION CONSOLIDATION: Dictionary-based mapping with comprehensive employment terms
 */
function consolidateSections(parsedSections) {
    console.log("⚙️ Consolidating sections with adaptive dictionary-based mapping...");

    // Initialize consolidated sections
    const consolidated = {
        profile: '',
        personal_details: '',
        country_experience: '',
        qualifications: '',
        publications: '',
        experience: '',
        employment: '', // NEW: Separate category for formal employment
        skills: ''
    };

    // Map each found section to appropriate category using dictionaries
    const mappedSections = {
        profile: [],
        personal_details: [],
        country_experience: [],
        qualifications: [],
        publications: [],
        experience: [],
        employment: [], // NEW: Separate array for employment
        skills: []
    };

    console.log("📋 Mapping found sections to categories:");
    for (const [sectionName, content] of Object.entries(parsedSections)) {
        const category = mapSectionToCategory(sectionName);
        if (category) {
            console.log(`   "${sectionName}" → ${category} (${content.length} chars)`);
            mappedSections[category].push(content);
        } else {
            console.log(`   "${sectionName}" → UNMAPPED (${content.length} chars)`);

            // Fallback: try to categorize by keyword presence in content
            const contentLower = content.toLowerCase();
            if (contentLower.includes('employment') || contentLower.includes('position') ||
                contentLower.includes('job') || contentLower.includes('career')) {
                console.log(`   → FALLBACK: Assigning to employment based on content`);
                mappedSections.employment.push(content);
            } else if (contentLower.includes('experience') || contentLower.includes('role') ||
                contentLower.includes('consulting') || contentLower.includes('project')) {
                console.log(`   → FALLBACK: Assigning to experience based on content`);
                mappedSections.experience.push(content);
            } else if (contentLower.includes('education') || contentLower.includes('degree') ||
                contentLower.includes('university') || contentLower.includes('qualification')) {
                console.log(`   → FALLBACK: Assigning to qualifications based on content`);
                mappedSections.qualifications.push(content);
            } else if (contentLower.includes('skill') || contentLower.includes('competenc')) {
                console.log(`   → FALLBACK: Assigning to skills based on content`);
                mappedSections.skills.push(content);
            }
        }
    }

    // Consolidate mapped sections
    for (const [category, contentArray] of Object.entries(mappedSections)) {
        consolidated[category] = contentArray.filter(Boolean).join('\n\n');
    }

    // Combine employment and experience for unified processing
    // (Since current DOCX structure expects single experience field)
    const combinedExperience = [consolidated.employment, consolidated.experience]
        .filter(Boolean)
        .join('\n\n');
    consolidated.experience = combinedExperience;

    console.log("✅ Dictionary-based consolidation complete. Final sections:");
    console.log(`- Employment sections found: ${consolidated.employment.length} characters`);
    console.log(`- Experience sections found: ${mappedSections.experience.reduce((sum, exp) => sum + exp.length, 0)} characters`);
    console.log(`- Combined experience total: ${consolidated.experience.length} characters`);
    Object.entries(consolidated).forEach(([key, value]) => {
        if (key !== 'employment') { // Don't double-log employment since it's now in experience
            console.log(`- ${key}: ${value.length} characters`);
        }
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