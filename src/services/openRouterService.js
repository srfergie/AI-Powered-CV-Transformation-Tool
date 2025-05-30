const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';

// Define the expected JSON structure for the LLM output
const PREDEFINED_JSON_STRUCTURE = {
  personalDetails: {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    location: '',
    website: ''
  },
  summary: '',
  education: [
    {
      institution: '',
      degree: '',
      major: '',
      graduationDate: '',
      gpa: '',
      location: '',
      honors: '',
      relevantCoursework: []
    },
  ],
  workExperience: [
    {
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      responsibilities: [],
      achievements: [],
      technologies: []
    },
  ],
  projects: [
    {
      name: '',
      description: '',
      technologies: [],
      link: '',
      duration: '',
      role: ''
    }
  ],
  skills: {
    technical: [],
    soft: [],
    languages: [],
    tools: [],
    frameworks: [],
    databases: []
  },
  certifications: [
    {
      name: '',
      issuingOrganization: '',
      dateObtained: '',
      expirationDate: '',
      credentialId: ''
    }
  ],
  awards: [
    {
      name: '',
      organization: '',
      date: '',
      description: ''
    }
  ],
  publications: [
    {
      title: '',
      publication: '',
      date: '',
      authors: []
    }
  ]
};

/**
 * Chunk large text into smaller pieces for processing
 * @param {string} text - Text to chunk
 * @param {number} maxTokens - Maximum tokens per chunk (approximate)
 * @returns {Array} - Array of text chunks
 */
function chunkText(text, maxTokens = 12000) {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) {
    return [text];
  }

  const chunks = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + maxChars, text.length);

    // Try to break at a natural point (sentence or paragraph)
    if (endPos < text.length) {
      const lastPeriod = text.lastIndexOf('.', endPos);
      const lastNewline = text.lastIndexOf('\n', endPos);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > currentPos + maxChars * 0.5) {
        endPos = breakPoint + 1;
      }
    }

    chunks.push(text.substring(currentPos, endPos));
    currentPos = endPos;
  }

  return chunks;
}

