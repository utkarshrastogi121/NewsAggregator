import { prisma } from '../utils/prisma';
import { geminiModel } from '../config/gemini';
import { logger } from '../config/logger';

export interface SynthesisResult {
  summary: string;
  tags: string[];
}

export class AIService {
  /**
   * Compiles data across all articles in an EventGroup and produces an AI-synthesized summary.
   */
  static async synthesizeEventGroup(eventGroupId: string): Promise<SynthesisResult | null> {
    try {
      const group = await prisma.eventGroup.findUnique({
        where: { id: eventGroupId },
        include: {
          articles: {
            select: {
              title: true,
              content: true,
              publisher: true,
            },
          },
        },
      });

      if (!group || group.articles.length === 0) {
        logger.warn(`Synthesis skipped: EventGroup [${eventGroupId}] not found or contains zero articles.`);
        return null;
      }

      // Consolidate cross-publisher text sources into a single payload
      const articlesPayload = group.articles
        .map((a, idx) => `--- ARTICLE ${idx + 1} | Publisher: ${a.publisher} | Title: ${a.title} ---\n${a.content}`)
        .join('\n\n');

      const systemInstruction = 
        `You are an expert news aggregator backend service. Your task is to synthesize the provided multi-publisher articles into a single, highly accurate, and objective summary. 
        Avoid publisher bias, speculation, and redundant commentary. 
        
        You MUST respond ONLY with a raw JSON object matching this structure:
        {
          "summary": "A concise, 3-4 sentence comprehensive breakdown of the core event.",
          "tags": ["3-5 lowercase, single-word topical keywords"]
        }`;

      logger.info(`Dispatching AI synthesis payload to Gemini for EventGroup [${eventGroupId}] containing ${group.articles.length} sources.`);

      const generationPayload = {
        contents: [{ role: 'user', parts: [{ text: `Articles Data:\n${articlesPayload}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2, // Kept low to guarantee analytical grounding and reduce hallucinations
        },
      };

      const responseInstance = typeof (geminiModel as any).generateContent === 'function'
        ? await (geminiModel as any).generateContent(generationPayload)
        : await (geminiModel as any).models.generateContent({
            model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
            ...generationPayload,
            config: {
              ...generationPayload.generationConfig,
              systemInstruction,
            },
          });

      const responseText = responseInstance.response.text();
      if (!responseText) {
        throw new Error('Gemini API returned an empty text layer context.');
      }

      const cleanJson = this.sanitizeJsonString(responseText);
      const result: SynthesisResult = JSON.parse(cleanJson);

      // Persist the synthesized insights directly back onto the EventGroup record
      await prisma.eventGroup.update({
        where: { id: eventGroupId },
        data: {
          summary: result.summary,
          // Re-serialize arrays cleanly for standard text fields if native JSON columns aren't implemented
          title: group.articles[0].title // Enforce the primary anchor title as default group label
        },
      });

      logger.info(`Successfully synchronized AI synthesized metrics for EventGroup [${eventGroupId}]`);
      return result;
    } catch (error: any) {
      logger.error(`AI Core Synthesis failed on EventGroup [${eventGroupId}]: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper utility to scrub markdown fences out of raw text generations if returned by the model.
   */
  private static sanitizeJsonString(raw: string): string {
    let output = raw.trim();
    if (output.startsWith('```json')) {
      output = output.substring(7);
    } else if (output.startsWith('```')) {
      output = output.substring(3);
    }
    if (output.endsWith('```')) {
      output = output.substring(0, output.length - 3);
    }
    return output.trim();
  }
}