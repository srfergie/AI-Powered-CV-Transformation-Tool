// services/cvProcessor.js (FINAL ADAPTIVE ENGINE - REFINED AND INTEGRATED)

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
 * Comprehensive section dictionaries for CV parsing
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
        'CURRENT EMPLOYMENT', 'Current Employment', 'current employment'
    ],

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
        'EXPERIENCES', 'Experiences', 'experiences',
        'ASSIGNMENTS', 'Assignments', 'assignments',
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
        'PROGRAMME MANAGEMENT', 'Programme management', 'programme management'
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
        'INTRODUCTION', 'Introduction', 'introduction'
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
        'BA', 'Ba', 'ba'
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
        'CONFERENCES/PUBLICATION', 'Conferences/Publication', 'conferences/publication'
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
        'PERSONAL DETAILS', 'Personal Details', 'personal details',
        'PERSONAL INFORMATION', 'Personal Information', 'personal information',
        'CONTACT DETAILS', 'Contact Details', 'contact details',
        'CONTACT INFORMATION', 'Contact Information', 'contact information',
        'LANGUAGES', 'Languages', 'languages',
        'LANGUAGE SKILLS', 'Language Skills', 'language skills',
        'LINGUISTIC SKILLS', 'Linguistic Skills', 'linguistic skills'
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
        'COUNTRIES OF WORK EXPERIENCES', 'Countries of Work Experiences', 'countries of work experiences'
    ]
};

// Flattened list of all headers for pattern matching
const ALL_UNIQUE_HEADERS = Object.values(SECTION_DICTIONARIES).flat().filter((v, i, a) => a.indexOf(v) === i);

/**
 * Map section names to standardized categories using comprehensive dictionaries
 */
function mapSectionToCategory(sectionName) {
    const sectionUpper = sectionName.toUpperCase();

    // Exact match first (highest precision)
    for (const [category, terms] of Object.entries(SECTION_DICTIONARIES)) {
        for (const term of terms) {
            if (sectionUpper === term.toUpperCase()) {
                return category;
            }
        }
    }

    // Partial match (broader matching)
    for (const [category, terms] of Object.entries(SECTION_DICTIONARIES)) {
        for (const term of terms) {
            const termUpper = term.toUpperCase();
            if (sectionUpper.includes(termUpper) || termUpper.includes(sectionUpper)) {
                return category;
            }
        }
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
 * Consolidate parsed sections into standardized categories
 */
function consolidateSections(parsedSectionsResult) {
    const sectionsToConsolidate = parsedSectionsResult.__parser_failed ? {} : parsedSectionsResult;

    const consolidated = {
        profile: '', personal_details: '', country_experience: '', qualifications: '',
        publications: '', experience: '', skills: '', employment: '', additional_info: ''
    };

    for (const [sectionName, content] of Object.entries(sectionsToConsolidate)) {
        const category = mapSectionToCategory(sectionName);
        if (category) {
            consolidated[category] = consolidated[category] ? `${consolidated[category]}\n\n${content}` : content;
        } else {
            consolidated.additional_info = consolidated.additional_info ?
                `${consolidated.additional_info}\n\n--- ${sectionName} ---\n${content}` :
                `--- ${sectionName} ---\n${content}`;
        }
    }

    return consolidated;
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

    // Strategy 1: Bullet points and list markers
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

    // Strategy 3: Job role patterns
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

        return structuredData;

    } catch (error) {
        if (progressCallback) progressCallback(100, `Error: ${error.message}`);
        throw error;
    }
}

module.exports = { processCv }; 