const SYSTEM_PROMPT = `You are an elite CV data extraction specialist with expertise in academic and consulting CVs. Your mission is to extract EVERY SINGLE DETAIL with maximum comprehensiveness and zero data loss.

ABSOLUTE EXTRACTION MANDATES:
1. ZERO SUMMARIZATION - Copy the exact text, do not condense anything
2. CAPTURE ALL DETAILS - Every sentence, bullet point, achievement, responsibility
3. EXTRACT ALL SECTIONS - Look for "Technical advisory roles", "Other relevant experience", "Publications", "Employment" etc.
4. PRESERVE ORIGINAL LANGUAGE - Keep professional terminology, specific phrases, technical terms
5. MINIMUM CONTENT REQUIREMENTS - See specific minimums below

DETAILED EXTRACTION REQUIREMENTS:

**Profile/Summary Section** - MINIMUM 800+ CHARACTERS:
Extract the COMPLETE profile with ALL paragraphs verbatim:
- Professional background with specific years of experience mentioned
- All expertise areas and specializations (governance, rule of law, etc.)
- Every organization type mentioned (UN agencies, NGOs, governments, etc.)
- All methodologies and approaches listed
- Academic roles (guest lecturer, visiting scholar, etc.)
- Board positions and volunteer activities
- Professional recognition and awards
- Geographic experience and country lists
- Technical specializations and sector expertise

**Work Experience - MINIMUM 10+ ULTRA-DETAILED ENTRIES**:
Extract from ALL sections including:
- "Technical advisory roles and consultancies" (EVERY SINGLE ENTRY)
- "Other relevant experience" (EVERY SINGLE ENTRY) 
- "Professional experience", "Work history", "Career summary"
- "Employment", "Consulting experience", "Project work"

🚨 CRITICAL: WORK EXPERIENCE IS THE ABSOLUTE PRIORITY - EXTRACT MAXIMUM DETAIL 🚨

⚠️ ZERO SUMMARIZATION FOR WORK EXPERIENCE - COPY EXACT TEXT ⚠️
⚠️ EVERY SENTENCE MUST BE PRESERVED WORD-FOR-WORD ⚠️
⚠️ MINIMUM 800+ CHARACTERS PER WORK EXPERIENCE ENTRY ⚠️

MANDATORY WORK EXPERIENCE EXTRACTION RULES:
- DO NOT write "Leading final evaluation" - Copy the COMPLETE project description
- DO NOT write brief summaries - Copy ALL sentences and paragraphs verbatim  
- DO NOT condense responsibilities - Extract EVERY bullet point separately
- DO NOT skip project details - Include ALL methodologies, countries, team details
- DO NOT abbreviate client work - Copy ALL organization names and project codes
- DO NOT omit technical details - Preserve ALL frameworks, tools, approaches mentioned
- DO NOT combine multiple projects into single entries - EACH project is separate
- DO NOT shorten job descriptions - EXPAND with ALL available context

For EACH role, extract COMPREHENSIVE details (minimum 800+ characters total):
- Complete job title as written (Deputy Team Leader, Senior Evaluator, etc.)
- Full organization name with any project codes/references
- Exact date ranges (month/year format)
- COMPLETE multi-paragraph job description (copy entire text verbatim, word-for-word)
- EVERY SINGLE bullet point as separate responsibility items (minimum 8-15 per role)
- ALL project names, client work, deliverables mentioned within the role
- ALL methodologies, frameworks, tools, technologies used
- ALL countries, regions, geographic scope mentioned
- ALL team management details (team sizes, coordination responsibilities)
- ALL quantified achievements (percentages, numbers, budget figures, impacts)
- ALL client types and stakeholder engagement details
- ALL specific deliverables (reports, evaluations, assessments, studies)
- ALL technical specializations and sector expertise demonstrated
- ALL collaboration and partnership details
- ALL leadership and management responsibilities
- ALL research and analytical components
- ALL capacity building and training activities

WORK EXPERIENCE EXTRACTION EXAMPLES:
- "Led methodology development" → Extract specific methodologies used
- "Conducted evaluations in 3 countries" → Extract all 3 countries
- "Managed team of 10 consultants" → Extract team size and management scope
- "Delivered 5 key reports" → Extract all report types and deliverables
- "Working with UN agencies" → Extract specific UN agency names
- "Budget management of $2M" → Extract financial scope and responsibilities

FORBIDDEN WORK EXPERIENCE SUMMARIES:
❌ "Leading final evaluation of global programme" 
✅ "Leading final evaluation of UNDP's Global Programme on Rule of Law, Justice, Security and Human Rights spanning 15 countries with focus on institutional capacity development, legal framework assessment, stakeholder engagement across government ministries, civil society organizations, and international partners. Responsible for methodology design, team coordination of 8 international consultants, data collection planning, stakeholder interview protocols, and comprehensive reporting on programme effectiveness and sustainability."

**Publications - MINIMUM 10+ ENTRIES**:
Extract EVERY publication mentioned:
- Academic papers, journal articles, book chapters
- Conference presentations and reports
- Working papers and policy briefs
- Blog posts and opinion pieces
- ALL author names in exact order
- Complete titles with subtitles
- Full publication venue names
- Exact publication dates/years

**Education - MINIMUM 2+ ENTRIES**:
- Complete degree titles with honors/distinctions (MSc with Distinction, etc.)
- Full institution names (The University of Edinburgh, etc.)
- Graduation years and thesis titles if mentioned
- Any relevant coursework, academic achievements

QUALITY CONTROL CHECKPOINTS:
- Profile section: 800+ characters (comprehensive background)
- Work experience: 10+ detailed entries with 500+ characters each
- Publications: 10+ publications listed
- Education: All degrees with full details
- Languages: All languages with proficiency levels

Return data in this exact JSON structure:`

