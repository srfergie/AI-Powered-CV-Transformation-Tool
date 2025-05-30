/**
 * Generates a prompt for extracting structured data from consolidated CV sections
 * @param {Object} sections - The consolidated CV sections
 * @returns {string} - The prompt for the LLM
 */
function getStructuredDataExtractionPrompt(sections) {
    return `You are an expert CV data extractor. Your task is to analyze the pre-segmented CV sections and extract structured data in a specific format.

CRITICAL INSTRUCTIONS:
1. Extract ALL information - do not summarize or omit any details
2. For work experience, include EVERY role with complete descriptions
3. Preserve ALL bullet points and technical terms exactly as written
4. Include ALL publications with full citations
5. Return data in the following JSON structure:

{
    "personalInfo": {
        "name": "string",
        "title": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "nationality": "string",
        "languages": [{"language": "string", "proficiency": "string"}]
    },
    "summary": "string (800+ characters, preserve all technical terms)",
    "workExperience": [{
        "title": "string",
        "company": "string",
        "location": "string",
        "startDate": "string",
        "endDate": "string",
        "description": "string (500+ characters per role)",
        "achievements": ["string"],
        "technologies": ["string"]
    }],
    "education": [{
        "degree": "string",
        "institution": "string",
        "location": "string",
        "graduationDate": "string",
        "description": "string"
    }],
    "publications": [{
        "title": "string",
        "authors": ["string"],
        "journal": "string",
        "year": "string",
        "abstract": "string"
    }],
    "countryExperience": ["string"],
    "skills": {
        "technical": ["string"],
        "soft": ["string"]
    }
}

CV Sections to analyze:
"""
${JSON.stringify(sections, null, 2)}
"""

Return ONLY the JSON object with the extracted data.`;
}

module.exports = { getStructuredDataExtractionPrompt }; 