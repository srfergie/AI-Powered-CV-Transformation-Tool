const axios = require('axios');

// Define the expected JSON structure for the LLM output
const PREDEFINED_JSON_STRUCTURE = {
  personalDetails: {
    name: '',
    email: '',
    phone: '',
    linkedin: '', // Added LinkedIn as it's common
    github: '',   // Added GitHub as it's common for tech roles
  },
  summary: '', // Added a summary/objective section
  education: [
    {
      institution: '',
      degree: '',
      major: '', // Added major
      graduationDate: '', // Or year
      gpa: '', // Optional
    },
  ],
  workExperience: [
    {
      company: '',
      position: '',
      startDate: '',
      endDate: '', // Or 'Present'
      location: '', // Added location
      responsibilities: [],
    },
  ],
  projects: [ // Added a projects section
    {
      name: '',
      description: '',
      technologies: [],
      link: '', // Optional link to project
    }
  ],
  skills: { // Categorized skills
    technical: [],
    soft: [],
    languages: [], // Programming or spoken languages
  },
  certifications: [ // Added certifications
    {
      name: '',
      issuingOrganization: '',
      dateObtained: '',
    }
  ],
  // Add other sections as needed, e.g., awards, publications
};

/**
 * Processes resume text using the OpenRouter API to extract structured information.
 * @param {string} resumeText - The text content of the resume.
 * @returns {Promise<object>} - A promise that resolves with the structured resume data as a JavaScript object.
 * @throws {Error} - Throws an error if the API request fails or the response is not as expected.
 */
async function processResumeWithOpenRouter(resumeText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OpenRouter API key is not set. Please set the OPENROUTER_API_KEY environment variable.');
    throw new Error('OpenRouter API key is missing. Please configure it in your environment variables.');
  }

  const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions';

  // Construct the prompt for the LLM
  const prompt = `
    Extract the key information from the following resume text and structure it in the following JSON format.
    Ensure the output is ONLY the JSON object, without any surrounding text or explanations.

    Resume Text:
    ---
    ${resumeText}
    ---

    JSON Format:
    \`\`\`json
    ${JSON.stringify(PREDEFINED_JSON_STRUCTURE, null, 2)}
    \`\`\`

    Please fill in the values based on the resume text. If a field is not present in the resume, use an empty string "" for string values, an empty array [] for array values, or null if appropriate for optional numeric fields (like GPA).
    For dates, try to use YYYY-MM-DD format if possible, otherwise use the format present in the resume.
  `;

  try {
    const response = await axios.post(
      openRouterEndpoint,
      {
        model: 'mistralai/mistral-7b-instruct', // Recommended or placeholder model
        // model: 'openai/gpt-3.5-turbo', // Alternative model
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.2, // Lower temperature for more deterministic output
        max_tokens: 2000, // Adjust as needed, ensure it's enough for a detailed resume
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // OpenRouter might recommend these headers for better tracking/logging on their end.
          // 'HTTP-Referer': 'YOUR_SITE_URL', // Optional: Replace with your site URL
          // 'X-Title': 'YOUR_APP_NAME', // Optional: Replace with your app name
        },
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const messageContent = response.data.choices[0].message?.content;
      if (!messageContent) {
        throw new Error('OpenRouter API response did not contain message content.');
      }

      // The LLM might sometimes include the ```json ... ``` markdown block.
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonString = messageContent;
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
      } else {
        // Sometimes the LLM might just return the JSON directly, or with slight variations.
        // Basic check to see if it looks like JSON.
        if (!(jsonString.trim().startsWith('{') && jsonString.trim().endsWith('}'))) {
          console.warn("LLM output doesn't look like a JSON object, attempting to parse anyway:", jsonString);
        }
      }
      
      try {
        const parsedJson = JSON.parse(jsonString);
        return parsedJson;
      } catch (parseError) {
        console.error('Failed to parse JSON response from OpenRouter:', parseError);
        console.error('Raw LLM Output that failed parsing:', jsonString);
        throw new Error(`Failed to parse JSON response from OpenRouter. Raw output: ${jsonString.substring(0, 200)}...`);
      }
    } else {
      console.error('Invalid response structure from OpenRouter:', response.data);
      throw new Error('Invalid or empty response from OpenRouter API.');
    }
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('OpenRouter API Error Status:', error.response.status);
      console.error('OpenRouter API Error Data:', error.response.data);
      throw new Error(`OpenRouter API request failed with status ${error.response.status}: ${error.response.data?.error?.message || error.message}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from OpenRouter API:', error.request);
      throw new Error('No response received from OpenRouter API. Check network connectivity or OpenRouter status.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up OpenRouter API request:', error.message);
      throw new Error(`Error setting up OpenRouter API request: ${error.message}`);
    }
  }
}

module.exports = { processResumeWithOpenRouter, PREDEFINED_JSON_STRUCTURE };

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
