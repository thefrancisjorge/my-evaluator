import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in environment variables.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function evaluateCall(transcript: string, callType: string) {
  const prompt = `
    You are an expert QA call evaluator. Evaluate the following call transcript for a call type of "${callType}".
    Provide a structured evaluation report including scores, strengths, and areas for improvement.

    Transcript:
    ${transcript}
  `;

 const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  return {
    rawOutput: response.text,
    evaluatedAt: new Date().toISOString(),
  };
}