// services/llmService.js
const axios = require('axios');
const {
    getProfilePrompt,
    getPersonalDetailsPrompt,
    getCountryExperiencePrompt,
    getQualificationsPrompt,
    getPublicationsPrompt,
    getExperiencePrompt
} = require('../prompts/extractPrompts');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Load from environment
const MODEL_NAME = 'anthropic/claude-3.5-sonnet';

async function callLlm(prompt, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: MODEL_NAME,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 4000
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
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

async function extractStructuredDataFromSegments(segments, progressCallback = null) {
    console.log('Calling AI for detailed content extraction...');

    if (progressCallback) progressCallback(10, 'Extracting profile information...');

    try {
        const [
            profileData,
            personalData,
            countryData,
            qualificationsData,
            publicationsData,
            experienceData
        ] = await Promise.all([
            callLlm(getProfilePrompt(segments.profile)),
            callLlm(getPersonalDetailsPrompt(segments.personal_details)),
            callLlm(getCountryExperiencePrompt(segments.country_experience)),
            callLlm(getQualificationsPrompt(segments.qualifications)),
            callLlm(getPublicationsPrompt(segments.publications)),
            callLlm(getExperiencePrompt(segments.experience))
        ]);

        if (progressCallback) progressCallback(90, 'AI extraction completed successfully!');

        return {
            profile: profileData.profile || '',
            nationality: personalData.nationality || '',
            languages: personalData.languages || [],
            countryWorkExperience: countryData.countries || [],
            qualifications: qualificationsData.qualifications || [],
            publications: publicationsData.publications || [],
            experience: experienceData.experience || [],
        };
    } catch (error) {
        console.error('Error in extractStructuredDataFromSegments:', error);

        // Return fallback structure
        return {
            profile: 'Profile extraction failed - check OpenRouter API configuration',
            nationality: 'Unknown',
            languages: [{ language: 'Extraction failed', proficiency: 'Unknown' }],
            countryWorkExperience: ['Extraction failed'],
            qualifications: [{
                year: 'Unknown',
                degree: 'Extraction failed',
                institution: 'Check logs',
                details: error.message
            }],
            publications: [{ citation: 'Publication extraction failed - check server logs' }],
            experience: [{
                dates: 'Unknown',
                role: 'Extraction failed',
                client: 'Check server logs',
                location: 'Unknown',
                description: `Error during AI extraction: ${error.message}`
            }],
        };
    }
}

module.exports = { extractStructuredDataFromSegments }; 