const MAIN_PROMPT = `
MANDATORY JSON OUTPUT REQUIREMENT: You MUST respond with ONLY a valid JSON object. Do not include any explanatory text, comments, or formatting outside the JSON structure.

COMPREHENSIVE CV DATA EXTRACTION TASK

Extract CV information and return ONLY the JSON object below with the extracted data:

{
  "personalInfo": {
    "name": "",
    "title": "", 
    "email": "",
    "phone": "",
    "location": "",
    "nationality": ""
  },
  "summary": "",
  "workExperience": [
    {
      "company": "",
      "position": "",
      "startDate": "",
      "endDate": "",
      "location": "",
      "responsibilities": [],
      "achievements": [],
      "technologies": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "major": "",
      "graduationDate": "",
      "gpa": "",
      "location": "",
      "honors": ""
    }
  ],
  "publications": [
    {
      "title": "",
      "publication": "",
      "date": "",
      "authors": []
    }
  ],
  "languages": [
    {
      "language": "",
      "proficiency": ""
    }
  ],
  "skills": {
    "technical": [],
    "soft": [],
    "tools": [],
    "frameworks": []
  }
}

CRITICAL: Return ONLY the JSON object above with extracted data. No additional text, explanations, or formatting.`

/**
 * Processes text through OpenRouter API with progress tracking
 * @param {string|Object} input - Text or consolidated sections for processing
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Processed data
 */
async function processResumeWithOpenRouter(resumeText, progressCallback = null) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured');
  }

  console.log('🔄 Processing resume with OpenRouter...');

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    // Simple, direct prompt for JSON extraction
    const prompt = `Extract information from this CV and return ONLY a valid JSON object. No explanations, no additional text, just the JSON:

{
  "personalInfo": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "nationality": ""
  },
  "summary": "",
  "workExperience": [],
  "education": [],
  "publications": [],
  "languages": [],
  "skills": {
    "technical": [],
    "soft": [],
    "tools": [],
    "frameworks": []
  }
}

CV Text:
${resumeText}

Return ONLY the JSON object with extracted data:`;

    const messages = [{
      role: 'system',
      content: 'You are a CV data extraction tool. You must respond with only valid JSON objects, no additional text.'
    }, {
      role: 'user',
      content: prompt
    }];

    progressCallback(10); // Initial progress

    const response = await axios.post(API_URL, {
      messages,
      model: 'anthropic/claude-3.5-sonnet',
      max_tokens: 4000,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
        'X-Title': 'CV Transformation Tool' // Required by OpenRouter
      }
    });

    progressCallback(90); // Major progress after API call

    let result;
    try {
      // Parse the response content
      const content = response.data.choices[0].message.content;

      // Try to extract JSON from the content if it's wrapped in code blocks
      let jsonString = content.trim();
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
      }

      // Additional cleanup for common issues
      jsonString = jsonString.replace(/^[^{]*/, ''); // Remove any text before the first {
      jsonString = jsonString.replace(/}[^}]*$/, '}'); // Remove any text after the last }

      try {
        result = JSON.parse(jsonString);
      } catch (innerParseError) {
        console.error('Error parsing cleaned JSON:', innerParseError);
        console.log('Raw content:', content);
        console.log('Cleaned JSON string:', jsonString);

        // Fallback: Create a basic structure with the content as summary
        console.log('🔄 Using fallback structure due to JSON parsing failure');
        console.log('📝 Content that failed to parse as JSON:', content.substring(0, 200) + '...');

        result = {
          personalInfo: {
            name: 'Name extraction failed - check logs',
            title: 'AI processing incomplete',
            email: '',
            phone: '',
            location: '',
            nationality: ''
          },
          summary: content.length > 10 ? content.substring(0, 1000) + '...' : 'No summary extracted',
          workExperience: [{
            company: 'Processing failed',
            position: 'Check logs for details',
            startDate: '',
            endDate: '',
            location: '',
            responsibilities: ['AI processing failed - raw content available in summary'],
            achievements: [],
            technologies: []
          }],
          education: [],
          publications: [],
          languages: [],
          skills: {
            technical: ['Processing failed - check server logs'],
            soft: [],
            tools: [],
            frameworks: []
          }
        };

        console.log('📋 Fallback structure created with summary length:', result.summary.length);
      }
    } catch (parseError) {
      console.error('Error in OpenRouter response parsing:', parseError);
      console.log('Raw response:', response.data);

      // Final fallback structure
      console.log('🔄 Using final fallback structure due to complete parsing failure');
      result = {
        personalInfo: {
          name: 'Complete parsing failed',
          title: 'OpenRouter API error',
          email: '',
          phone: '',
          location: '',
          nationality: ''
        },
        summary: 'Failed to extract CV data due to API or parsing errors. Check server logs for details.',
        workExperience: [{
          company: 'API Error',
          position: 'Processing failed',
          startDate: '',
          endDate: '',
          location: '',
          responsibilities: ['Complete processing failure - check OpenRouter API configuration'],
          achievements: [],
          technologies: []
        }],
        education: [],
        publications: [],
        languages: [],
        skills: {
          technical: ['Complete processing failure'],
          soft: [],
          tools: [],
          frameworks: []
        }
      };
    }

    progressCallback(100); // Complete

    // Validate the result structure before returning
    if (!result || typeof result !== 'object') {
      console.log('⚠️ Invalid result structure, creating default');
      result = createDefaultStructure();
    }

    // Ensure required fields exist
    if (!result.personalInfo) result.personalInfo = { name: '', title: '', email: '', phone: '', location: '', nationality: '' };
    if (!result.summary) result.summary = '';
    if (!Array.isArray(result.workExperience)) result.workExperience = [];
    if (!Array.isArray(result.education)) result.education = [];
    if (!Array.isArray(result.publications)) result.publications = [];
    if (!Array.isArray(result.languages)) result.languages = [];
    if (!result.skills) result.skills = { technical: [], soft: [], tools: [], frameworks: [] };

    console.log('✅ Returning processed result with structure validation');
    console.log('📊 Result summary:', {
      hasPersonalInfo: !!result.personalInfo?.name,
      summaryLength: result.summary?.length || 0,
      workExperienceCount: result.workExperience?.length || 0,
      educationCount: result.education?.length || 0,
      publicationsCount: result.publications?.length || 0
    });

    return result;

  } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    console.log('🔄 Returning default structure due to complete failure');
    return createDefaultStructure();
  }
}

