// services/cvProcessor.js (ENHANCED WITH DEDUPLICATION)

const mammoth = require('mammoth');
const cheerio = require('cheerio');
const { extractStructuredDataFromSegments, segmentCvWithAi, extractCountriesFromText } = require('./llmService');
const path = require('path');

/**
 * Extract HTML from DOCX file to preserve document structure
 */
async function extractHtmlFromDocx(filePath) {
    const result = await mammoth.convertToHtml({ path: filePath });
    return result.value;
}

/**
 * Extract raw text from DOCX file as fallback
 */
async function extractTextFromDocx(filePath) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
}

/**
 * Extract text from PDF file (placeholder for future implementation)
 */
async function extractTextFromPdf(filePath) {
    throw new Error('PDF processing not yet implemented. Please use DOCX format.');
}

/**
 * Enhanced comprehensive section dictionaries for CV parsing - IOD PARC specific
 */
const SECTION_DICTIONARIES = {
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
        'CURRENT EMPLOYMENT', 'Current Employment', 'current employment',
        'PAST EMPLOYMENT', 'Past Employment', 'past employment',
        'EMPLOYMENT DETAILS', 'Employment Details', 'employment details',
        'CAREER PROGRESSION', 'Career Progression', 'career progression',
        'PROFESSIONAL APPOINTMENTS', 'Professional Appointments', 'professional appointments',
        'POSTS HELD', 'Posts Held', 'posts held',
        'EMPLOYMENT POSITIONS', 'Employment Positions', 'employment positions',
        'FULL-TIME EMPLOYMENT', 'Full-time Employment', 'full-time employment',
        'PERMANENT POSITIONS', 'Permanent Positions', 'permanent positions'
    ],

    experience: [
        'EXPERIENCE', 'Experience', 'experience',
        'WORK EXPERIENCE', 'Work Experience', 'work experience',
        'PROFESSIONAL EXPERIENCE', 'Professional Experience', 'professional experience',
        'RELEVANT EXPERIENCE', 'Relevant Experience', 'relevant experience',
        'CAREER HIGHLIGHTS', 'Career Highlights', 'career highlights',
        'CAREER PROFILE', 'Career Profile', 'career profile',
        'RECENT PROFESSIONAL EXPERIENCE', 'Recent Professional Experience', 'recent professional experience',
        'WORK AND EXPERIENCE', 'Work and Experience', 'work and experience',
        'KEY PROFESSIONAL ASSIGNMENTS', 'Key Professional Assignments', 'key professional assignments',
        'SELECTED PROFESSIONAL EXPERIENCE', 'Selected Professional Experience', 'selected professional experience',
        'VOLUNTEER WORK', 'Volunteer work', 'volunteer work',
        'SHORT-TERM ASSIGNMENTS/CONSULTANCIES', 'Short-term assignments/consultancies', 'short-term assignments/consultancies',
        'MAIN APPOINTMENTS', 'Main Appointments', 'main appointments',
        'PROJECTS', 'Projects', 'projects',
        'CAREER HISTORY AND KEY ACHIEVEMENTS', 'Career History and Key Achievements', 'career history and key achievements',
        'SELECTED PROJECTS AND ASSIGNMENTS', 'Selected projects and assignments', 'selected projects and assignments',
        'RELEVANT WORKEXPERIENCE', 'Relevant WorkExperience', 'relevant workexperience',
        'PREVIOUS RELEVANT EXPERIENCE', 'Previous Relevant Experience', 'previous relevant experience',
        'PROFESSIONAL WORK EXPERIENCE', 'Professional Work Experience', 'professional work experience',
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
        'PROGRAMME MANAGEMENT', 'Programme management', 'programme management',
        'CONTRACT WORK', 'Contract Work', 'contract work',
        'CONSULTING EXPERIENCE', 'Consulting Experience', 'consulting experience',
        'FREELANCE WORK', 'Freelance Work', 'freelance work',
        'INDEPENDENT CONSULTANCY', 'Independent Consultancy', 'independent consultancy',
        'SHORT TERM CONSULTANCIES', 'Short Term Consultancies', 'short term consultancies',
        'PROJECT EXPERIENCE', 'Project Experience', 'project experience',
        'ASSIGNMENT EXPERIENCE', 'Assignment Experience', 'assignment experience',
        'TECHNICAL ASSISTANCE', 'Technical Assistance', 'technical assistance',
        'CAPACITY BUILDING EXPERIENCE', 'Capacity Building Experience', 'capacity building experience',
        'OTHER RELEVANT EXPERIENCE', 'Other relevant experience', 'other relevant experience',
        'PREVIOUS EXPERIENCE', 'Previous Experience', 'previous experience',
        'ADDITIONAL EXPERIENCE', 'Additional Experience', 'additional experience',
        'JOB EXPERIENCE', 'Job Experience', 'job experience',
        'CAREER EXPERIENCE', 'Career Experience', 'career experience',
        'PROFESSIONAL BACKGROUND', 'Professional Background', 'professional background',
        'WORK BACKGROUND', 'Work Background', 'work background',
        'CAREER SUMMARY', 'Career Summary', 'career summary',
        'WORK SUMMARY', 'Work Summary', 'work summary',
        'PROFESSIONAL SUMMARY', 'Professional Summary', 'professional summary',
        'ROLES AND RESPONSIBILITIES', 'Roles and Responsibilities', 'roles and responsibilities',
        'HIGHLIGHTED EXPERIENCE', 'Highlighted experience', 'highlighted experience',
        'KEY EXPERIENCE', 'Key Experience', 'key experience',
        'OCCUPATIONAL EXPERIENCE', 'Occupational Experience', 'occupational experience',
        'RELATED EXPERIENCE', 'Related Experience', 'related experience',
        'EXPERIENCES', 'Experiences', 'experiences',
        'ASSIGNMENTS', 'Assignments', 'assignments'
    ],

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
        'INTRODUCTION', 'Introduction', 'introduction',
        'CAREER SUMMARY', 'Career Summary', 'career summary',
        'PROFESSIONAL SUMMARY', 'Professional Summary', 'professional summary',
        'EXPERTISE SUMMARY', 'Expertise Summary', 'expertise summary',
        'BACKGROUND', 'Background', 'background',
        'PROFESSIONAL BACKGROUND', 'Professional Background', 'professional background',
        'BIO', 'Bio', 'bio',
        'BIOGRAPHY', 'Biography', 'biography',
        'ABOUT', 'About', 'about',
        'OBJECTIVE', 'Objective', 'objective',
        'STATEMENT', 'Statement', 'statement',
        'CAREER OVERVIEW', 'Career Overview', 'career overview',
        'PROFESSIONAL OVERVIEW', 'Professional Overview', 'professional overview'
    ],

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
        'POST-GRADUATE', 'Post-graduate', 'post-graduate',
        'DIPLOMA', 'Diploma', 'diploma',
        'BA', 'Ba', 'ba',
        'ACADEMIC RECORD', 'Academic Record', 'academic record',
        'EDUCATION AND TRAINING', 'Education and Training', 'education and training',
        'FORMAL EDUCATION', 'Formal Education', 'formal education',
        'UNIVERSITY EDUCATION', 'University Education', 'university education',
        'PROFESSIONAL QUALIFICATIONS', 'Professional Qualifications', 'professional qualifications',
        'PROFESSIONAL DEVELOPMENT', 'Professional Development', 'professional development',
        'CONTINUING EDUCATION', 'Continuing Education', 'continuing education',
        'ACADEMIC CREDENTIALS', 'Academic Credentials', 'academic credentials',
        'SCHOLASTIC BACKGROUND', 'Scholastic Background', 'scholastic background',
        'CERTIFICATES', 'Certificates', 'certificates',
        'LICENSES', 'Licenses', 'licenses',
        'PROFESSIONAL CERTIFICATIONS', 'Professional Certifications', 'professional certifications',
        'ACCREDITATIONS', 'Accreditations', 'accreditations',
        'ACADEMIC ACHIEVEMENTS', 'Academic Achievements', 'academic achievements',
        'EDUCATIONAL ATTAINMENT', 'Educational Attainment', 'educational attainment',
        'HIGHER EDUCATION', 'Higher Education', 'higher education',
        'TERTIARY EDUCATION', 'Tertiary Education', 'tertiary education',
        'POSTGRADUATE STUDIES', 'Postgraduate Studies', 'postgraduate studies',
        'UNDERGRADUATE STUDIES', 'Undergraduate Studies', 'undergraduate studies',
        'PROFESSIONAL TRAINING', 'Professional Training', 'professional training',
        'COURSES', 'Courses', 'courses',
        'WORKSHOPS', 'Workshops', 'workshops',
        'SEMINARS', 'Seminars', 'seminars'
    ],

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
        'CONFERENCES/PUBLICATION', 'Conferences/Publication', 'conferences/publication',
        'PUBLISHED WORK', 'Published Work', 'published work',
        'WRITTEN WORK', 'Written Work', 'written work',
        'AUTHORED PUBLICATIONS', 'Authored Publications', 'authored publications',
        'PEER-REVIEWED PUBLICATIONS', 'Peer-reviewed Publications', 'peer-reviewed publications',
        'SCIENTIFIC PUBLICATIONS', 'Scientific Publications', 'scientific publications',
        'TECHNICAL PUBLICATIONS', 'Technical Publications', 'technical publications',
        'REPORTS', 'Reports', 'reports',
        'TECHNICAL REPORTS', 'Technical Reports', 'technical reports',
        'WHITE PAPERS', 'White Papers', 'white papers',
        'POLICY PAPERS', 'Policy Papers', 'policy papers',
        'WORKING PAPERS', 'Working Papers', 'working papers',
        'DISCUSSION PAPERS', 'Discussion Papers', 'discussion papers',
        'CONFERENCE PROCEEDINGS', 'Conference Proceedings', 'conference proceedings',
        'BOOK CHAPTERS', 'Book Chapters', 'book chapters',
        'MONOGRAPHS', 'Monographs', 'monographs',
        'EDITED VOLUMES', 'Edited Volumes', 'edited volumes',
        'RESEARCH OUTPUTS', 'Research Outputs', 'research outputs',
        'ACADEMIC WRITING', 'Academic Writing', 'academic writing',
        'PROFESSIONAL WRITING', 'Professional Writing', 'professional writing',
        'PUBLICATION LIST', 'Publication List', 'publication list',
        'BIBLIOGRAPHY', 'Bibliography', 'bibliography',
        'PUBLISHED RESEARCH', 'Published Research', 'published research',
        'MEDIA PUBLICATIONS', 'Media Publications', 'media publications',
        'PRESS ARTICLES', 'Press Articles', 'press articles',
        'ONLINE PUBLICATIONS', 'Online Publications', 'online publications',
        'BLOG POSTS', 'Blog Posts', 'blog posts',
        'CONTRIBUTIONS', 'Contributions', 'contributions',
        'SELECTED PUBLICATIONS', 'Selected Publications', 'selected publications',
        'KEY PUBLICATIONS', 'Key Publications', 'key publications',
        'RECENT PUBLICATIONS', 'Recent Publications', 'recent publications'
    ],

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

    personal_details: [
        'NATIONALITY', 'Nationality', 'nationality',
        'NATIONALITY & LANGUAGES', 'Nationality & Languages', 'nationality & languages',
        'NATIONALITY AND LANGUAGES', 'Nationality and Languages', 'nationality and languages',
        'PERSONAL DETAILS', 'Personal Details', 'personal details',
        'PERSONAL INFORMATION', 'Personal Information', 'personal information',
        'PERSONAL INFO', 'Personal Info', 'personal info',
        'CONTACT DETAILS', 'Contact Details', 'contact details',
        'CONTACT INFORMATION', 'Contact Information', 'contact information',
        'LANGUAGES', 'Languages', 'languages',
        'LANGUAGE SKILLS', 'Language Skills', 'language skills',
        'LINGUISTIC SKILLS', 'Linguistic Skills', 'linguistic skills',
        'LANGUAGE PROFICIENCY', 'Language Proficiency', 'language proficiency',
        'LANGUAGE COMPETENCIES', 'Language Competencies', 'language competencies',
        'SPOKEN LANGUAGES', 'Spoken Languages', 'spoken languages',
        'LANGUAGE ABILITIES', 'Language Abilities', 'language abilities',
        'LINGUISTIC ABILITIES', 'Linguistic Abilities', 'linguistic abilities',
        'LINGUISTIC COMPETENCE', 'Linguistic Competence', 'linguistic competence',
        'LANGUAGE KNOWLEDGE', 'Language Knowledge', 'language knowledge',
        'FOREIGN LANGUAGES', 'Foreign Languages', 'foreign languages',
        'KNOWN LANGUAGES', 'Known Languages', 'known languages',
        'PERSONAL DATA', 'Personal Data', 'personal data',
        'BIOGRAPHICAL DATA', 'Biographical Data', 'biographical data',
        'BIOGRAPHICAL INFORMATION', 'Biographical Information', 'biographical information',
        'PERSONAL PARTICULARS', 'Personal Particulars', 'personal particulars',
        'BIO DATA', 'Bio Data', 'bio data',
        'BIODATA', 'Biodata', 'biodata',
        'CITIZENSHIP', 'Citizenship', 'citizenship',
        'CITIZEN', 'Citizen', 'citizen',
        'PASSPORT', 'Passport', 'passport',
        'COUNTRY OF ORIGIN', 'Country of Origin', 'country of origin',
        'PLACE OF BIRTH', 'Place of Birth', 'place of birth',
        'RESIDENCE', 'Residence', 'residence',
        'CONTACT', 'Contact', 'contact',
        'GENERAL INFORMATION', 'General Information', 'general information',
        'BASIC INFORMATION', 'Basic Information', 'basic information',
        'CANDIDATE INFORMATION', 'Candidate Information', 'candidate information',
        'APPLICANT INFORMATION', 'Applicant Information', 'applicant information',
        'ABOUT', 'About', 'about'
    ],

    country_experience: [
        'COUNTRY WORK EXPERIENCE', 'Country work experience', 'country work experience',
        'COUNTRY EXPERIENCE', 'Country Experience', 'country experience',
        'INTERNATIONAL EXPERIENCE', 'International Experience', 'international experience',
        'GLOBAL EXPERIENCE', 'Global Experience', 'global experience',
        'OVERSEAS EXPERIENCE', 'Overseas Experience', 'overseas experience',
        'CROSS-CULTURAL EXPERIENCE', 'Cross-Cultural Experience', 'cross-cultural experience',
        'MULTICULTURAL EXPERIENCE', 'Multicultural Experience', 'multicultural experience',
        'REGIONAL EXPERIENCE', 'Regional Experience', 'regional experience',
        'SPECIFIC COUNTRY EXPERIENCE', 'Specific country experience', 'specific country experience',
        'COUNTRIES OF WORK EXPERIENCES', 'Countries of Work Experiences', 'countries of work experiences',
        'GEOGRAPHIC EXPERIENCE', 'Geographic Experience', 'geographic experience',
        'COUNTRIES WORKED IN', 'Countries Worked In', 'countries worked in',
        'WORK LOCATIONS', 'Work Locations', 'work locations',
        'INTERNATIONAL ASSIGNMENTS', 'International Assignments', 'international assignments',
        'COUNTRIES OF OPERATION', 'Countries of Operation', 'countries of operation',
        'FIELD LOCATIONS', 'Field Locations', 'field locations',
        'COUNTRY EXPERTISE', 'Country Expertise', 'country expertise',
        'REGIONAL EXPERTISE', 'Regional Expertise', 'regional expertise',
        'GEOGRAPHICAL COVERAGE', 'Geographical Coverage', 'geographical coverage',
        'COUNTRIES COVERED', 'Countries Covered', 'countries covered',
        'INTERNATIONAL EXPOSURE', 'International Exposure', 'international exposure',
        'REGIONS WORKED', 'Regions Worked', 'regions worked',
        'AREAS OF OPERATION', 'Areas of Operation', 'areas of operation'
    ]
};

