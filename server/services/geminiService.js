import { GoogleGenerativeAI } from "@google/generative-ai";
import configService from './configService.js';

const getModel = async (tools = [], systemInstruction = "") => {
    const GEMINI_API_KEY = await configService.get('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const config = {
        model: "gemini-2.5-flash",
    };

    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    if (tools.length > 0) {
        config.tools = [{ functionDeclarations: tools }];
    }

    return genAI.getGenerativeModel(config);
};

export const callGeminiStream = async (prompt, onChunk, tools = [], systemInstruction = "") => {
    const model = await getModel(tools, systemInstruction);
    const result = await model.generateContentStream(prompt);
    
    let fullText = "";
    for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        if (onChunk) onChunk(chunkText);
    }

    return {
        content: fullText,
        model: "gemini-2.5-flash"
    };
};

export const callGemini = async (prompt, tools = [], systemInstruction = "") => {
    const model = await getModel(tools, systemInstruction);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
        content: response.text(),
        model: "gemini-2.5-flash",
        functionCalls: response.functionCalls(),
        tokensUsed: response.usageMetadata?.totalTokenCount || 0
    };
};

// Starts a chat session with tool usage capability
export const startAgenticChat = async (history = [], tools = [], systemInstruction = "") => {
    const model = await getModel(tools, systemInstruction);
    return model.startChat({
        history: history,
        generationConfig: {
            maxOutputTokens: 2000,
        },
    });
};
