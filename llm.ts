import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";
import { DimensionEvaluationSchema } from "./types.js";
import type { DimensionEvaluation } from "./types.js";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env file");

const ai = new GoogleGenAI({ apiKey });

export async function evaluateDimensionWithClaude(
  transcript: string,
  dimensionDescription: string
): Promise<DimensionEvaluation> {
  const prompt = `
You are a deterministic transcript evaluator for Bievermind coaching calls.
Your job is to score a single dimension based STRICTLY on the transcript evidence provided.

DIMENSION TO EVALUATE:
${dimensionDescription}

TRANSCRIPT:
${transcript}

CRITICAL RULES:
1. Every evidence quote MUST be an exact, word-for-word string match from the transcript.
2. Include the 1-based "lineStart" index where the quote appears in the transcript.
3. If the dimension was not demonstrated, set "notEvidenced" to true, score to 0, and leave "evidence" as [].
4. Output ONLY a valid JSON object matching this structure:
{
  "dimensionId": "empathy_and_rapport",
  "score": 5,
  "reasoning": "Explain reasoning here",
  "evidence": [
    {
      "quote": "Exact string match",
      "lineStart": 2
    }
  ],
  "quickFix": "Actionable advice",
  "notEvidenced": false
}
`;

  // Retries up to 3 times on API failure with exponential backoff
  return pRetry(
    async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response received from Gemini API");

      const rawJson = JSON.parse(responseText);
      return DimensionEvaluationSchema.parse(rawJson);
    },
    {
      retries: 3,
      onFailedAttempt: (error) => {
        console.warn(
          `⚠️ Call attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries remaining.`
        );
      },
    }
  );
}