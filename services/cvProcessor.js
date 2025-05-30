// services/cvProcessor.js (FINAL ADAPTIVE ENGINE - REFINED AND INTEGRATED)

const mammoth = require('mammoth');
const cheerio = require('cheerio');
const { extractStructuredDataFromSegments, segmentCvWithAi, extractCountriesFromText } = require('./llmService');
const path = require('path');

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
    console.log('📄 Extracting raw text from Word document (fallback)...');
    const { value } = await mammoth.extractRawText({ path: filePath });
    console.log(`📝 Extracted ${value.length} characters (raw text fallback)`);
    return value;
}

/**
 * PDF text extraction (placeholder - requires pdf-parse or similar library)
 */
async function extractTextFromPdf(filePath) {
    console.warn('📄 PDF processing is a placeholder. Please implement or use DOCX.');
    // For demonstration, we'll throw an error. Implement actual PDF parsing here.
    // Example: const data = await require('pdf-parse')(filePath); return data.text;
    throw new Error('PDF processing not yet fully implemented in this example.');
}

/**
 * ADAPTIVE HTML-BASED PARSING: Leverages DOM structure for section detection
 */
function parseCvFromHtml(htmlString) {
    console.log('⚙️ Parsing CV from HTML structure (Primary Method)...');
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
 * FINAL ADAPTIVE RULE-BASED PARSING (ROBUST TEXT SLICING METHOD):
 * This is the most robust text-based parser. It finds headers anywhere and slices content between them.
 */
function parseCvWithRobustTextSlicing(text) {
    console.log("⚙️ Using robust text slicing parser (Fallback Method)...");
    const headerPattern = new RegExp(`(${ALL_UNIQUE_HEADERS.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:\\s*\\(.*?\\))?:?`, 'gi');
    const sectionsFound = {}; // Use this for raw extracted sections by their original names
    const matches = [...text.matchAll(headerPattern)];

    console.log(`📍 Found ${matches.length} potential header matches in text for slicing.`);
    if (matches.length < 2) {
        console.warn(`⚠️ Robust text slicing parser found fewer than 2 headers.`);
        return { __parser_failed: true, rawText: text };
    }

    matches.sort((a, b) => a.index - b.index);

    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];
        const sectionName = currentMatch[1].trim();
        const startIndex = currentMatch.index + currentMatch[0].length;
        const endIndex = nextMatch ? nextMatch.index : text.length;
        const content = text.substring(startIndex, endIndex).trim();

        // Store using original header name, consolidation will map it
        if (content.length > 0) {
            sectionsFound[sectionName] = content; // Store by original name
            console.log(`📑 Sliced section: "${sectionName}" (${content.length} chars)`);
        }
    }
    console.log('✅ Robust text slicing complete. Sections found:', Object.keys(sectionsFound));
    return sectionsFound; // Return sections with original names
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
        'JOB BACKGROUND', 'Job Background', 'job background',
        'SUMMARY OF EMPLOYMENT', 'Summary of Employment', 'summary of employment',
        'CURRENT EMPLOYMENT', 'Current Employment', 'current employment'
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
        'RELATED EXPERIENCE', 'Related Experience', 'related experience',
        // REAL-WORLD TERMS DISCOVERED:
        'EXPERIENCES', 'Experiences', 'experiences',
        'ASSIGNMENTS', 'Assignments', 'assignments',
        'SELECTED PROFESSIONAL EXPERIENCE', 'Selected Professional Experience', 'selected professional experience',
        'VOLUNTEER WORK', 'Volunteer work', 'volunteer work',
        'SHORT-TERM ASSIGNMENTS/CONSULTANCIES', 'Short-term assignments/consultancies', 'short-term assignments/consultancies',
        'MAIN APPOINTMENTS', 'Main Appointments', 'main appointments',
        'PROJECTS', 'Projects', 'projects',
        'CAREER HISTORY AND KEY ACHIEVEMENTS', 'Career History and Key Achievements', 'career history and key achievements',
        // NEW TERMS ADDED:
        'SELECTED PROJECTS AND ASSIGNMENTS', 'Selected projects and assignments', 'selected projects and assignments',
        'RELEVANT WORKEXPERIENCE', 'Relevant WorkExperience', 'relevant workexperience',
        'PREVIOUS RELEVANT EXPERIENCE', 'Previous Relevant Experience', 'previous relevant experience',
        'PROFESSIONAL WORK EXPERIENCE', 'Professional Work Experience', 'professional work experience',
        // ADDITIONAL TERMS FROM TERMINAL OUTPUT:
        'TECHNICAL ADVISORY ROLES', 'Technical advisory roles', 'technical advisory roles',
        'ADVISORY ROLES', 'Advisory roles', 'advisory roles',
        'CONSULTANCY ROLES', 'Consultancy roles', 'consultancy roles',
        'CONSULTANCIES', 'Consultancies', 'consultancies',
        'TECHNICAL ADVISORY ROLES AND CONSULTANCIES', 'Technical advisory roles and consultancies', 'technical advisory roles and consultancies',
        'ADVISORY EXPERIENCE', 'Advisory experience', 'advisory experience',
        'CONSULTING ROLES', 'Consulting roles', 'consulting roles',
        'EVALUATION EXPERIENCE', 'Evaluation experience', 'evaluation experience',
        'EVALUATION ROLES', 'Evaluation roles', 'evaluation roles',
        'PROGRAMME EVALUATION', 'Programme evaluation', 'programme evaluation',
        'PROJECT EVALUATION', 'Project evaluation', 'project evaluation',
        'IMPACT EVALUATION', 'Impact evaluation', 'impact evaluation',
        'MONITORING AND EVALUATION', 'Monitoring and evaluation', 'monitoring and evaluation',
        'M&E EXPERIENCE', 'M&E experience', 'm&e experience',
        'DEVELOPMENT EXPERIENCE', 'Development experience', 'development experience',
        'INTERNATIONAL DEVELOPMENT', 'International development', 'international development',
        'HUMANITARIAN EXPERIENCE', 'Humanitarian experience', 'humanitarian experience',
        'FIELD EXPERIENCE', 'Field experience', 'field experience',
        'OPERATIONAL EXPERIENCE', 'Operational experience', 'operational experience',
        'MANAGEMENT EXPERIENCE', 'Management experience', 'management experience',
        'LEADERSHIP EXPERIENCE', 'Leadership experience', 'leadership experience',
        'TEAM LEADERSHIP', 'Team leadership', 'team leadership',
        'PROJECT MANAGEMENT', 'Project management', 'project management',
        'PROGRAMME MANAGEMENT', 'Programme management', 'programme management'
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
        'MEMBERSHIPS', 'Memberships', 'memberships',
        // NEW TERMS ADDED:
        'POST-GRADUATE', 'Post-graduate', 'post-graduate',
        'DIPLOMA', 'Diploma', 'diploma',
        'BA', 'Ba', 'ba'
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
        'PRESENTATIONS', 'Presentations', 'presentations',
        // REAL-WORLD TERMS DISCOVERED:
        'CONFERENCES/PUBLICATION', 'Conferences/Publication', 'conferences/publication'
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
        'REGIONAL EXPERIENCE', 'Regional Experience', 'regional experience',
        // REAL-WORLD TERMS DISCOVERED:
        'SPECIFIC COUNTRY EXPERIENCE', 'Specific country experience', 'specific country experience',
        'COUNTRIES OF WORK EXPERIENCES', 'Countries of Work Experiences', 'countries of work experiences'
    ]
};

