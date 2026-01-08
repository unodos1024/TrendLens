const axios = require('axios');
require('dotenv').config();

async function check() {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        console.log('--- All Models ---');
        response.data.models.forEach(m => {
            console.log(`- ${m.name} [Methods: ${m.supportedGenerationMethods.join(', ')}]`);
        });
    } catch (e) {
        console.error('Error:', e.message, e.response ? e.response.data : '');
    }
}
check();
