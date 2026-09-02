import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

export const geminiService = {
  getMetadataWithAI: async (videoUrl, rawTitle) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analyze this video URL: ${videoUrl} and current title: "${rawTitle}". Return a concise 1-sentence title and media summary as JSON with keys "title" and "description".`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      logger.warn('Gemini AI metadata enhancement skipped', { error: err.message });
    }
    return null;
  }
};
