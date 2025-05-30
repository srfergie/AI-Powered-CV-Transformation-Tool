// env-test.js - Test environment loading
require('dotenv').config();

console.log('=== Environment Variable Test ===');
console.log('1. OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('2. Length:', process.env.OPENROUTER_API_KEY?.length || 0);
console.log('3. First 20 chars:', process.env.OPENROUTER_API_KEY?.substring(0, 20) || 'none');
console.log('4. Last 10 chars:', process.env.OPENROUTER_API_KEY?.slice(-10) || 'none');
console.log('5. Has carriage returns:', process.env.OPENROUTER_API_KEY?.includes('\r'));
console.log('6. Has newlines:', process.env.OPENROUTER_API_KEY?.includes('\n'));
console.log('7. Trimmed length:', process.env.OPENROUTER_API_KEY?.trim().length || 0);

// Test the exact format we use in axios
const cleanKey = process.env.OPENROUTER_API_KEY?.trim();
console.log('8. Clean key length:', cleanKey?.length || 0);
console.log('9. Authorization header would be:', `Bearer ${cleanKey}`);

console.log('=== Test Complete ==='); 