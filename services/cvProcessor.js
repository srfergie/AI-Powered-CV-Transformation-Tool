// services/cvProcessor.js
const mammoth = require('mammoth');
const { extractStructuredDataFromSegments } = require('./llmService');

async function extractTextFromDocx(filePath) {
    try {
        const { value } = await mammoth.extractRawText({ path: filePath });
        return value;
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from the uploaded document');
    }
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
    let currentSectionName = "Header"; // Start with a default for text before the first header
    let currentSectionContent = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            if (currentSectionName) {
                sections[currentSectionName] = currentSectionContent.join('\n');
            }
            currentSectionName = match[1].trim().replace(':', ''); // Clean up the header name
            currentSectionContent = [];
        } else if (currentSectionName) {
            currentSectionContent.push(line);
        }
    }

    // Don't forget the last section
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

    // Combine experience sections
    const experienceText = [
        heuristicSections['Experience'],
        heuristicSections['Employment']
    ].filter(Boolean).join('\n\n');

    const consolidated = {
        profile: heuristicSections['Profile'] || '',
        personal_details: heuristicSections['Nationality'] || '',
        country_experience: heuristicSections['Country work experience'] || '',
        qualifications: heuristicSections['Qualifications'] || '',
        publications: heuristicSections['Publications'] || '',
        experience: experienceText,
    };

    console.log('Consolidation complete. Final sections:');
    Object.entries(consolidated).forEach(([key, value]) => {
        console.log(`- ${key}: ${value.length} characters`);
    });

    return consolidated;
}

async function processCv(filePath, progressCallback = null) {
    try {
        if (progressCallback) progressCallback(5, 'Extracting text from document...');

        const rawText = await extractTextFromDocx(filePath);
        console.log(`Raw text extracted. Length: ${rawText.length} characters`);

        if (progressCallback) progressCallback(15, 'Parsing document structure...');

        const heuristicSections = parseCvWithHeuristics(rawText);

        if (progressCallback) progressCallback(25, 'Consolidating sections...');

        const finalSegments = consolidateSections(heuristicSections);

        console.log('Consolidation complete. Final experience section length:', finalSegments.experience.length, 'chars');

        if (progressCallback) progressCallback(30, 'Starting AI extraction...');

        const structuredData = await extractStructuredDataFromSegments(finalSegments, progressCallback);

        console.log('CV processing completed successfully');
        console.log('Final structured data preview:');
        console.log(`- Profile: ${structuredData.profile?.substring(0, 100)}...`);
        console.log(`- Experience entries: ${structuredData.experience?.length}`);
        console.log(`- Publications: ${structuredData.publications?.length}`);
        console.log(`- Qualifications: ${structuredData.qualifications?.length}`);

        return structuredData;
    } catch (error) {
        console.error('Error in processCv:', error);
        throw error;
    }
}

module.exports = { processCv }; 