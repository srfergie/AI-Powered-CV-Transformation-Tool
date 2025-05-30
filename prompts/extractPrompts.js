// prompts/extractPrompts.js

function getProfilePrompt(textChunk) {
  return `Analyze the following text, which is the 'Profile' section of a CV. Extract the content verbatim. Respond with ONLY a JSON object: {"profile": "..."}. Text: """${textChunk}"""`;
}

function getPersonalDetailsPrompt(textChunk) {
  return `From the CV text below, extract the person's full name, nationality, and languages with proficiency levels.

IMPORTANT: 
- For NAME: Look in headers, contact info, or the beginning of the CV
- For NATIONALITY: Look for terms like "Nationality:", "Citizenship:", "Citizen of", "National of", "Passport:", or mentions of being a citizen/national of a country
- For LANGUAGES: Look for "Languages:", "Language skills:", "Fluent in", "Proficient in", "Native speaker", "Mother tongue", or any mentions of language abilities

If information is scattered, collect from wherever you find it in the text.

Respond with ONLY a JSON object in this exact format:
{
  "name": "Full Name Here",
  "nationality": "Country Name",
  "languages": [
    { "language": "English", "proficiency": "Native/Fluent/Intermediate/Basic" },
    { "language": "French", "proficiency": "Fluent" }
  ]
}

If any field is not found, use "Not specified" for name/nationality and empty array [] for languages.

Text: """${textChunk}"""`;
}

function getCountryExperiencePrompt(textChunk) {
  return `From the text below, extract a list of all country names. Respond with ONLY a JSON object: {"countries": ["...", "...", "..."]}. Text: """${textChunk}"""`;
}

function getQualificationsPrompt(textChunk) {
  return `Extract all educational qualifications from the text below. For each, capture year, degree, institution, and full thesis details. Respond with ONLY a JSON object: {"qualifications": [{"year": "...", "degree": "...", "institution": "...", "details": "..."}]}. Text: """${textChunk}"""`;
}

function getPublicationsPrompt(textChunk) {
  return `Extract all publications from the text below. Capture the full, verbatim citation for each. Respond with ONLY a JSON object: {"publications": [{"citation": "..."}, {"citation": "..."}]}. Text: """${textChunk}"""`;
}

function getExperiencePrompt(textChunk) {
  return `
      You are an expert data extractor. From the text chunk below, which contains ONLY work and project experience, extract every single entry.
      For EACH entry, you MUST extract: dates, role, client, location, and the complete, verbatim description.
      The source text may sometimes combine the project title and the role/client/location line. Be intelligent in parsing this. For example "2024 - 2025,UNDP Independent Country Programme Evaluation (ICPE) - Somalia ,Role: Principal Consultant | Client: UNDP | Location: Somalia" should be treated as one entry.

      Respond with ONLY a JSON object in the format:
      {
        "experience": [
          {
            "dates": "YYYY - YYYY",
            "role": "...",
            "client": "...",
            "location": "...",
            "description": "Full, verbatim description of responsibilities and achievements..."
          }
        ]
      }

      Experience Text Chunk:
      """
      ${textChunk}
      """
    `;
}

module.exports = {
  getProfilePrompt,
  getPersonalDetailsPrompt,
  getCountryExperiencePrompt,
  getQualificationsPrompt,
  getPublicationsPrompt,
  getExperiencePrompt
}; 