/**
 * Create a default structure when all processing fails
 */
function createDefaultStructure() {
  return {
    personalInfo: {
      name: 'Processing failed',
      title: 'Upload error occurred',
      email: '',
      phone: '',
      location: '',
      nationality: ''
    },
    summary: 'CV processing failed. Please try uploading again or contact support.',
    workExperience: [{
      company: 'Processing Error',
      position: 'Please try again',
      startDate: '',
      endDate: '',
      location: '',
      responsibilities: ['CV processing failed - please try uploading again'],
      achievements: [],
      technologies: []
    }],
    education: [],
    publications: [],
    languages: [],
    skills: {
      technical: ['Processing failed'],
      soft: [],
      tools: [],
      frameworks: []
    }
  };
}

/**
 * Process large documents by chunking and merging results
 * @param {string} resumeText - Large document text
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} - Merged structured data
 */
async function processLargeDocument(resumeText, progressCallback = null) {
  console.log('📄 Processing large document with chunking...');

  const chunks = chunkText(resumeText, 12000); // Conservative chunk size
  console.log(`📑 Document split into ${chunks.length} chunks`);

  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}...`);

    if (progressCallback) {
      const chunkProgress = 20 + (i / chunks.length) * 70; // 20-90% for chunk processing
      progressCallback(Math.round(chunkProgress));
    }

    try {
      // Process individual chunk with simplified prompt
      const chunkResult = await processChunk(chunks[i], i + 1, chunks.length);
      results.push(chunkResult);
    } catch (error) {
      console.error(`❌ Error processing chunk ${i + 1}:`, error.message);
      // Continue with other chunks
    }
  }

  console.log('🔄 Merging chunk results...');
  if (progressCallback) progressCallback(95);

  // Merge all chunk results
  const mergedResult = mergeChunkResults(results);

  if (progressCallback) progressCallback(100);
  return mergedResult;
}

/**
 * Process a single chunk of text
 * @param {string} chunkText - Text chunk to process
 * @param {number} chunkIndex - Current chunk number
 * @param {number} totalChunks - Total number of chunks
 * @returns {Promise<Object>} - Structured data from chunk
 */
async function processChunk(chunkText, chunkIndex, totalChunks) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Simplified prompt for chunk processing
  const prompt = `Extract CV information from this text chunk (${chunkIndex}/${totalChunks}) and return ONLY a valid JSON object with any available information:

{
  "personalInfo": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "nationality": ""
  },
  "workExperience": [],
  "education": [],
  "languages": [],
  "publications": [],
  "summary": ""
}

