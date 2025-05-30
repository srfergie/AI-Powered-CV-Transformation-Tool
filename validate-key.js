// validate-key.js - Test OpenRouter API key validity
const axios = require('axios');
require('dotenv').config();

async function validateKey() {
    console.log('=== OpenRouter API Key Validation ===');

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.log('❌ No API key found in environment');
        return;
    }

    console.log('✅ API Key loaded, length:', apiKey.length);
    console.log('Preview:', apiKey.substring(0, 25) + '...');

    try {
        // Use OpenRouter's key validation endpoint
        const response = await axios.get('https://openrouter.ai/api/v1/auth/key', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n🎉 API Key is VALID!');
        console.log('Key details:', JSON.stringify(response.data, null, 2));

        // Check for common issues
        if (response.data.data.disabled) {
            console.log('⚠️  WARNING: Key is disabled');
        }

        if (response.data.data.is_free_tier) {
            console.log('ℹ️  Info: This is a free tier key');
        }

        if (response.data.data.limit !== null) {
            console.log(`💰 Credit limit: ${response.data.data.limit}`);
            console.log(`💸 Usage: ${response.data.data.usage}`);
            const remaining = response.data.data.limit - response.data.data.usage;
            console.log(`💵 Remaining: ${remaining}`);

            if (remaining <= 0) {
                console.log('❌ ISSUE: No credits remaining!');
            }
        }

    } catch (error) {
        console.log('\n❌ API Key validation FAILED');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.log('\n🔍 This confirms the API key is invalid/expired/deactivated');
        }
    }
}

validateKey(); 