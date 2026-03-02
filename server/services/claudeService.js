import Anthropic from '@anthropic-ai/sdk';
import configService from './configService.js';

export const callClaude = async (prompt) => {
    const ANTHROPIC_API_KEY = await configService.get('ANTHROPIC_API_KEY');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 30000, maxRetries: 2 });

    const msg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
    });

    return { content: msg.content[0].text, model: msg.model, tokensUsed: msg.usage.input_tokens + msg.usage.output_tokens };
};