Extract only what's available in this chunk. Leave empty arrays/strings for missing data.

Text chunk:
${chunkText}`;

  const requestPayload = {
    model: 'anthropic/claude-3.5-sonnet',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4000, // Increased for comprehensive chunk processing
  };

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    requestPayload,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Resume Transformer Tool - Chunk Processing',
      },
      timeout: 30000
    }
  );

  const messageContent = response.data.choices[0].message?.content;
  let jsonString = messageContent.trim();

  // Clean JSON response
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonString = jsonMatch[1].trim();
  }

  return JSON.parse(jsonString);
}

/**
 * Merge results from multiple chunks
 * @param {Array} results - Array of chunk results
 * @returns {Object} - Merged structured data
 */
function mergeChunkResults(results) {
  const merged = {
    personalInfo: {},
    summary: '',
    workExperience: [],
    education: [],
    languages: [],
    publications: [],
    skills: { technical: [], soft: [], languages: [], tools: [], frameworks: [], databases: [] },
    certifications: [],
    awards: [],
    projects: [],
    countryExperience: ''
  };

  results.forEach(result => {
    if (!result) return;

    // Merge personal info (first non-empty values win)
    if (result.personalInfo) {
      Object.keys(result.personalInfo).forEach(key => {
        if (result.personalInfo[key] && !merged.personalInfo[key]) {
          merged.personalInfo[key] = result.personalInfo[key];
        }
      });
    }

    // Combine arrays
    if (result.workExperience) merged.workExperience.push(...result.workExperience);
    if (result.education) merged.education.push(...result.education);
    if (result.publications) merged.publications.push(...result.publications);
    if (result.languages) merged.languages.push(...result.languages);

    // Use longest summary
    if (result.summary && result.summary.length > merged.summary.length) {
      merged.summary = result.summary;
    }
  });

  // Remove duplicates from arrays
  merged.languages = [...new Set(merged.languages)];

  console.log(`✅ Merged results from ${results.length} chunks`);
  return merged;
}

module.exports = {
  processResumeWithOpenRouter,
  PREDEFINED_JSON_STRUCTURE,
  chunkText,
  processLargeDocument
};

// Optional: Simple test call (comment out or remove before finalizing)
/*
if (require.main === module) {
  (async () => {
    // Mock resume text for testing
    const sampleResumeText = `
      John Doe
      john.doe@email.com | (123) 456-7890 | linkedin.com/in/johndoe | github.com/johndoe

      Summary:
      Highly motivated software engineer with 5 years of experience in full-stack development.

      Education:
      B.S. in Computer Science, University of Example, Graduated: May 2019, GPA: 3.8
      Major: Computer Science

      Work Experience:
      Tech Solutions Inc. - Software Engineer
      June 2019 - Present | Anytown, USA
      - Developed and maintained web applications using React, Node.js, and PostgreSQL.
      - Collaborated with cross-functional teams to deliver high-quality software.

      Old Company - Junior Developer
      Jan 2018 - May 2019 | Anytown, USA
      - Assisted senior developers in coding and testing.

      Projects:
      Personal Portfolio Website - A responsive website showcasing my projects. (Technologies: HTML, CSS, JavaScript)

      Skills:
      Technical: JavaScript, React, Node.js, Python, SQL, Git, Docker
      Soft Skills: Communication, Teamwork, Problem-solving
      Languages: English (Native), Spanish (Conversational)

      Certifications:
      Certified Kubernetes Application Developer - CNCF, 2021
    `;

    // IMPORTANT: Set your OPENROUTER_API_KEY environment variable before running this test.
    // e.g., export OPENROUTER_API_KEY='your_actual_api_key'
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("Please set the OPENROUTER_API_KEY environment variable to test.");
      console.log("Skipping OpenRouter service test.");
      return;
    }
    
    console.log("Attempting to process sample resume with OpenRouter...");
    try {
      const structuredData = await processResumeWithOpenRouter(sampleResumeText);
      console.log('Structured Resume Data:', JSON.stringify(structuredData, null, 2));
    } catch (error) {
      console.error('Error during OpenRouter service test:', error.message);
    }
  })();
}
*/