// Flattened list of all headers for pattern matching
const ALL_UNIQUE_HEADERS = Object.values(SECTION_DICTIONARIES).flat().filter((v, i, a) => a.indexOf(v) === i);

/**
 * Enhanced section mapping with intelligent content redistribution
 */
function mapSectionToCategory(sectionName) {
    const sectionUpper = sectionName.toUpperCase();

    // Direct mapping first
    for (const [category, terms] of Object.entries(SECTION_DICTIONARIES)) {
        for (const term of terms) {
            if (sectionUpper === term.toUpperCase()) {
                return category;
            }
        }
    }

    // Fuzzy matching with keyword analysis
    for (const [category, terms] of Object.entries(SECTION_DICTIONARIES)) {
        for (const term of terms) {
            const termUpper = term.toUpperCase();
            if (sectionUpper.includes(termUpper) || termUpper.includes(sectionUpper)) {
                return category;
            }
        }
    }

    // Smart content redistribution based on keywords
    const sectionLower = sectionName.toLowerCase();

    // Skills content should be redistributed to profile
    if (sectionLower.includes('skill') || sectionLower.includes('competenc') ||
        sectionLower.includes('expert') || sectionLower.includes('capabilit')) {
        return 'profile'; // Skills go to profile for IOD format
    }

    // Awards/Achievements to profile
    if (sectionLower.includes('award') || sectionLower.includes('achievement') ||
        sectionLower.includes('honor') || sectionLower.includes('recognition')) {
        return 'profile';
    }

    // Certifications to qualifications
    if (sectionLower.includes('certif') || sectionLower.includes('training') ||
        sectionLower.includes('course') || sectionLower.includes('workshop')) {
        return 'qualifications';
    }

    // References/Referees - ignore or add to additional_info
    if (sectionLower.includes('referenc') || sectionLower.includes('referee')) {
        return null; // Will go to additional_info
    }

    return null;
}

