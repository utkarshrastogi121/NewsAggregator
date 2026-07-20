import { GoogleGenAI } from '@google/genai';
import { logger } from './logger.js';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  logger.error('GEMINI_API_KEY environment variable is missing.');
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey });

logger.info('Gemini AI client successfully initialized with provided credentials.');