// api-debug-test.js - Comprehensive API debugging
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

async function debugTest() {
    console.log('=== Comprehensive API Debug Test ===\n');

    // 1. Test environment loading
    console.log('1. Environment Variables:');
    console.log('   API Key exists:', !!process.env.OPENROUTER_API_KEY);
    console.log('   API Key length:', process.env.OPENROUTER_API_KEY?.length || 0);
    console.log('   API Key preview:', process.env.OPENROUTER_API_KEY?.substring(0, 25) + '...' || 'none');
    console.log('');

    // 2. Test direct API call (not through our server)
    console.log('2. Direct OpenRouter API Test:');
    try {
        const directResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [{ role: 'user', content: 'Say "API test successful"' }],
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'BD Assistant CV Transformer'
            }
        });
        console.log('   ✅ Direct API call SUCCESS');
        console.log('   Response:', directResponse.data.choices[0].message.content);
    } catch (error) {
        console.log('   ❌ Direct API call FAILED');
        console.log('   Error:', error.response?.data || error.message);
    }
    console.log('');

    // 3. Test server health
    console.log('3. Server Health Check:');
    try {
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('   ✅ Server health OK');
        console.log('   Status:', healthResponse.data.status);
    } catch (error) {
        console.log('   ❌ Server health FAILED');
        console.log('   Error:', error.message);
    }
    console.log('');

    // 4. Test CV upload with correct field name
    console.log('4. CV Upload Test (correct field name):');
    try {
        const form = new FormData();
        form.append('cv_file', fs.createReadStream('clean_cv_test.docx'));

        console.log('   📤 Uploading CV file...');
        const uploadResponse = await axios.post('http://localhost:5000/transform-cv', form, {
            headers: form.getHeaders(),
            timeout: 60000, // 60 second timeout
            responseType: 'arraybuffer' // Since server sends DOCX binary
        });

        console.log('   ✅ CV upload SUCCESS');
        console.log('   Response size:', uploadResponse.data.length, 'bytes');
        console.log('   Content-Type:', uploadResponse.headers['content-type']);

        // Save the response to verify it's a valid DOCX
        fs.writeFileSync('test-output.docx', uploadResponse.data);
        console.log('   💾 Response saved as test-output.docx');

    } catch (error) {
        console.log('   ❌ CV upload FAILED');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.toString() || error.message);
    }
    console.log('');

    console.log('=== Debug Test Complete ===');
}

debugTest().catch(console.error); 