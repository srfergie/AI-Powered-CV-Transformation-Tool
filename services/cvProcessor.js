// services/cvProcessor.js (FINAL ADAPTIVE ENGINE)

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
    console.log('📄 Extracting raw text from Word document...');
    const { value } = await mammoth.extractRawText({ path: filePath });
    console.log(`📝 Extracted ${value.length} characters from document`);
    return value;
}

/**
 * PDF text extraction (placeholder - requires pdf-parse or similar library)
 */
async function extractTextFromPdf(filePath) {
    console.log('📄 Extracting text from PDF document...');
    // Note: This would require installing pdf-parse: npm install pdf-parse
    // For now, throw an error with helpful message
    throw new Error('PDF processing not yet implemented. Please convert to DOCX format or install pdf-parse library.');
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
 * FINAL ADAPTIVE RULE-BASED PARSING (ROBUST TEXT SLICING METHOD):
 * This is the most robust text-based parser. It finds headers anywhere and slices content between them.
 */
function parseCvWithRobustTextSlicing(text) {
    console.log("⚙️ Starting MOST ROBUST rule-based CV parsing (slicing method)...");
    console.log(`🔍 Using ${Object.values(SECTION_DICTIONARIES).flat().length} section header patterns from comprehensive dictionary`);

    // Get all unique dictionary terms for the most comprehensive header detection
    const sectionHeaders = Object.values(SECTION_DICTIONARIES).flat()
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    // Create a global, case-insensitive regex that matches any header anywhere in the text
    const headerPattern = new RegExp(`(${sectionHeaders.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:\\s*\\(.*?\\))?:?`, 'gi');

    const sections = {};
    const matches = [...text.matchAll(headerPattern)];

    console.log(`📍 Found ${matches.length} potential header matches in text`);

    if (matches.length < 2) {
        console.warn(`⚠️ Robust text slicing parser found fewer than 2 section headers.`);
        return { __heuristic_parser_failed: true, rawText: text };
    }

    // Sort matches by their position in the text
    matches.sort((a, b) => a.index - b.index);

    // Slice content between headers
    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];
        const sectionName = currentMatch[1].trim(); // The matched header text
        const startIndex = currentMatch.index + currentMatch[0].length;
        const endIndex = nextMatch ? nextMatch.index : text.length;
        const content = text.substring(startIndex, endIndex).trim();

        // Prioritize more specific or longer content if a header matches multiple times
        const normalizedSectionName = sectionName.toUpperCase();
        if (!sections[normalizedSectionName] || content.length > (sections[normalizedSectionName] || "").length) {
            sections[normalizedSectionName] = content;
        }
        console.log(`📑 Found section via slicing: "${sectionName}" (${content.length} chars)`);
    }

    console.log('✅ Robust text slicing parsing complete. Found sections:', Object.keys(sections));
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

            // Enhanced fallback: try to categorize by keyword presence in content and section name
            const contentLower = content.toLowerCase();
            const sectionLower = sectionName.toLowerCase();

            // Check section name for experience-related keywords
            const experienceKeywords = ['experience', 'role', 'position', 'consultant', 'advisor', 'evaluation', 'project', 'assignment', 'work', 'employment', 'career', 'professional', 'technical', 'advisory', 'consulting', 'management', 'leadership'];
            const hasExperienceKeyword = experienceKeywords.some(keyword => sectionLower.includes(keyword));

            if (hasExperienceKeyword || contentLower.includes('employment') || contentLower.includes('position') ||
                contentLower.includes('job') || contentLower.includes('career') || contentLower.includes('consultant') ||
                contentLower.includes('advisor') || contentLower.includes('evaluation') || contentLower.includes('project')) {
                console.log(`   → FALLBACK: Assigning to employment based on content/section name`);
                mappedSections.employment.push(content);
            } else if (contentLower.includes('experience') || contentLower.includes('role') ||
                contentLower.includes('consulting') || contentLower.includes('assignment') ||
                contentLower.includes('technical') || contentLower.includes('advisory') ||
                contentLower.includes('management') || contentLower.includes('leadership')) {
                console.log(`   → FALLBACK: Assigning to experience based on content/section name`);
                mappedSections.experience.push(content);
            } else if (contentLower.includes('education') || contentLower.includes('degree') ||
                contentLower.includes('university') || contentLower.includes('qualification') ||
                contentLower.includes('diploma') || contentLower.includes('certificate')) {
                console.log(`   → FALLBACK: Assigning to qualifications based on content`);
                mappedSections.qualifications.push(content);
            } else if (contentLower.includes('skill') || contentLower.includes('competenc') ||
                contentLower.includes('expertise') || contentLower.includes('technical')) {
                console.log(`   → FALLBACK: Assigning to skills based on content`);
                mappedSections.skills.push(content);
            } else if (contentLower.includes('publication') || contentLower.includes('research') ||
                contentLower.includes('article') || contentLower.includes('paper') ||
                contentLower.includes('journal') || contentLower.includes('conference')) {
                console.log(`   → FALLBACK: Assigning to publications based on content`);
                mappedSections.publications.push(content);
            } else if (contentLower.includes('nationality') || contentLower.includes('language') ||
                contentLower.includes('personal') || contentLower.includes('contact')) {
                console.log(`   → FALLBACK: Assigning to personal_details based on content`);
                mappedSections.personal_details.push(content);
            } else if (contentLower.includes('country') || contentLower.includes('international') ||
                contentLower.includes('global') || contentLower.includes('regional')) {
                console.log(`   → FALLBACK: Assigning to country_experience based on content`);
                mappedSections.country_experience.push(content);
            } else {
                // If we still can't categorize it and it's substantial content, put it in experience as a last resort
                if (content.length > 100) {
                    console.log(`   → LAST RESORT: Assigning substantial unmapped content to experience (${content.length} chars)`);
                    mappedSections.experience.push(content);
                } else {
                    console.log(`   → IGNORED: Content too short and unrecognizable (${content.length} chars)`);
                }
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
 * ENHANCED EXPERIENCE SPLITTING: Multiple pattern recognition strategies
 */
function splitExperienceWithPatternRecognition(experienceText) {
    console.log("⚙️ Enhanced experience splitting with multiple pattern recognition...");
    console.log(`📝 Processing experience text: ${experienceText.length} characters`);

    if (!experienceText || experienceText.trim().length === 0) {
        console.log("⚠️ No experience text to split");
        return [];
    }

    const strategies = [
        {
            name: "Job Title + Organization",
            description: "Matches job titles followed by organizations",
            test: (text) => {
                // Look for patterns like "2020-2021, Senior Consultant | UNDP | Location"
                const patterns = [
                    /\d{4}[-–]\d{4}[,\s]*[^,\n]+[,|\|][^,\n]+[,|\|]/g,
                    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}[^,\n]+[,|\|]/g
                ];

                let count = 0;
                for (const pattern of patterns) {
                    const matches = text.match(pattern);
                    if (matches) count += matches.length;
                }
                return count;
            },
            split: (text) => {
                // Split on lines that contain date + role + organization patterns
                const splitPattern = /(?=\d{4}[-–]\d{4}[,\s]*[^,\n]+[,|\|])/g;
                return text.split(splitPattern).filter(entry => entry.trim().length > 50);
            }
        },
        {
            name: "Date Ranges",
            description: "Matches entries with date ranges",
            test: (text) => {
                const patterns = [
                    /(?:^|\n)\s*\d{4}[-–]\d{4}/gm,
                    /(?:^|\n)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–]/gm,
                    /(?:^|\n)\s*\d{4}\s*[-–]\s*(?:present|current|ongoing)/gmi
                ];

                let count = 0;
                for (const pattern of patterns) {
                    const matches = text.match(pattern);
                    if (matches) count += matches.length;
                }
                return count;
            },
            split: (text) => {
                const splitPattern = /(?=(?:^|\n)\s*(?:\d{4}[-–]\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}))/gm;
                return text.split(splitPattern).filter(entry => entry.trim().length > 50);
            }
        },
        {
            name: "Role Titles",
            description: "Matches common job role titles",
            test: (text) => {
                const rolePattern = /(?:^|\n)\s*(?:Senior\s+|Principal\s+|Lead\s+|Deputy\s+|Assistant\s+)?(?:Consultant|Manager|Director|Coordinator|Specialist|Advisor|Evaluator|Analyst|Officer|Team Leader)/gmi;
                const matches = text.match(rolePattern);
                return matches ? matches.length : 0;
            },
            split: (text) => {
                const splitPattern = /(?=(?:^|\n)\s*(?:Senior\s+|Principal\s+|Lead\s+|Deputy\s+|Assistant\s+)?(?:Consultant|Manager|Director|Coordinator|Specialist|Advisor|Evaluator|Analyst|Officer|Team Leader))/gmi;
                return text.split(splitPattern).filter(entry => entry.trim().length > 50);
            }
        },
        {
            name: "Year Patterns",
            description: "Matches year ranges and from/to patterns",
            test: (text) => {
                const patterns = [
                    /(?:^|\n)\s*\d{4}/gm,
                    /From[-–]?To:/gmi,
                    /\d{4}\s*[-–]\s*\d{4}/g
                ];

                let count = 0;
                for (const pattern of patterns) {
                    const matches = text.match(pattern);
                    if (matches) count += matches.length;
                }
                return count;
            },
            split: (text) => {
                const splitPattern = /(?=(?:^|\n)\s*(?:\d{4}|From[-–]?To:))/gmi;
                return text.split(splitPattern).filter(entry => entry.trim().length > 50);
            }
        },
        {
            name: "Double Line Breaks",
            description: "Splits on double line breaks",
            test: (text) => {
                const entries = text.split(/\n\s*\n/).filter(entry => entry.trim().length > 50);
                return entries.length;
            },
            split: (text) => {
                return text.split(/\n\s*\n/).filter(entry => entry.trim().length > 50);
            }
        },
        {
            name: "Bullet Points",
            description: "Splits on numbered or bulleted sections",
            test: (text) => {
                const bulletPattern = /(?:^|\n)\s*(?:\d+\.|•|‣|▪|▫|-)\s+/gm;
                const matches = text.match(bulletPattern);
                return matches ? matches.length : 0;
            },
            split: (text) => {
                const splitPattern = /(?=(?:^|\n)\s*(?:\d+\.|•|‣|▪|▫|-)\s+)/gm;
                return text.split(splitPattern).filter(entry => entry.trim().length > 50);
            }
        }
    ];

    let bestStrategy = null;
    let maxEntries = 0;

    // Test each strategy
    for (const strategy of strategies) {
        console.log(`🔍 Trying strategy: ${strategy.name} - ${strategy.description}`);
        const entryCount = strategy.test(experienceText);
        console.log(`   Found ${entryCount} potential entries`);

        if (entryCount > maxEntries) {
            maxEntries = entryCount;
            bestStrategy = strategy;
            console.log(`   ✅ New best strategy: ${strategy.name} with ${entryCount} entries`);
        }
    }

    // Split using the best strategy
    let splitEntries = [];
    if (bestStrategy && maxEntries > 0) {
        console.log(`🎯 Final result: Using ${bestStrategy.name} strategy`);
        splitEntries = bestStrategy.split(experienceText);
    } else {
        // Fallback to simple splitting
        console.log("⚠️ No strategy worked well, using simple line break splitting");
        splitEntries = experienceText.split(/\n{2,}/).filter(entry => entry.trim().length > 50);

        // If still no good splits, try single line breaks with longer entries
        if (splitEntries.length <= 1) {
            splitEntries = experienceText.split(/\n/).filter(entry => entry.trim().length > 100);
        }

        // Last resort: return the entire text as one entry if it's substantial
        if (splitEntries.length === 0 && experienceText.trim().length > 100) {
            splitEntries = [experienceText.trim()];
        }
    }

    console.log(`📊 Split into ${splitEntries.length} individual experience entries`);

    // Log sample entries
    splitEntries.slice(0, 2).forEach((entry, index) => {
        const preview = entry.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   ${index + 1}. ${preview}... (${entry.length} chars)`);
    });

    console.log(`✅ Successfully split experience into ${splitEntries.length} individual entries`);

    return splitEntries;
}

/**
 * MAIN PROCESSING FUNCTION: The Orchestrator with Robust Parsing Flow
 */
async function processCv(filePath, progressCallback = null) {
    try {
        if (progressCallback) progressCallback(5, 'Starting adaptive CV processing...');

        console.log(`🔄 Starting adaptive CV processing for: ${filePath}`);

        // Determine file type and processing strategy
        const fileExt = path.extname(filePath).toLowerCase();
        let parsedSections;
        let consolidatedSections;
        let rawTextForFallback;

        if (['.docx', '.doc'].includes(fileExt)) {
            console.log('📄 Processing as Word document');
            try {
                // PRIMARY: HTML-based parsing for structure preservation
                console.log('📄 Starting Word document parsing:', filePath);
                const htmlContent = await extractHtmlFromDocx(filePath);
                parsedSections = parseCvFromHtml(htmlContent);
                rawTextForFallback = cheerio.load(htmlContent).text(); // Extract text for fallback

                if (parsedSections.__heuristic_parser_failed) {
                    console.log(`⚠️ HTML parsing failed, falling back to robust text slicing...`);
                    parsedSections = parseCvWithRobustTextSlicing(rawTextForFallback);
                } else {
                    console.log(`🎉 HTML parsing successful! Found ${Object.keys(parsedSections).length} sections`);
                }
            } catch (htmlError) {
                console.log(`⚠️ HTML extraction failed: ${htmlError.message}`);
                console.log(`🔄 Falling back to raw text extraction and robust slicing...`);

                const rawText = await extractTextFromDocx(filePath);
                rawTextForFallback = rawText;
                parsedSections = parseCvWithRobustTextSlicing(rawText);
            }
        } else if (fileExt === '.pdf') {
            console.log('📄 Processing as PDF document');
            rawTextForFallback = await extractTextFromPdf(filePath); // Assuming this function exists
            parsedSections = parseCvWithRobustTextSlicing(rawTextForFallback);
        } else {
            throw new Error(`Unsupported file format: ${fileExt}`);
        }

        if (progressCallback) progressCallback(15, 'Initial text extraction complete...');

        // If robust text slicing also failed, fall back to AI segmentation
        if (parsedSections.__heuristic_parser_failed) {
            console.log("🚦 All rule-based parsing methods failed, using AI segmentation...");
            if (progressCallback) progressCallback(20, 'Rule-based parsing failed, trying AI segmentation...');
            consolidatedSections = await segmentCvWithAi(rawTextForFallback);
        } else {
            consolidatedSections = consolidateSections(parsedSections);
        }

        if (progressCallback) progressCallback(25, 'Sections identified and consolidated...');

        // --- ENHANCEMENT 3: Enhanced experience splitting with multiple pattern recognition ---
        const experienceEntries = splitExperienceWithPatternRecognition(consolidatedSections.experience);

        console.log(`✅ Experience section consolidated: ${consolidatedSections.experience.length} characters`);
        console.log(`✅ Pre-split consolidated experience block into ${experienceEntries.length} individual entries using adaptive splitting.`);

        if (experienceEntries.length > 0) {
            console.log("📋 Sample entries:");
            experienceEntries.slice(0, 2).forEach((entry, index) => {
                console.log(`Entry ${index + 1} (${entry.length} chars): ${entry.substring(0, 100)}...`);
            });
        }

        if (progressCallback) progressCallback(30, 'Experience entries split, extracting details...');

        // --- ENHANCEMENT 4: Add targeted data extraction for embedded data ---
        // If country data wasn't found in a dedicated section, we ask the AI to find it in the profile.
        if (!consolidatedSections.country_experience && consolidatedSections.profile) {
            console.log('🕵️‍♀️ Country Experience section not found. Searching for embedded country data in profile...');
            if (progressCallback) progressCallback(28, 'Extracting embedded country data...');
            consolidatedSections.country_experience = await extractCountriesFromText(consolidatedSections.profile);
        }

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
        if (progressCallback) progressCallback(100, `Error: ${error.message}`);
        throw error;
    }
}

module.exports = { processCv }; 