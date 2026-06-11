import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.js';

export function getGeminiModel() {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const client = new GoogleGenerativeAI(env.geminiApiKey);
  return client.getGenerativeModel({ model: env.geminiModel });
}