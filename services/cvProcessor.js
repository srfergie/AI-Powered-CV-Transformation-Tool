// services/cvProcessor.js
const mammoth = require('mammoth');
const { extractStructuredDataFromSegments } = require('./llmService');

async function extractTextFromDocx(filePath) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    console.log(`Raw text extracted. Length: ${value.length} characters`);
    return value;
}

function parseCvWithHeuristics(text) {
    console.log("Parsing CV with deterministic, rule-based heuristics...");

    const headers = [
        "Profile", "Nationality", "Qualifications", "Country work experience",
        "Experience:", "Employment:", "Publications:"
    ];

    const regex = new RegExp(`^(${headers.join('|')})`, 'im');
    const sections = {};
    const lines = text.split('\n');
    let currentSectionName = "Header";
    let currentSectionContent = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            if (currentSectionName) {
                sections[currentSectionName] = currentSectionContent.join('\n');
            }
            currentSectionName = match[1].trim().replace(':', '');
            currentSectionContent = [];
        } else if (currentSectionName) {
            currentSectionContent.push(line);
        }
    }

    if (currentSectionName) {
        sections[currentSectionName] = currentSectionContent.join('\n');
    }

    console.log("Heuristic parsing complete. Identified sections:", Object.keys(sections));
    console.log("Section lengths:", Object.fromEntries(
        Object.entries(sections).map(([key, value]) => [key, value.length])
    ));

    return sections;
}

function consolidateSections(heuristicSections) {
    console.log("Consolidating sections for AI processing...");

    const experienceText = [
        heuristicSections['Experience'],
        heuristicSections['Employment']
    ].filter(Boolean).join('\n\n');

    const consolidatedSections = {
        profile: heuristicSections['Profile'] || '',
        personal_details: heuristicSections['Nationality'] || '',
        country_experience: heuristicSections['Country work experience'] || '',
        qualifications: heuristicSections['Qualifications'] || '',
        publications: heuristicSections['Publications'] || '',
        experience: experienceText,
    };

    console.log("Consolidation complete. Final sections:");
    Object.entries(consolidatedSections).forEach(([key, value]) => {
        if (key !== 'experience') {
            console.log(`- ${key}: ${value.length} characters`);
        }
    });
    console.log(`Consolidation complete. Final experience section length: ${consolidatedSections.experience.length} chars`);

    return consolidatedSections;
}

async function processCv(filePath, progressCallback = null) {
    if (progressCallback) progressCallback(5, 'Extracting text from document...');

    const rawText = await extractTextFromDocx(filePath);

    if (progressCallback) progressCallback(15, 'Parsing document structure...');

    const heuristicSections = parseCvWithHeuristics(rawText);
    const finalSegments = consolidateSections(heuristicSections);

    // --- NEW LOGIC: Pre-split the experience block ---
    // Each experience entry in the source CV starts with a year (e.g., "2024", "2022 – 2023").
    // We use a regular expression to split the block by these date markers.
    if (progressCallback) progressCallback(25, 'Pre-splitting experience entries...');

    const experienceEntries = finalSegments.experience
        .split(/\n(?=\d{4})/) // Split on any newline that is followed by a 4-digit year.
        .filter(entry => entry.trim() !== "") // Remove any empty entries.
        .map(entry => entry.trim()); // Clean up whitespace

    console.log(`Pre-split the consolidated experience block into ${experienceEntries.length} individual entries.`);

    if (experienceEntries.length > 0) {
        console.log("Sample entries:");
        experienceEntries.slice(0, 2).forEach((entry, index) => {
            console.log(`Entry ${index + 1} (${entry.length} chars): ${entry.substring(0, 100)}...`);
        });
    }

    if (progressCallback) progressCallback(30, 'Sending data to AI for extraction...');

    // Pass the segments AND the pre-split experience entries to the next stage.
    const structuredData = await extractStructuredDataFromSegments(finalSegments, experienceEntries, progressCallback);

    console.log('CV processing completed successfully');
    console.log('Final structured data preview:');
    console.log(`- Profile: ${structuredData.profile ? structuredData.profile.substring(0, 50) + '...' : 'Not extracted'}`);
    console.log(`- Experience entries: ${structuredData.experience ? structuredData.experience.length : 0}`);
    console.log(`- Publications: ${structuredData.publications ? structuredData.publications.length : 0}`);
    console.log(`- Qualifications: ${structuredData.qualifications ? structuredData.qualifications.length : 0}`);

    return structuredData;
}

module.exports = { processCv }; 