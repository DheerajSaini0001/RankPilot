import OpenAI from 'openai';
import configService from './configService.js';

export const callOpenAI = async (prompt) => {
    const OPENAI_API_KEY = await configService.get('OPENAI_API_KEY');
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY, timeout: 30000, maxRetries: 2 });

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
    });

    return { content: response.choices[0].message.content, model: response.model, tokensUsed: response.usage.total_tokens };
};
