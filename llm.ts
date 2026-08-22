import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in environment variables.");
}

// Verify this string against the current Gemini model list before deploying.
const MODEL = "gemini-3.5-flash-lite";

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

function buildPrompt(transcript: string, callType: string) {
  return `You are an experienced QA evaluator reviewing a "${callType}" call.

Evaluate the transcript below and reply with a Markdown report using EXACTLY these
five sections, in this order, with these exact headings. Do not add sections, and do
not write any preamble or closing remarks outside them.

## Overall Score
A score out of 100 on its own line, formatted as **NN / 100**, followed by one
sentence explaining the score.

## Category Scores
A Markdown table with the columns: Category | Score | Notes.
Score each category out of 10. Choose 4 to 6 categories that genuinely apply to a
"${callType}" call — for example opening and rapport, discovery, product knowledge,
objection handling, resolution or close, tone and professionalism, compliance.
Keep Notes to one short sentence each.

## What Went Well
Two to four bullets. Each bullet must quote a short line from the transcript in
quotation marks, then explain in one sentence why it worked.

## Areas for Improvement
Two to four bullets. Each bullet must quote the relevant line or name the moment it
should have happened, say what was missed, and give a better alternative.

## Coaching Plan
Exactly three numbered actions the agent should practise before their next call.
Each one is a single concrete instruction a team lead can hand over as-is.

Rules:
- Base every claim on the transcript. If something cannot be judged from it, say so
  in Notes rather than assuming.
- Never invent dialogue that is not in the transcript.
- If the transcript is too short or unusable, still return the five sections and
  explain the limitation under Overall Score.

Transcript:
"""
${transcript}
"""`;
}

export async function evaluateCall(transcript: string, callType: string) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(transcript, callType),
  });

  const text = response.text?.trim();

  // Throw instead of returning '' so the route surfaces a real error to the user
  // rather than silently saving an empty report.
  if (!text) {
    throw new Error(
      "The model returned an empty response. This usually means the transcript was blocked or the request was cut short."
    );
  }

  return text;
}