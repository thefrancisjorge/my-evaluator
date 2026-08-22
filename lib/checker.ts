import { DimensionEvaluationSchema } from "./types";
import type { DimensionEvaluation } from "./types";

export function verifyQuoteWithLine(
  transcript: string,
  quote: string,
  expectedLineStart?: number
): { matched: boolean; actualLine?: number } {
  const lines = transcript.split("\n");
  const cleanQuote = quote.toLowerCase().replace(/\s+/g, " ").trim();

  // If line index provided, check specific line first
  if (expectedLineStart !== undefined && lines[expectedLineStart - 1]) {
    const lineText = lines[expectedLineStart - 1].toLowerCase().replace(/\s+/g, " ");
    if (lineText.includes(cleanQuote)) {
      return { matched: true, actualLine: expectedLineStart };
    }
  }

  // Fallback: search all lines to locate actual line number
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].toLowerCase().replace(/\s+/g, " ");
    if (lineText.includes(cleanQuote)) {
      return { matched: true, actualLine: i + 1 };
    }
  }

  return { matched: false };
}

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  data?: DimensionEvaluation;
}

export function verifyEvaluationPayload(
  transcript: string,
  rawPayload: unknown
): VerificationResult {
  const errors: string[] = [];

  const parseResult = DimensionEvaluationSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    return {
      isValid: false,
      errors: parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }

  const data = parseResult.data;

  if (!data.notEvidenced && data.evidence) {
    for (const item of data.evidence) {
      const check = verifyQuoteWithLine(transcript, item.quote, item.lineStart);
      if (!check.matched) {
        errors.push(`Quote not found in transcript: "${item.quote}"`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data,
  };
}