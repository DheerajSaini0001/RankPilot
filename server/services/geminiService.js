import { GoogleGenerativeAI } from "@google/generative-ai";
import configService from './configService.js';

export const callGemini = async (prompt) => {
    const GEMINI_API_KEY = await configService.get('GEMINI_API_KEY');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
        content: text,
        model: "gemini-2.5-flash",
        tokensUsed: response.usageMetadata?.totalTokenCount || 0
    };
};
