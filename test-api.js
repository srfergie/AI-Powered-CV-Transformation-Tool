require('dotenv').config();

console.log('=== API Key Test ===');
console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('OPENROUTER_API_KEY length:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 0);
console.log('OPENROUTER_API_KEY preview:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 20) + '...' : 'undefined');

// Test API call
const axios = require('axios');

async function testApiCall() {
    try {
        console.log('Testing with free model first...');
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [
                { role: 'user', content: 'Say "Hello, API test successful!"' }
            ],
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'CV Transformation Tool'
            }
        });

        console.log('✅ API Call Success!');
        console.log('Response:', response.data.choices[0].message.content);
    } catch (error) {
        console.log('❌ API Call Failed:');
        console.log('Error:', error.response ? error.response.data : error.message);
        console.log('Status:', error.response ? error.response.status : 'Unknown');

        // Try to get credits info
        try {
            console.log('\nChecking credits...');
            const creditsResponse = await axios.get('https://openrouter.ai/api/v1/auth/key', {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
                }
            });
            console.log('Credits info:', creditsResponse.data);
        } catch (creditsError) {
            console.log('Credits check failed:', creditsError.response ? creditsError.response.data : creditsError.message);
        }
    }
}

if (process.env.OPENROUTER_API_KEY) {
    testApiCall();
} else {
    console.log('❌ No API key found');
} 