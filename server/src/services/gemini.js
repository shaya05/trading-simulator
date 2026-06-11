import { getGeminiModel } from '../config/gemini.js';

console.log('Gemini key:', process.env.GEMINI_API_KEY ? 'loaded' : 'MISSING')

export async function analyzeWithGemini({ symbol, quote, summary, history, options }) {
  const model = getGeminiModel();

  const prompt = [
    `You are helping a beginner trader research ${symbol}.`,
    'Use only the supplied Yahoo Finance data. Do not invent facts.',
    'Return a concise beginner-friendly analysis with these sections exactly:',
    '1. Bull case',
    '2. Bear case',
    '3. Key risks',
    '4. Beginner advice',
    'Keep the tone educational and practical.',
    '',
    'Yahoo quote:',
    JSON.stringify(quote, null, 2),
    '',
    'Yahoo summary:',
    JSON.stringify(summary, null, 2),
    '',
    'Recent history sample:',
    JSON.stringify(history.slice(-30), null, 2),
    '',
    'Options snapshot:',
    JSON.stringify(options, null, 2)
  ].join('\n');

  const result = await model.generateContent(prompt);
  return result.response.text();
}