// services/llmService.js (FINAL REFINED VERSION)
const axios = require('axios');
const {
    getProfilePrompt,
    getPersonalDetailsPrompt,
    getCountryExperiencePrompt,
    getQualificationsPrompt,
    getPublicationsPrompt,
    getExperiencePrompt // We will adapt this for individual entries
} = require('../prompts/extractPrompts');

// Load API key dynamically to ensure it gets the latest value
const getApiKey = () => process.env.OPENROUTER_API_KEY;
const MODEL_NAME = 'anthropic/claude-3.5-sonnet';

async function callLlm(prompt, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const apiKey = getApiKey(); // Get fresh API key on each call

            if (!apiKey) {
                throw new Error('OpenRouter API key not found in environment variables');
            }

            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: MODEL_NAME,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 4000
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5000',
                    'X-Title': 'BD Assistant CV Transformer'
                }
            });

            const content = response.data.choices[0].message.content.trim();

            // Try to extract JSON from the content
            let jsonString = content;
            const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1].trim();
            }

            // Additional cleanup
            jsonString = jsonString.replace(/^[^{]*/, ''); // Remove any text before the first {
            jsonString = jsonString.replace(/}[^}]*$/, '}'); // Remove any text after the last }

            return JSON.parse(jsonString);
        } catch (error) {
            console.error(`LLM API Call Error (attempt ${attempt}/${retries}):`, error.response ? error.response.data : error.message);

            if (attempt === retries) {
                throw new Error('Failed to get a valid JSON response from the LLM.');
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Function to create prompt for individual experience entry
function getSingleExperiencePrompt(entryText) {
    return `From the text for a single job entry below, extract the dates, role, client, location, and the full verbatim description.

Respond with ONLY a JSON object in this exact format:
{
    "dates": "extracted date range",
    "role": "job title/role",
    "client": "company or client name",
    "location": "work location",
    "description": "full job description and responsibilities"
}

Text: """${entryText}"""`;
}

// The function now accepts the pre-split experienceEntries array.
async function extractStructuredDataFromSegments(segments, experienceEntries, progressCallback = null) {
    console.log('Calling AI for detailed content extraction on each pre-split entry...');
    console.log('API Key status:', getApiKey() ? `Available (${getApiKey().length} chars)` : 'NOT FOUND');

    if (progressCallback) progressCallback(40, 'Processing profile information...');

    try {
        // --- NEW: Process each experience entry individually in parallel ---
        const experiencePromises = experienceEntries.map((entryText, index) => {
            console.log(`Creating AI call for experience entry ${index + 1}/${experienceEntries.length}`);
            // The prompt now only has to parse ONE entry, which is a much easier task.
            return callLlm(getSingleExperiencePrompt(entryText));
        });

        if (progressCallback) progressCallback(50, 'Processing experience entries individually...');

        // Process other sections as before.
        const [
            profileData,
            personalData,
            countryData,
            qualificationsData,
            publicationsData,
            experienceResults // This will be an array of results from the promises above
        ] = await Promise.all([
            callLlm(getProfilePrompt(segments.profile)),
            callLlm(getPersonalDetailsPrompt(segments.personal_details)),
            callLlm(getCountryExperiencePrompt(segments.country_experience)),
            callLlm(getQualificationsPrompt(segments.qualifications)),
            callLlm(getPublicationsPrompt(segments.publications)),
            Promise.all(experiencePromises) // We wait for all the individual experience calls to complete
        ]);

        if (progressCallback) progressCallback(85, 'Consolidating extracted data...');

        // The result from the LLM for a single entry might be just the object, 
        // not wrapped in an "experience" array, so we just collect them.
        const finalExperienceData = experienceResults.filter(res => res && res.dates); // Filter out any failed extractions

        console.log(`Successfully processed ${finalExperienceData.length}/${experienceEntries.length} experience entries`);

        return {
            profile: profileData.profile || '',
            nationality: personalData.nationality || '',
            languages: personalData.languages || [],
            countryWorkExperience: countryData.countries || [],
            qualifications: qualificationsData.qualifications || [],
            publications: publicationsData.publications || [],
            experience: finalExperienceData, // Assign the fully populated array
        };
    } catch (error) {
        console.error('Error in extractStructuredDataFromSegments:', error);

        // Enhanced fallback structure with better placeholder data
        return {
            profile: 'AI extraction temporarily unavailable. Please check server configuration.',
            nationality: 'Unknown',
            languages: [{ language: 'Information not available', proficiency: 'Unknown' }],
            countryWorkExperience: ['Information not available'],
            qualifications: [{
                year: 'Unknown',
                degree: 'Information temporarily unavailable',
                institution: 'Please try again',
                details: 'AI service temporarily unavailable'
            }],
            publications: [{ citation: 'Publications information temporarily unavailable' }],
            experience: [{
                dates: 'Unknown',
                role: 'Information temporarily unavailable',
                client: 'Please try again',
                location: 'Unknown',
                description: 'AI extraction service temporarily unavailable. Please ensure API configuration is correct.'
            }],
        };
    }
}

module.exports = { extractStructuredDataFromSegments }; 