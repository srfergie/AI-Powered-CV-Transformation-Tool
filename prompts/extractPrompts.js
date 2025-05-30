// prompts/extractPrompts.js

function getProfilePrompt(textChunk) {
  return `From the CV profile section below, extract the complete professional profile/summary. This may include:
- Areas of expertise
- Years of experience
- Key skills and competencies
- Professional background
- Personal attributes
- Country experience summary

IMPORTANT: 
- Extract ALL content that forms the professional profile
- Preserve the original structure and formatting
- Include ALL expertise areas, skills, and experience summaries
- If the profile is in multiple paragraphs, include all of them

Respond with ONLY a valid JSON object in this exact format:
{
  "profile": "Complete profile text here preserving all content and structure"
}

Make sure to:
- Properly escape any quotes in the text using \\"
- Remove any trailing commas
- Ensure valid JSON syntax

Profile Text:
"""${textChunk}"""`;
}

function getPersonalDetailsPrompt(textChunk) {
  return `From the CV text below, extract the person's full name, nationality, and languages with proficiency levels.

IMPORTANT: 
- For NAME: Look in headers, contact info, or the beginning of the CV
- For NATIONALITY: Look for terms like "Nationality:", "Citizenship:", "Citizen of", "National of", "Passport:", or mentions of being a citizen/national of a country
- For LANGUAGES: Look for "Languages:", "Language skills:", "Fluent in", "Proficient in", "Native speaker", "Mother tongue", or any mentions of language abilities

If information is scattered, collect from wherever you find it in the text.

JSON FORMATTING RULES:
- Use double quotes for all strings
- Properly escape quotes within text using \\"
- Ensure no trailing commas
- Keep valid JSON syntax

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
  return `From the text below, extract a list of all country names mentioned.

JSON FORMATTING RULES:
- Use double quotes for all strings
- Ensure no trailing commas
- Return empty array if no countries found

Respond with ONLY a valid JSON object:
{
  "countries": ["Country1", "Country2", "Country3"]
}

Text: """${textChunk}"""`;
}

function getQualificationsPrompt(textChunk) {
  return `Extract all educational qualifications from the text below. For each qualification, capture:
- year: The year obtained (or "Not specified" if not found)
- degree: The degree/qualification name
- institution: The institution name
- details: Any additional details (thesis, specialization, etc.)

JSON FORMATTING RULES:
- Use double quotes for all strings
- Properly escape quotes within text using \\"
- Replace line breaks with \\n
- Ensure no trailing commas

Respond with ONLY a valid JSON object:
{
  "qualifications": [
    {
      "year": "2020",
      "degree": "PhD in Computer Science",
      "institution": "University Name",
      "details": "Thesis title or other details"
    }
  ]
}

If no qualifications found, return empty array.

Text: """${textChunk}"""`;
}

function getPublicationsPrompt(textChunk) {
  return `Extract all publications from the text below. Capture the COMPLETE citation for each publication.

JSON FORMATTING RULES:
- Use double quotes for all strings
- Properly escape quotes within citations using \\"
- Replace line breaks with \\n
- Ensure no trailing commas
- Keep each citation as a single line in JSON

Respond with ONLY a valid JSON object:
{
  "publications": [
    {"citation": "Complete citation text with properly escaped quotes"},
    {"citation": "Another complete citation"}
  ]
}

If no publications found, return empty array.

Text: """${textChunk}"""`;
}

function getExperiencePrompt(textChunk) {
  return `
      You are an expert data extractor. From the text chunk below, which contains ONLY work and project experience, extract every single entry.
      For EACH entry, you MUST extract: dates, role, client, location, and the complete, verbatim description.
      The source text may sometimes combine the project title and the role/client/location line. Be intelligent in parsing this. For example "2024 - 2025,UNDP Independent Country Programme Evaluation (ICPE) - Somalia ,Role: Principal Consultant | Client: UNDP | Location: Somalia" should be treated as one entry.

      JSON FORMATTING RULES:
      - Use double quotes for all strings
      - Properly escape quotes within text using \\"
      - Replace line breaks in descriptions with \\n
      - Ensure no trailing commas
      - Keep all text on single lines within JSON

      Respond with ONLY a valid JSON object in the format:
      {
        "experience": [
          {
            "dates": "YYYY - YYYY",
            "role": "Job title",
            "client": "Company name",
            "location": "Location",
            "description": "Full description with properly escaped quotes and newlines"
          }
        ]
      }

      If any field is not found, use "Not specified" as the value.

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