// Helper to get a flat list of all unique header terms for regex
const ALL_UNIQUE_HEADERS = Object.values(SECTION_DICTIONARIES).flat().filter((v, i, a) => a.indexOf(v) === i);

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
 * Helper to collect content after a Cheerio element until the next recognized header.
 */
function collectContentAfterElementCheerio($, headerEl) {
    let content = '';
    let currentEl = headerEl.nextAll(); // Get all subsequent siblings

    for (let i = 0; i < currentEl.length; i++) {
        const el = $(currentEl[i]);
        const elText = el.text().trim();

        // Check if this sibling's text IS a known header (case-insensitive check)
        const isAnotherHeader = ALL_UNIQUE_HEADERS.some(h => elText.toUpperCase().startsWith(h.toUpperCase()) && elText.length < h.length + 10); // Allow for short variations

        if (isAnotherHeader) {
            // If the current element itself IS a header, stop.
            // This prevents consuming the next section's title.
            const isLikelyHeaderItself = ALL_UNIQUE_HEADERS.some(h => {
                const headerRegex = new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:\\s*|\\s*-\\s*)?$`, 'i');
                return headerRegex.test(elText);
            });
            if (isLikelyHeaderItself) break;
        }

        content += el.html() + '\n'; // Use .html() to preserve some formatting like line breaks within paragraphs
    }
    // Clean up HTML tags for the final text, convert <br> to newlines
    return cheerio.load(`<div>${content}</div>`).text().trim().replace(/\s*\n\s*/g, '\n');
}

/**
 * ADAPTIVE HTML-BASED PARSING: Prioritizes semantic HTML structure.
 */
function parseCvFromHtml(htmlString) {
    console.log('⚙️ Parsing CV from HTML structure (Primary Method)...');
    const $ = cheerio.load(htmlString);
    const sections = {};

    // Try to find headers in likely tags: h1-h6, strong, b, or p tags that look like headers
    const headerSelectors = 'h1, h2, h3, h4, h5, h6, strong, b, p';
    $(headerSelectors).each((i, el) => {
        const element = $(el);
        const headerText = element.text().trim();

        if (headerText.length === 0 || headerText.length > 100) return; // Skip empty or very long strings

        const matchedCategory = mapSectionToCategory(headerText); // Use your mapping function

        if (matchedCategory) {
            // Check if this category was already found by a more specific header or a larger content block
            const existingContentLength = (sections[matchedCategory] || "").length;
            const content = collectContentAfterElementCheerio($, element);

            if (content.length > existingContentLength) {
                console.log(`📑 Found HTML section: "${headerText}" → Mapped to: ${matchedCategory} (${content.length} chars)`);
                sections[matchedCategory] = content;
            } else if (!sections[matchedCategory]) { // If not found yet, add it
                console.log(`📑 Found HTML section (shorter/first): "${headerText}" → Mapped to: ${matchedCategory} (${content.length} chars)`);
                sections[matchedCategory] = content;
            }
        }
    });

    console.log(`✅ HTML parsing attempt complete. Found potential categories:`, Object.keys(sections));
    if (Object.keys(sections).length < 2) { // Threshold for considering the parse successful
        console.warn(`⚠️ HTML parser found fewer than 2 distinct categories. Structure may be unconventional.`);
        return { __parser_failed: true, rawText: $('body').text() }; // Pass body text for fallback
    }
    return sections; // Return the mapped sections directly
}

/**
 * ENHANCED SECTION CONSOLIDATION: Dictionary-based mapping with comprehensive employment terms
 */
function consolidateSections(parsedSectionsResult) {
    // If parsing failed, parsedSectionsResult will have __parser_failed flag.
    // The actual sections are the direct output from either HTML or text slicing parser.
    const sectionsToConsolidate = parsedSectionsResult.__parser_failed ? {} : parsedSectionsResult;

    console.log("⚙️ Consolidating parsed sections into standard categories...");
    const consolidated = {
        profile: '', personal_details: '', country_experience: '', qualifications: '',
        publications: '', experience: '', skills: '', additional_info: ''
    };

    for (const [sectionName, content] of Object.entries(sectionsToConsolidate)) {
        const category = mapSectionToCategory(sectionName); // mapSectionToCategory uses SECTION_DICTIONARIES
        if (category) {
            consolidated[category] = consolidated[category] ? `${consolidated[category]}\n\n${content}` : content;
        } else {
            consolidated.additional_info = consolidated.additional_info ? `${consolidated.additional_info}\n\n--- ${sectionName} ---\n${content}` : `--- ${sectionName} ---\n${content}`;
        }
    }
    console.log("✅ Consolidation complete.");
    Object.entries(consolidated).forEach(([key, value]) => {
        console.log(`📊 Consolidated ${key}: ${value.length} characters`);
    });
    return consolidated;
}

/**
 * ENHANCED EXPERIENCE SPLITTING: Multiple pattern recognition strategies
 */
function splitExperienceWithPatternRecognition(experienceText) {
    console.log("⚙️ Pre-splitting experience block using pattern recognition...");
    if (!experienceText || experienceText.trim().length === 0) {
        console.log("⚠️ No experience text to split.");
        return [];
    }
    // This is a simplified version. Your more complex multi-strategy splitter is better.
    // Key is to find patterns that reliably separate entries.
    // Example: Split on lines that start with a year or "From-To:"
    const entries = experienceText
        .split(/\n\s*(?=\d{4}(?:[-–]\d{4})?|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b|From[–-]To:)/i)
        .map(entry => entry.trim())
        .filter(entry => entry.length > 50); // Filter out very short or empty entries

    console.log(`✅ Split experience into ${entries.length} individual entries.`);
    return entries;
}

/**
 * MAIN PROCESSING FUNCTION: The Orchestrator
 */
async function processCv(filePath, progressCallback = null, originalFilename = null) {
    try {
        if (progressCallback) progressCallback(5, 'Starting CV processing...');
        console.log(`🔄 Starting CV processing for: ${filePath} (Original: ${originalFilename || 'N/A'})`);

        const fileExt = originalFilename ? path.extname(originalFilename).toLowerCase() : path.extname(filePath).toLowerCase();
        console.log(`📄 Detected file type: ${fileExt}`);

        let parsedSectionsOutput; // This will hold either parsed sections or a failure object
        let rawTextForAiFallback; // Store raw text in case all parsing fails

        if (['.docx', '.doc'].includes(fileExt)) {
            try {
                const htmlContent = await extractHtmlFromDocx(filePath);
                parsedSectionsOutput = parseCvFromHtml(htmlContent);
                rawTextForAiFallback = cheerio.load(htmlContent).text(); // Get text from HTML for fallback
            } catch (htmlError) {
                console.warn(`⚠️ HTML extraction/parsing failed: ${htmlError.message}. Trying raw text slicing.`);
                rawTextForAiFallback = await extractTextFromDocx(filePath);
                parsedSectionsOutput = parseCvWithRobustTextSlicing(rawTextForAiFallback);
            }
        } else if (fileExt === '.pdf') {
            rawTextForAiFallback = await extractTextFromPdf(filePath);
            parsedSectionsOutput = parseCvWithRobustTextSlicing(rawTextForAiFallback);
        } else {
            throw new Error(`Unsupported file format: ${fileExt}. Supported: .docx, .doc, .pdf`);
        }

        if (progressCallback) progressCallback(15, 'Initial parsing attempt complete...');

        let consolidatedSections;
        if (parsedSectionsOutput.__parser_failed) {
            console.log("🚦 All rule-based parsing methods failed for this document. Falling back to AI segmentation...");
            if (progressCallback) progressCallback(20, 'Rule-based parsing failed, using AI segmentation...');
            consolidatedSections = await segmentCvWithAi(rawTextForAiFallback); // segmentCvWithAi from llmService.js
        } else {
            // If parsing was successful, parsedSectionsOutput directly contains the sections
            consolidatedSections = consolidateSections(parsedSectionsOutput);
        }

        if (progressCallback) progressCallback(25, 'Sections consolidated...');

        const experienceEntries = splitExperienceWithPatternRecognition(consolidatedSections.experience);

        if (progressCallback) progressCallback(30, 'Experience entries split, extracting details...');

        // Targeted extraction for specific missing pieces if necessary
        if (!consolidatedSections.country_experience && consolidatedSections.profile) {
            console.log('🕵️‍♀️ Searching for embedded country data in profile...');
            consolidatedSections.country_experience = await extractCountriesFromText(consolidatedSections.profile); // from llmService.js
        }

        const structuredData = await extractStructuredDataFromSegments(consolidatedSections, experienceEntries, progressCallback);

        console.log('🎉 CV processing completed successfully!');
        return structuredData;

    } catch (error) {
        console.error('❌ Error in CV processing pipeline:', error);
        if (progressCallback) progressCallback(100, `Error: ${error.message}`);
        throw error;
    }
}

module.exports = { processCv }; 