// server-env-test.js - Test server environment loading
const axios = require('axios');
require('dotenv').config(); // Same as server.js

console.log('=== Server Environment Test ===');

// Test 1: Environment loading (same as server.js)
console.log('1. Environment loaded in server context:');
console.log('   - API Key exists:', !!process.env.OPENROUTER_API_KEY);
console.log('   - Length:', process.env.OPENROUTER_API_KEY?.length || 0);
console.log('   - Preview:', process.env.OPENROUTER_API_KEY?.substring(0, 25) + '...' || 'none');

// Test 2: Simulate the exact llmService.js API call
console.log('\n2. Testing exact llmService API call format:');

// This is the exact getApiKey function from our llmService.js
const getApiKey = () => process.env.OPENROUTER_API_KEY;

async function testLlmServiceCall() {
    try {
        const apiKey = getApiKey();

        if (!apiKey) {
            throw new Error('OpenRouter API key not found in environment variables');
        }

        console.log('   - API key from getApiKey():', !!apiKey, 'length:', apiKey.length);

        // Exact same request format as our llmService.js
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [{ role: 'user', content: 'Test' }],
            temperature: 0.1,
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'BD Assistant CV Transformer'
            }
        });

        console.log('   ✅ LLM Service call SUCCESS');
        console.log('   Response:', response.data.choices[0].message.content);

    } catch (error) {
        console.log('   ❌ LLM Service call FAILED');
        console.log('   Error details:', error.response?.data || error.message);

        // Debug the headers being sent
        if (error.config) {
            console.log('   Headers sent:', JSON.stringify(error.config.headers, null, 2));
        }
    }
}

testLlmServiceCall(); 