/**
 * Collect content after a Cheerio element until the next recognized header
 */
function collectContentAfterElementCheerio($, headerEl) {
    let content = '';
    const currentEl = headerEl.nextAll();

    for (let i = 0; i < currentEl.length; i++) {
        const el = $(currentEl[i]);
        const elText = el.text().trim();

        // Stop if we hit another recognized header
        const isAnotherHeader = ALL_UNIQUE_HEADERS.some(h =>
            elText.toUpperCase().startsWith(h.toUpperCase()) && elText.length < h.length + 10
        );

        if (isAnotherHeader) {
            const isLikelyHeaderItself = ALL_UNIQUE_HEADERS.some(h => {
                const headerRegex = new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:\\s*|\\s*-\\s*)?$`, 'i');
                return headerRegex.test(elText);
            });
            if (isLikelyHeaderItself) break;
        }

        content += el.html() + '\n';
    }

    return cheerio.load(`<div>${content}</div>`).text().trim().replace(/\s*\n\s*/g, '\n');
}

/**
 * Parse CV from HTML structure (primary method)
 */
function parseCvFromHtml(htmlString) {
    const $ = cheerio.load(htmlString);
    const sections = {};

    const headerSelectors = 'h1, h2, h3, h4, h5, h6, strong, b, p';
    $(headerSelectors).each((i, el) => {
        const element = $(el);
        const headerText = element.text().trim();

        if (headerText.length === 0 || headerText.length > 100) return;

        const matchedCategory = mapSectionToCategory(headerText);

        if (matchedCategory) {
            const existingContentLength = (sections[matchedCategory] || "").length;
            const content = collectContentAfterElementCheerio($, element);

            if (content.length > existingContentLength) {
                sections[matchedCategory] = content;
            } else if (!sections[matchedCategory]) {
                sections[matchedCategory] = content;
            }
        }
    });

    if (Object.keys(sections).length < 2) {
        return { __parser_failed: true, rawText: $('body').text() };
    }

    return sections;
}

/**
 * Parse CV using robust text slicing (fallback method)
 */
function parseCvWithRobustTextSlicing(text) {
    const headerPattern = new RegExp(`(${ALL_UNIQUE_HEADERS.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:\\s*\\(.*?\\))?:?`, 'gi');
    const sectionsFound = {};
    const matches = [...text.matchAll(headerPattern)];

    if (matches.length < 2) {
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

        if (content.length > 0) {
            sectionsFound[sectionName] = content;
        }
    }

    return sectionsFound;
}

/**
 * Create a fingerprint of content for deduplication
 */
function createContentFingerprint(content) {
    // Normalize content for comparison
    const normalized = content
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();

    // Create a simple hash/fingerprint
    return normalized.substring(0, 100) + '|' + normalized.length;
}

/**
 * Extract signature from experience entry for deduplication
 */
function extractEntrySignature(entry) {
    // Extract dates and first line for signature
    const datePattern = /\b(\d{4})\s*[-–—]\s*(\d{4}|present|current)/i;
    const dateMatch = entry.match(datePattern);
    const firstLine = entry.split('\n')[0].substring(0, 50);

    return `${dateMatch ? dateMatch[0] : ''}|${firstLine}`;
}

/**
 * Merge experience entries avoiding duplicates
 */
function mergeExperienceEntries(sections) {
    const allEntries = [];
    const seenEntries = new Set();

    for (const section of sections) {
        const entries = splitExperienceWithPatternRecognition(section.content);

        for (const entry of entries) {
            // Create signature from first 100 chars and dates
            const entrySignature = extractEntrySignature(entry);

            if (!seenEntries.has(entrySignature)) {
                seenEntries.add(entrySignature);
                allEntries.push(entry);
            }
        }
    }

    return allEntries.join('\n\n');
}

/**
 * Merge publications avoiding duplicates
 */
function mergePublications(sections) {
    const allPublications = [];
    const seenTitles = new Set();

    for (const section of sections) {
        const lines = section.content.split('\n');

        for (const line of lines) {
            if (line.trim()) {
                // Extract potential title (usually in quotes or after year)
                const titleMatch = line.match(/"([^"]+)"|'([^']+)'|(?:\d{4}\.\s*)([^.]+)/);
                const title = titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3]) : line;
                const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '').trim();

                if (!seenTitles.has(normalizedTitle)) {
                    seenTitles.add(normalizedTitle);
                    allPublications.push(line);
                }
            }
        }
    }

    return allPublications.join('\n');
}

/**
 * Merge qualifications avoiding duplicates
 */
function mergeQualifications(sections) {
    const allQualifications = [];
    const seenQualifications = new Set();

    for (const section of sections) {
        const entries = section.content.split(/\n\n+/);

        for (const entry of entries) {
            if (entry.trim()) {
                // Create signature from degree and institution
                const degreeMatch = entry.match(/\b(phd|doctorate|master|msc|ma|mba|bachelor|bsc|ba|diploma)\b/i);
                const institutionMatch = entry.match(/university|college|institute|school/i);
                const signature = `${degreeMatch ? degreeMatch[0] : ''}|${institutionMatch ? institutionMatch[0] : ''}`;

                if (!seenQualifications.has(signature) || signature === '|') {
                    seenQualifications.add(signature);
                    allQualifications.push(entry);
                }
            }
        }
    }

    return allQualifications.join('\n\n');
}

/**
 * Merge sections preserving unique content
 */
function mergeWithUniqueContent(sections) {
    // Start with the most comprehensive version
    let merged = sections[0].content;
    const mergedLower = merged.toLowerCase();

    // Check other sections for unique content
    for (let i = 1; i < sections.length; i++) {
        const lines = sections[i].content.split('\n');
        const uniqueLines = [];

        for (const line of lines) {
            const lineLower = line.toLowerCase().trim();
            if (lineLower && !mergedLower.includes(lineLower)) {
                uniqueLines.push(line);
            }
        }

        if (uniqueLines.length > 0) {
            merged += '\n\n' + uniqueLines.join('\n');
        }
    }

    return merged;
}

/**
 * Intelligently merge related sections that map to the same category
 */
function mergeRelatedSections(sections, category) {
    // Sort sections by content length (longer = more comprehensive)
    sections.sort((a, b) => b.contentLength - a.contentLength);

    if (category === 'experience' || category === 'employment') {
        // For experience/employment, check for overlapping date ranges
        return mergeExperienceEntries(sections);
    } else if (category === 'publications') {
        // For publications, deduplicate by title
        return mergePublications(sections);
    } else if (category === 'qualifications') {
        // For qualifications, deduplicate by degree/institution
        return mergeQualifications(sections);
    } else {
        // For other categories, take the most comprehensive (longest) version
        // but check for unique content in shorter versions
        return mergeWithUniqueContent(sections);
    }
}

/**
 * Enhanced consolidation with deduplication
 */
function consolidateSections(parsedSectionsResult) {
    const sectionsToConsolidate = parsedSectionsResult.__parser_failed ? {} : parsedSectionsResult;

    const consolidated = {
        profile: '',
        personal_details: '',
        country_experience: '',
        qualifications: '',
        publications: '',
        experience: '',
        skills: '',
        employment: '',
        additional_info: ''
    };

    // Track which content has already been added to prevent duplicates
    const contentFingerprints = new Map();

    // First pass: collect all sections by category with deduplication
    const categorizedSections = {};

    for (const [sectionName, content] of Object.entries(sectionsToConsolidate)) {
        const category = mapSectionToCategory(sectionName);

        if (category) {
            // Create a fingerprint of the content for comparison
            const fingerprint = createContentFingerprint(content);

            // Check if we've already seen this content
            if (contentFingerprints.has(fingerprint)) {
                console.log(`Duplicate content detected in ${sectionName}, skipping...`);
                continue;
            }

            contentFingerprints.set(fingerprint, true);

            // Store content by category
            if (!categorizedSections[category]) {
                categorizedSections[category] = [];
            }
            categorizedSections[category].push({
                sectionName,
                content,
                contentLength: content.length
            });
        } else {
            // Unmapped sections go to additional_info
            consolidated.additional_info = consolidated.additional_info ?
                `${consolidated.additional_info}\n\n--- ${sectionName} ---\n${content}` :
                `--- ${sectionName} ---\n${content}`;
        }
    }

    // Second pass: intelligent merging of categorized content
    for (const [category, sections] of Object.entries(categorizedSections)) {
        if (sections.length === 1) {
            // Single section, use it directly
            consolidated[category] = sections[0].content;
        } else {
            // Multiple sections mapped to same category - merge intelligently
            consolidated[category] = mergeRelatedSections(sections, category);
        }
    }

    // Third pass: redistribute additional_info content
    redistributeAdditionalInfo(consolidated);

    // Fourth pass: extract countries from all content if country_experience is empty
    if (!consolidated.country_experience) {
        const allContent = Object.values(consolidated).join(' ');
        consolidated.country_experience = extractCountriesFromAllContent(allContent);
    }

    // Fifth pass: merge skills into profile
    if (consolidated.skills) {
        consolidated.profile = consolidated.profile ?
            `${consolidated.profile}\n\nKey Skills and Expertise:\n${consolidated.skills}` :
            `Key Skills and Expertise:\n${consolidated.skills}`;
        consolidated.skills = ''; // Clear skills as it's been merged
    }

    return consolidated;
}

/**
 * Enhanced content extraction from additional_info
 */
function redistributeAdditionalInfo(consolidatedSections) {
    if (!consolidatedSections.additional_info) return;

    const additionalContent = consolidatedSections.additional_info;
    const lines = additionalContent.split('\n');

    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this is a section header
        if (trimmedLine.startsWith('---') && trimmedLine.endsWith('---')) {
            // Process previous section
            if (currentSection && currentContent.length > 0) {
                processUnmappedSection(currentSection, currentContent.join('\n'), consolidatedSections);
            }

            // Start new section
            currentSection = trimmedLine.replace(/---/g, '').trim();
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    // Process last section
    if (currentSection && currentContent.length > 0) {
        processUnmappedSection(currentSection, currentContent.join('\n'), consolidatedSections);
    }

    // Clear additional_info after redistribution
    consolidatedSections.additional_info = '';
}

/**
 * Process unmapped sections and distribute content intelligently
 */
function processUnmappedSection(sectionName, content, consolidatedSections) {
    const sectionLower = sectionName.toLowerCase();
    const contentLower = content.toLowerCase();

    // Analyze content for publication patterns
    if (contentLower.includes('journal') || contentLower.includes('conference') ||
        contentLower.includes('paper') || contentLower.includes('isbn') ||
        contentLower.includes('doi') || contentLower.includes('published')) {
        consolidatedSections.publications = consolidatedSections.publications ?
            `${consolidatedSections.publications}\n\n${content}` : content;
        return;
    }

    // Country/location mentions go to country_experience
    const countryPattern = /\b(?:afghanistan|albania|algeria|angola|argentina|armenia|australia|austria|azerbaijan|bahrain|bangladesh|belarus|belgium|benin|bolivia|bosnia|botswana|brazil|bulgaria|burkina faso|burundi|cambodia|cameroon|canada|central african|chad|chile|china|colombia|congo|costa rica|croatia|cuba|cyprus|czech|denmark|djibouti|dominican|ecuador|egypt|el salvador|eritrea|estonia|ethiopia|fiji|finland|france|gabon|gambia|georgia|germany|ghana|greece|guatemala|guinea|guyana|haiti|honduras|hungary|iceland|india|indonesia|iran|iraq|ireland|israel|italy|jamaica|japan|jordan|kazakhstan|kenya|kosovo|kuwait|kyrgyzstan|laos|latvia|lebanon|lesotho|liberia|libya|lithuania|luxembourg|macedonia|madagascar|malawi|malaysia|mali|malta|mauritania|mauritius|mexico|moldova|mongolia|montenegro|morocco|mozambique|myanmar|namibia|nepal|netherlands|new zealand|nicaragua|niger|nigeria|norway|oman|pakistan|palestine|panama|papua|paraguay|peru|philippines|poland|portugal|qatar|romania|russia|rwanda|saudi arabia|senegal|serbia|sierra leone|singapore|slovakia|slovenia|somalia|south africa|south korea|south sudan|spain|sri lanka|sudan|sweden|switzerland|syria|taiwan|tajikistan|tanzania|thailand|timor|togo|tunisia|turkey|uganda|ukraine|united arab emirates|united kingdom|united states|uruguay|uzbekistan|venezuela|vietnam|yemen|zambia|zimbabwe)\b/gi;

    const countryMatches = content.match(countryPattern);
    if (countryMatches && countryMatches.length > 2) {
        const uniqueCountries = [...new Set(countryMatches.map(c => c.charAt(0).toUpperCase() + c.slice(1)))];
        const countryList = uniqueCountries.join(', ');
        consolidatedSections.country_experience = consolidatedSections.country_experience ?
            `${consolidatedSections.country_experience}, ${countryList}` : countryList;
        return;
    }

    // Check for work-related keywords
    if (sectionLower.includes('project') || sectionLower.includes('assignment') ||
        sectionLower.includes('consultancy') || sectionLower.includes('contract')) {
        // Determine if it's employment or experience based on content
        if (contentLower.includes('permanent') || contentLower.includes('full-time') ||
            contentLower.includes('employee')) {
            consolidatedSections.employment = consolidatedSections.employment ?
                `${consolidatedSections.employment}\n\n${content}` : content;
        } else {
            consolidatedSections.experience = consolidatedSections.experience ?
                `${consolidatedSections.experience}\n\n${content}` : content;
        }
        return;
    }

    // Professional memberships/affiliations to qualifications
    if (sectionLower.includes('membership') || sectionLower.includes('affiliation') ||
        sectionLower.includes('association') || sectionLower.includes('society')) {
        consolidatedSections.qualifications = consolidatedSections.qualifications ?
            `${consolidatedSections.qualifications}\n\nProfessional Memberships:\n${content}` :
            `Professional Memberships:\n${content}`;
        return;
    }

    // Otherwise, analyze content and make intelligent decision
    if (content.length > 200) {
        // Longer content likely belongs to profile or experience
        if (contentLower.includes('i am') || contentLower.includes('my ') ||
            contentLower.includes('years of experience')) {
            consolidatedSections.profile = consolidatedSections.profile ?
                `${consolidatedSections.profile}\n\n${content}` : content;
        } else {
            consolidatedSections.experience = consolidatedSections.experience ?
                `${consolidatedSections.experience}\n\n${content}` : content;
        }
    }
}

/**
 * Extract countries from all content
 */
function extractCountriesFromAllContent(text) {
    const countries = new Set();

    const countryKeywords = ['visited', 'worked in', 'experience in', 'based in', 'located in',
        'assignment in', 'project in', 'mission to', 'deployed to', 'countries:',
        'country experience:', 'regions:', 'location:', 'posted in'];

    countryKeywords.forEach(keyword => {
        const regex = new RegExp(`${keyword}\\s*([A-Za-z\\s,;/&()\\-]+)`, 'gi');
        const matches = text.matchAll(regex);
        for (const match of matches) {
            const countryList = match[1].split(/[,;/]/).map(c => c.trim()).filter(c => c.length > 0);
            countryList.forEach(c => countries.add(c));
        }
    });

    return Array.from(countries);
}

/**
 * Split experience section using multiple pattern recognition strategies
 */
function splitExperienceWithPatternRecognition(experienceText) {
    if (!experienceText || experienceText.trim().length === 0) {
        return [];
    }

    let bestSplits = [];
    let maxCount = 0;

    // Strategy 0: Dense format with role titles (like Brooks Joanna CV)
    // Look for specific role patterns that start entries in dense CVs
    const denseRolePatterns = [
        // Team Leader patterns
        /(?:^|\n)\s*Team Leader\s*[-–—]/gmi,
        // International roles
        /(?:^|\n)\s*International\s+(?:Expert|Consultant|M&E|Chief|Legal Expert|Project Evaluation Expert)\s*[-–—:,]/gmi,
        // Deputy/Senior roles
        /(?:^|\n)\s*(?:Deputy Team Leader|Senior\s+\w+)\s*[-–—:,]/gmi,
        // Consultant patterns
        /(?:^|\n)\s*Consultant\s+(?:for|to)\s+/gmi,
        // Independent roles
        /(?:^|\n)\s*Independent\s+(?:Consultant|Evaluation)\s*[-–—:,]/gmi,
        // Expert roles
        /(?:^|\n)\s*(?:Business|Governance|Justice|Evaluation|Policy|Programme|Project|Legal|Human Rights)\s*(?:&\s*\w+\s*)?Expert\s*[-–,:\s]/gmi,
        // Advisor/Manager roles
        /(?:^|\n)\s*(?:Policy|Programme|Project|Legal|Human Rights|Judicial)\s+(?:Advisor|Manager|Coordinator|Analyst)\s*[-–,:]/gmi,
        // Other specific roles
        /(?:^|\n)\s*(?:Facilitator|Quality Controller|Researcher|Pupil Barrister|Judge's Clerk)\s*[-–:,]/gmi,
        // Roles without dashes
        /(?:^|\n)\s*(?:Drafting|Expert on|Responsible for)/gmi
    ];

    // Try dense role patterns first
    for (const pattern of denseRolePatterns) {
        const matches = [...experienceText.matchAll(pattern)];
        if (matches.length > 0) {
            // For dense format, we need to split more carefully
            // Each entry typically goes until the next role pattern
            const allRolePattern = /(?:^|\n)\s*(?:Team Leader|International\s+(?:Expert|Consultant|M&E|Chief|Legal Expert|Project Evaluation Expert)|Deputy Team Leader|Senior\s+(?:\w+|Non-Key Expert)|Consultant\s+(?:for|to)|Independent\s+(?:Consultant|Evaluation|Team Leader)|(?:Business|Governance|Justice|Evaluation|Policy|Programme|Project|Legal|Human Rights|M&E)(?:\s*&\s*\w+)?(?:\s+Expert)?|(?:Policy|Programme|Project|Legal|Human Rights|Judicial|Judicial Training)\s+(?:Advisor|Manager|Coordinator|Analyst|and Research Advisor)|Facilitator|Quality Controller|Researcher|Pupil Barrister|Judge's Clerk|Drafting|Expert on|Responsible for)\s*[-–:,]?/gmi;

            const roleMatches = [...experienceText.matchAll(allRolePattern)];
            if (roleMatches.length > 1) {
                const splits = [];

                for (let i = 0; i < roleMatches.length; i++) {
                    const start = roleMatches[i].index;
                    const end = i < roleMatches.length - 1 ? roleMatches[i + 1].index : experienceText.length;
                    const entry = experienceText.substring(start, end).trim();

                    // Only include entries with reasonable content
                    if (entry.length > 50 && entry.split(',').length >= 2) {
                        splits.push(entry);
                    }
                }

                if (splits.length > maxCount) {
                    maxCount = splits.length;
                    bestSplits = splits;
                }
            }
        }
    }

    // Strategy 1: Bullet points and list markers
    if (maxCount < 2) {
        const bulletPatterns = [
            /(?:^|\n)\s*[•·▪▫◦‣⁃]\s*/gm,
            /(?:^|\n)\s*[-–—]\s+(?=[A-Z])/gm,
            /(?:^|\n)\s*\*\s+/gm,
            /(?:^|\n)\s*\d+\.\s+/gm,
        ];

        for (const pattern of bulletPatterns) {
            const matches = [...experienceText.matchAll(pattern)];
            if (matches.length > 1) {
                const splitPattern = new RegExp(`(?=${pattern.source})`, 'gm');
                const splits = experienceText.split(splitPattern)
                    .map(entry => entry.trim())
                    .filter(entry => entry.length > 40);

                if (splits.length > maxCount) {
                    maxCount = splits.length;
                    bestSplits = splits;
                }
            }
        }
    }

    // Strategy 2: Date-based splitting
    if (maxCount < 2) {
        const datePatterns = [
            /(?:^|\n)\s*\d{4}\s*[-–—]\s*(?:\d{4}|present|current)/gmi,
            /(?:^|\n)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|present|current)/gmi,
            /\(\d{4}(?:\s*[-–—]\s*(?:\d{4}|present))?\)/gm,
            /(?:^|\n)\s*(?:\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–—]\s*(?:\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|present|current)\s*[:\-]/gmi
        ];

        for (const pattern of datePatterns) {
            const matches = [...experienceText.matchAll(pattern)];
            if (matches.length > 1) {
                if (pattern.source.includes('\\(\\d{4}')) {
                    // Special handling for parenthetical years
                    const yearMatches = [...experienceText.matchAll(pattern)];
                    const splits = [];

                    for (let i = 0; i < yearMatches.length; i++) {
                        const match = yearMatches[i];
                        const start = i === 0 ? 0 : yearMatches[i - 1].index + yearMatches[i - 1][0].length;
                        const end = match.index + match[0].length;
                        const entry = experienceText.substring(start, end).trim();
                        if (entry.length > 60) {
                            splits.push(entry);
                        }
                    }

                    if (splits.length > maxCount) {
                        maxCount = splits.length;
                        bestSplits = splits;
                    }
                } else {
                    const splitPattern = new RegExp(`(?=${pattern.source})`, 'gmi');
                    const splits = experienceText.split(splitPattern)
                        .map(entry => entry.trim())
                        .filter(entry => entry.length > 60);

                    if (splits.length > maxCount) {
                        maxCount = splits.length;
                        bestSplits = splits;
                    }
                }
            }
        }
    }

    // Strategy 3: Job role patterns (general)
    if (maxCount < 2) {
        const rolePatterns = [
            /(?:^|\n)\s*(?:Senior\s+|Junior\s+|Lead\s+|Principal\s+|Chief\s+|Head\s+of\s+|Director\s+of\s+|Manager\s+of\s+)?(?:Consultant|Manager|Director|Coordinator|Specialist|Advisor|Analyst|Officer|Executive|Developer|Engineer|Designer|Researcher|Assistant|Associate)/gmi,
            /(?:^|\n)\s*(?:Position|Role|Title|Job\s+Title)\s*:\s*/gmi,
            /(?:^|\n)\s*(?:Company|Organization|Employer|Client)\s*:\s*/gmi,
        ];

        for (const pattern of rolePatterns) {
            const matches = [...experienceText.matchAll(pattern)];
            if (matches.length > 1) {
                const splitPattern = new RegExp(`(?=${pattern.source})`, 'gmi');
                const splits = experienceText.split(splitPattern)
                    .map(entry => entry.trim())
                    .filter(entry => entry.length > 60);

                if (splits.length > maxCount) {
                    maxCount = splits.length;
                    bestSplits = splits;
                }
            }
        }
    }

    // Strategy 4: Paragraph breaks
    if (maxCount < 2) {
        const paragraphSplits = experienceText
            .split(/\n\s*\n\s*/)
            .map(entry => entry.trim())
            .filter(entry => entry.length > 80);

        if (paragraphSplits.length > maxCount) {
            maxCount = paragraphSplits.length;
            bestSplits = paragraphSplits;
        }
    }

    // Strategy 5: Smart line detection
    if (maxCount < 2) {
        const lines = experienceText.split('\n');
        const entries = [];
        let currentEntry = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) continue;

            const isNewEntry = (
                /^\d{4}[-–—]/.test(trimmedLine) ||
                /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/.test(trimmedLine) ||
                /^(?:Senior|Junior|Lead|Principal|Chief|Head\s+of|Director|Manager|Consultant|Coordinator|Specialist|Advisor|Analyst|Officer|Executive|Developer|Engineer|Designer|Researcher|Assistant|Associate)\s+/i.test(trimmedLine) ||
                /^(?:Position|Role|Title|Company|Organization|Employer|Client|Project|Assignment)\s*:/i.test(trimmedLine) ||
                (/^[A-Z]/.test(trimmedLine) && trimmedLine.length > 30 && !trimmedLine.endsWith(','))
            );

            if (isNewEntry && currentEntry.length > 80) {
                entries.push(currentEntry.trim());
                currentEntry = trimmedLine;
            } else {
                currentEntry += (currentEntry ? '\n' : '') + trimmedLine;
            }
        }

        if (currentEntry.trim().length > 80) {
            entries.push(currentEntry.trim());
        }

        if (entries.length > maxCount) {
            maxCount = entries.length;
            bestSplits = entries;
        }
    }

    // Strategy 6: Semicolon splitting
    if (maxCount < 2) {
        const semicolonSplits = experienceText
            .split(/;\s*(?=\n|[A-Z])/)
            .map(entry => entry.trim().replace(/;$/, ''))
            .filter(entry => entry.length > 60);

        if (semicolonSplits.length > maxCount) {
            maxCount = semicolonSplits.length;
            bestSplits = semicolonSplits;
        }
    }

    // Fallback: return entire text as single entry
    if (bestSplits.length === 0 && experienceText.trim().length > 100) {
        bestSplits = [experienceText.trim()];
    }

    return bestSplits;
}

/**
 * Split employment record into individual entries
 */
function splitEmploymentRecord(employmentText) {
    if (!employmentText || employmentText.trim().length === 0) {
        return [];
    }

    const employmentPatterns = [
        /(?:^|\n)\s*From[–-]?To:\s*/gmi,
        /(?:^|\n)\s*(?:From[–-]To:\s*)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[–-]\s*(?:present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/gmi,
        /(?:^|\n)\s*Employer:\s*/gmi,
        /(?:^|\n)\s*Contracting\s+Agency:\s*/gmi
    ];

    let bestSplits = [];
    let maxCount = 0;

    for (const pattern of employmentPatterns) {
        const matches = [...employmentText.matchAll(pattern)];
        if (matches.length > 1) {
            const splitPattern = new RegExp(`(?=${pattern.source})`, 'gmi');
            const splits = employmentText.split(splitPattern)
                .map(entry => entry.trim())
                .filter(entry => entry.length > 100);

            if (splits.length > maxCount) {
                maxCount = splits.length;
                bestSplits = splits;
            }
        }
    }

    // Fallback: paragraph breaks
    if (maxCount < 2) {
        const paragraphSplits = employmentText
            .split(/\n\s*\n\s*\n/)
            .map(entry => entry.trim())
            .filter(entry => entry.length > 150);

        if (paragraphSplits.length > maxCount) {
            maxCount = paragraphSplits.length;
            bestSplits = paragraphSplits;
        }
    }

    // Final fallback: return whole text as one entry
    if (bestSplits.length === 0 && employmentText.trim().length > 100) {
        bestSplits = [employmentText.trim()];
    }

    return bestSplits;
}

/**
 * Main CV processing function
 */
async function processCv(filePath, progressCallback = null, originalFilename = null) {
    try {
        if (progressCallback) progressCallback(5, 'Starting CV processing...');

        const fileExt = originalFilename ?
            path.extname(originalFilename).toLowerCase() :
            path.extname(filePath).toLowerCase();

        let parsedSectionsOutput;
        let rawTextForAiFallback;

        // Extract content based on file type
        if (['.docx', '.doc'].includes(fileExt)) {
            try {
                const htmlContent = await extractHtmlFromDocx(filePath);
                parsedSectionsOutput = parseCvFromHtml(htmlContent);
                rawTextForAiFallback = cheerio.load(htmlContent).text();
            } catch (htmlError) {
                rawTextForAiFallback = await extractTextFromDocx(filePath);
                parsedSectionsOutput = parseCvWithRobustTextSlicing(rawTextForAiFallback);
            }
        } else if (fileExt === '.pdf') {
            rawTextForAiFallback = await extractTextFromPdf(filePath);
            parsedSectionsOutput = parseCvWithRobustTextSlicing(rawTextForAiFallback);
        } else {
            throw new Error(`Unsupported file format: ${fileExt}. Supported: .docx, .doc, .pdf`);
        }

        if (progressCallback) progressCallback(15, 'Initial parsing complete...');

        // Consolidate sections or fall back to AI segmentation
        let consolidatedSections;
        if (parsedSectionsOutput.__parser_failed) {
            if (progressCallback) progressCallback(20, 'Using AI segmentation...');
            consolidatedSections = await segmentCvWithAi(rawTextForAiFallback);
        } else {
            consolidatedSections = consolidateSections(parsedSectionsOutput);
        }

        if (progressCallback) progressCallback(25, 'Sections consolidated...');

        // Split experience and employment into individual entries
        const experienceEntries = splitExperienceWithPatternRecognition(consolidatedSections.experience);
        const employmentEntries = splitEmploymentRecord(consolidatedSections.employment);

        if (progressCallback) progressCallback(30, 'Experience and employment entries split...');

        // Extract country data if missing
        if (!consolidatedSections.country_experience && consolidatedSections.profile) {
            consolidatedSections.country_experience = await extractCountriesFromText(consolidatedSections.profile);
        }

        // Extract structured data using AI
        const structuredData = await extractStructuredDataFromSegments(
            consolidatedSections,
            experienceEntries,
            progressCallback,
            employmentEntries
        );

        if (progressCallback) progressCallback(90, 'Enhancing nationality and language extraction...');

        // Enhanced nationality extraction - use pattern-based extraction as fallback/supplement
        if (!structuredData.nationality || structuredData.nationality === 'Unknown' || structuredData.nationality === 'Not specified') {
            const extractedNationality = extractNationalityFromCV(rawTextForAiFallback, consolidatedSections);
            if (extractedNationality) {
                structuredData.nationality = extractedNationality;
                structuredData.personalDetails.nationality = extractedNationality;
            }
        }

        // Enhanced language extraction - use pattern-based extraction as fallback/supplement
        if (!structuredData.languages || structuredData.languages.length === 0 ||
            (structuredData.languages.length === 1 && structuredData.languages[0].language === 'Information not available')) {
            const extractedLanguages = extractLanguagesFromCV(rawTextForAiFallback, consolidatedSections);
            if (extractedLanguages && extractedLanguages.length > 0) {
                structuredData.languages = extractedLanguages;
                structuredData.personalDetails.languages = extractedLanguages;
            }
        }

        // Enhanced profile extraction - use pattern-based extraction as fallback/supplement
        if (!structuredData.profile || structuredData.profile === 'AI extraction temporarily unavailable. Please check server configuration.' ||
            structuredData.profile.length < 100) {
            const extractedProfile = extractProfileFromCV(rawTextForAiFallback, consolidatedSections);
            if (extractedProfile && extractedProfile.length > 100) {
                structuredData.profile = extractedProfile;
            }
        }

        if (progressCallback) progressCallback(100, 'Processing complete!');

        return structuredData;

    } catch (error) {
        if (progressCallback) progressCallback(100, `Error: ${error.message}`);
        throw error;
    }
}

/**
 * Enhanced extraction of nationality from entire CV text
 */
function extractNationalityFromCV(fullText, segments) {
    // First try to find nationality in personal details section
    if (segments.personal_details) {
        const nationalityPatterns = [
            /nationality\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi,
            /citizen(?:ship)?\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi,
            /passport\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi,
            /national\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi,
            /country\s+of\s+origin\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi
        ];

        for (const pattern of nationalityPatterns) {
            const matches = segments.personal_details.matchAll(pattern);
            for (const match of matches) {
                const nationality = match[1].trim();
                if (nationality && nationality.length > 2 && nationality.length < 50) {
                    return nationality;
                }
            }
        }
    }

    // Try to find nationality in full text
    const fullTextPatterns = [
        /(?:^|\n)\s*nationality\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi,
        /(?:^|\n)\s*citizen(?:ship)?\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi,
        /I\s+am\s+(?:a|an)\s+([A-Za-z]+)\s+(?:citizen|national)/gi,
        /(?:^|\n)\s*([A-Za-z\s\-]+?)\s+(?:citizen|national|nationality)(?:\n|;|,|\||$)/gi
    ];

    for (const pattern of fullTextPatterns) {
        const matches = fullText.matchAll(pattern);
        for (const match of matches) {
            const nationality = match[1].trim();
            if (nationality && nationality.length > 2 && nationality.length < 50) {
                // Filter out false positives
                const lowerNat = nationality.toLowerCase();
                if (!lowerNat.includes('dual') && !lowerNat.includes('multiple') &&
                    !lowerNat.includes('any') && !lowerNat.includes('various')) {
                    return nationality;
                }
            }
        }
    }

    return null;
}

/**
 * Enhanced extraction of languages from entire CV text
 */
function extractLanguagesFromCV(fullText, segments) {
    const languages = [];
    const seenLanguages = new Set();

    // Common language names (expanded and more comprehensive)
    const commonLanguages = [
        'English', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 'Russian',
        'Chinese', 'Mandarin', 'Cantonese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
        'Bengali', 'Urdu', 'Turkish', 'Polish', 'Dutch', 'Swedish', 'Norwegian',
        'Danish', 'Finnish', 'Greek', 'Hebrew', 'Thai', 'Vietnamese', 'Indonesian',
        'Malay', 'Tagalog', 'Swahili', 'Yoruba', 'Zulu', 'Amharic', 'Hausa',
        'Luganda', 'Luo', 'Kikuyu', 'Kinyarwanda', 'Kirundi', 'Somali', 'Oromo',
        'Tigrinya', 'Wolof', 'Fulani', 'Igbo', 'Akan', 'Ewe', 'Fon', 'Bambara',
        'Czech', 'Slovak', 'Hungarian', 'Romanian', 'Bulgarian', 'Croatian',
        'Serbian', 'Bosnian', 'Slovenian', 'Albanian', 'Lithuanian', 'Latvian',
        'Estonian', 'Ukrainian', 'Belarusian', 'Macedonian', 'Farsi', 'Persian',
        'Pashto', 'Dari', 'Kurdish', 'Azerbaijani', 'Georgian', 'Armenian',
        'Kazakh', 'Uzbek', 'Kyrgyz', 'Tajik', 'Turkmen', 'Mongolian'
    ];

    // Create case-insensitive language set for faster lookup
    const languageSet = new Set(commonLanguages.map(lang => lang.toLowerCase()));

    // Proficiency keywords
    const proficiencyKeywords = {
        'native': ['native', 'mother tongue', 'first language', 'L1', 'maternal'],
        'fluent': ['fluent', 'excellent', 'advanced', 'C2', 'C1', 'proficient', 'expert'],
        'intermediate': ['intermediate', 'good', 'working knowledge', 'B2', 'B1', 'conversational', 'competent'],
        'basic': ['basic', 'elementary', 'beginner', 'A2', 'A1', 'limited', 'beginner level']
    };

    // More precise language patterns - only look for explicit language sections
    const languagePatterns = [
        // Pattern: "Languages: English, French, Spanish"
        /(?:languages?|linguistic\s+skills?|language\s+skills?|spoken\s+languages?)\s*[:=]\s*([^\n.;]+)/gi,
        // Pattern: "Fluent in: English and French"
        /(?:fluent\s+in|proficient\s+in|speaks?)\s*[:=]?\s*([^\n.;]+)/gi,
        // Pattern: "Native language: English"
        /(?:native\s+language|mother\s+tongue|first\s+language)\s*[:=]\s*([^\n.;]+)/gi,
        // Pattern in structured lists: "• English (Fluent)"
        /[•\-*]\s*([A-Za-z]+)\s*\(([^)]+)\)/g,
        // Pattern: "Language proficiency: English - Advanced"
        /language\s+proficiency\s*[:=]\s*([^\n.;]+)/gi
    ];

    // Search for language patterns
    for (const pattern of languagePatterns) {
        const matches = [...fullText.matchAll(pattern)];
        for (const match of matches) {
            let languageText = match[1];
            if (!languageText) continue;

            // Clean the language text
            languageText = languageText.trim().replace(/[.,;:]+$/, '');

            // Handle structured format like "English (Fluent), French (Basic)"
            if (languageText.includes('(') && languageText.includes(')')) {
                const structuredMatches = [...languageText.matchAll(/([A-Za-z]+)\s*\(([^)]+)\)/g)];
                for (const structMatch of structuredMatches) {
                    const lang = structMatch[1].trim();
                    const prof = structMatch[2].trim();

                    if (languageSet.has(lang.toLowerCase()) && !seenLanguages.has(lang.toLowerCase())) {
                        seenLanguages.add(lang.toLowerCase());
                        languages.push({
                            language: lang,
                            proficiency: mapProficiency(prof, proficiencyKeywords)
                        });
                    }
                }
            } else {
                // Handle comma-separated lists: "English, French, Spanish"
                const languageEntries = languageText.split(/[,;&|]/);

                for (const entry of languageEntries) {
                    let cleaned = entry.trim();
                    if (cleaned.length < 2) continue;

                    // Remove common non-language words that might appear
                    if (/^(and|or|also|including|with|plus|level|skills?|languages?|proficiency)$/i.test(cleaned)) {
                        continue;
                    }

                    // Extract language name (first word, capitalize properly)
                    const words = cleaned.split(/\s+/);
                    const potentialLang = words[0];

                    // Only accept if it's in our language list
                    if (languageSet.has(potentialLang.toLowerCase()) && !seenLanguages.has(potentialLang.toLowerCase())) {
                        seenLanguages.add(potentialLang.toLowerCase());

                        // Extract proficiency from remaining words
                        const proficiencyText = words.slice(1).join(' ');
                        const proficiency = mapProficiency(proficiencyText, proficiencyKeywords);

                        languages.push({
                            language: potentialLang.charAt(0).toUpperCase() + potentialLang.slice(1).toLowerCase(),
                            proficiency: proficiency
                        });
                    }
                }
            }
        }
    }

    // Additional pattern for bullet-pointed languages in text
    const bulletPattern = /(?:^|\n)\s*[•\-*]\s*([A-Za-z]+)(?:\s*[-:]\s*([A-Za-z\s]+))?/gm;
    const bulletMatches = [...fullText.matchAll(bulletPattern)];

    for (const match of bulletMatches) {
        const lang = match[1];
        const prof = match[2] || '';

        if (languageSet.has(lang.toLowerCase()) && !seenLanguages.has(lang.toLowerCase())) {
            seenLanguages.add(lang.toLowerCase());
            languages.push({
                language: lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase(),
                proficiency: mapProficiency(prof, proficiencyKeywords)
            });
        }
    }

    return languages.length > 0 ? languages : [{ language: 'Not specified', proficiency: 'Not specified' }];
}

/**
 * Helper function to map proficiency text to standard levels
 */
function mapProficiency(proficiencyText, proficiencyKeywords) {
    if (!proficiencyText) return 'Not specified';

    const lowerText = proficiencyText.toLowerCase();

    for (const [level, keywords] of Object.entries(proficiencyKeywords)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                return level.charAt(0).toUpperCase() + level.slice(1);
            }
        }
    }

    return 'Not specified';
}

/**
 * Enhanced extraction of profile from CV text
 */
function extractProfileFromCV(fullText, segments) {
    // First try to use the already parsed profile section
    if (segments.profile && segments.profile.trim().length > 50) {
        return segments.profile.trim();
    }

    // Look for profile in other sections that might contain it
    const profileSources = [
        segments.profile,
        segments.skills,
        segments.summary,
        segments.overview,
        segments.expertise
    ].filter(section => section && section.trim().length > 50);

    if (profileSources.length > 0) {
        // Combine relevant sections that form the profile
        return profileSources.join('\n\n').trim();
    }

    // Pattern-based extraction from full text
    const profilePatterns = [
        // Look for explicit profile sections
        /(?:professional\s+)?(?:profile|summary|overview)\s*[:=]?\s*\n([^]+?)(?=\n\s*(?:EDUCATION|EXPERIENCE|QUALIFICATIONS|EMPLOYMENT|NATIONALITY|LANGUAGES|COUNTRY|$))/gi,
        // Areas of expertise pattern
        /areas?\s+of\s+expertise\s*[:=]?\s*([^]+?)(?=\n\s*(?:EDUCATION|EXPERIENCE|QUALIFICATIONS|EMPLOYMENT|NATIONALITY|LANGUAGES|COUNTRY|Over\s+\d+\s+years|$))/gi,
        // Executive summary pattern
        /executive\s+summary\s*[:=]?\s*\n([^]+?)(?=\n\s*(?:EDUCATION|EXPERIENCE|QUALIFICATIONS|EMPLOYMENT|NATIONALITY|LANGUAGES|COUNTRY|$))/gi,
        // About me pattern
        /about\s+(?:me|myself)\s*[:=]?\s*\n([^]+?)(?=\n\s*(?:EDUCATION|EXPERIENCE|QUALIFICATIONS|EMPLOYMENT|NATIONALITY|LANGUAGES|COUNTRY|$))/gi
    ];

    for (const pattern of profilePatterns) {
        const matches = [...fullText.matchAll(pattern)];
        for (const match of matches) {
            const profileText = match[1].trim();
            if (profileText && profileText.length > 100) {
                return profileText;
            }
        }
    }

    // Look for profile-like content at the beginning of the CV
    const lines = fullText.split('\n');
    let profileContent = [];
    let foundName = false;
    let inProfile = false;

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i].trim();

        // Skip empty lines at start
        if (!line && profileContent.length === 0) continue;

        // Skip obvious headers and contact info
        if (/^(NAME|EMAIL|PHONE|ADDRESS|CONTACT)/i.test(line)) {
            foundName = true;
            continue;
        }

        // Look for profile indicators
        if (/^(areas?\s+of\s+expertise|professional\s+background|career\s+summary|professional\s+summary)/i.test(line)) {
            inProfile = true;
            continue;
        }

        // Stop at major section headers
        if (/^(EDUCATION|PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EMPLOYMENT|QUALIFICATIONS|PUBLICATIONS)/i.test(line)) {
            break;
        }

        // Collect profile content
        if ((foundName || inProfile) && line.length > 30) {
            profileContent.push(line);
        }

        // Stop after collecting substantial content
        if (profileContent.join(' ').length > 500) {
            break;
        }
    }

    if (profileContent.length > 0) {
        return profileContent.join('\n').trim();
    }

    return null;
}

module.exports = { processCv, splitExperienceWithPatternRecognition }; 