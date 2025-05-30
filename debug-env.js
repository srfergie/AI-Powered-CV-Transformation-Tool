require('dotenv').config();

console.log('=== Environment Variable Debug ===');
console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('OPENROUTER_API_KEY length:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 0);
console.log('OPENROUTER_API_KEY value:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 20) + '...' : 'undefined');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All process.env keys containing "OPEN":', Object.keys(process.env).filter(key => key.includes('OPEN'))); 