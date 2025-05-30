/**
 * Generates a prompt for the LLM to identify and segment CV sections without combining them
 * @param {string} cvText - The raw CV text to analyze
 * @returns {string} - The prompt for the LLM
 */
function getCvSegmentationPrompt(cvText) {
    return `You are an expert document layout analyst. Your task is to analyze the following CV text and identify all of its distinct, top-level sections.

CRITICAL INSTRUCTIONS:
1. Return a single JSON object
2. Each key MUST be the EXACT section title as found in the document
3. Each value MUST be the COMPLETE, VERBATIM text content of that section
4. DO NOT modify, summarize, or rephrase ANY content
5. DO NOT combine or merge sections
6. DO NOT add any commentary or explanation
7. DO NOT create new section names - use ONLY what exists in the document

Example of expected output format:
{
    "Profile": "Full profile text exactly as written...",
    "Highlighted experience (selected)": "Complete text of this section...",
    "Employment": "Complete employment section text...",
    "Publications": "All publications text..."
}

CV Text to analyze:
"""
${cvText}
"""

Return ONLY the JSON object with the sections you find.`;
}

module.exports = { getCvSegmentationPrompt }; 