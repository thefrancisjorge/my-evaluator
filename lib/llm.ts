import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import { RUBRIC, type CallType, activeMax, normalise, bandFor, validateScores } from './rubrics';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error('GEMINI_API_KEY is not set.');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });

/* ------------------------------------------------------------------ */
/*  Rubric loading                                                     */
/* ------------------------------------------------------------------ */

const RUBRIC_FILES: Record<CallType, string> = {
  coaching: 'coaching-call-rubric.md',
  kickoff: 'kickoff-call-rubric.md',
};

const rubricCache = new Map<CallType, string>();

function loadRubric(callType: CallType): string {
  const cached = rubricCache.get(callType);
  if (cached) return cached;
  const file = path.join(process.cwd(), 'rubrics', RUBRIC_FILES[callType]);
  const text = fs.readFileSync(file, 'utf8');
  rubricCache.set(callType, text);
  return text;
}

/* ------------------------------------------------------------------ */
/*  Response shape                                                     */
/* ------------------------------------------------------------------ */

export interface DimensionResult {
  id: string;
  score: number | null;
  disabled: boolean;
  disabled_reason: string | null;
  reasoning: string;
  evidence: string[];
  evidence_absent: boolean;
  quick_fix: string;
}

export interface EvaluationResult {
  call_type: CallType;
  dimensions: DimensionResult[];
  caps_fired: { id: string; explanation: string }[];
  the_one_thing: { change: string; why: string; score_with_it: number };
  brief: string;
  red_flags: { flag: string; why: string; severity: 'low' | 'medium' | 'high' }[];
  raw_score: number;
  max_possible: number;
  percentage: number;
  band: string;
  band_blurb: string;
  evidence_check: { total: number; verified: number; unverified: string[] };
}

function schemaFor(callType: CallType) {
  const ids = RUBRIC[callType].dimensions.map((d) => d.id);
  return {
    type: Type.OBJECT,
    required: ['dimensions', 'caps_fired', 'the_one_thing', 'brief', 'red_flags'],
    properties: {
      dimensions: {
        type: Type.ARRAY,
        minItems: '12',
        maxItems: '12',
        items: {
          type: Type.OBJECT,
          required: ['id', 'score', 'disabled', 'reasoning', 'evidence', 'evidence_absent', 'quick_fix'],
          properties: {
            id: { type: Type.STRING, enum: ids },
            score: { type: Type.NUMBER, nullable: true },
            disabled: { type: Type.BOOLEAN },
            disabled_reason: { type: Type.STRING, nullable: true },
            reasoning: { type: Type.STRING, description: 'Opens with a reference to a specific transcript moment. No impressions.' },
            evidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Verbatim lines copied character-for-character from the transcript. Empty when the behaviour is absent.',
            },
            evidence_absent: { type: Type.BOOLEAN, description: 'True when the behaviour does not appear in the transcript at all.' },
            quick_fix: { type: Type.STRING, description: 'What the coach had to do to reach full marks on this dimension.' },
          },
        },
      },
      caps_fired: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ['id', 'explanation'],
          properties: {
            id: { type: Type.STRING, enum: RUBRIC[callType].caps.map((c) => c.id) },
            explanation: { type: Type.STRING },
          },
        },
      },
      the_one_thing: {
        type: Type.OBJECT,
        required: ['change', 'why', 'score_with_it'],
        properties: {
          change: { type: Type.STRING, description: 'The single change that moves the number most.' },
          why: { type: Type.STRING },
          score_with_it: { type: Type.NUMBER, description: 'What the call would have scored out of 100 with this change alone.' },
        },
      },
      brief: { type: Type.STRING, description: 'A few sentences on how the call went, written to the coach in second person.' },
      red_flags: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ['flag', 'why', 'severity'],
          properties: {
            flag: { type: Type.STRING },
            why: { type: Type.STRING, description: 'Why this puts the client at risk of leaving.' },
            severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          },
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Prompt                                                             */
/* ------------------------------------------------------------------ */

function buildPrompt(transcript: string, callType: CallType): string {
  const spec = RUBRIC[callType];
  const table = spec.dimensions
    .map((d) => {
      const buckets = d.buckets.length ? `exactly one of ${d.buckets.join(', ')}` : `0 to ${d.points}`;
      const opt = d.optional ? ` — MAY be disabled: ${d.optionalReason}` : '';
      return `- ${d.id} | D${d.n} ${d.name} | ${d.points} pts | score must be ${buckets}${opt}`;
    })
    .join('\n');

  const caps = spec.caps
    .map((c) => `- ${c.id}: ${c.condition} → ${c.kind === 'total' ? `total capped at ${c.max}` : `${c.dimension} capped at ${c.max}`}${c.nonRecoverable ? ' (non-recoverable)' : ''}`)
    .join('\n');

  return `You are the quality reviewer for a ${spec.label.toLowerCase()}. Score the transcript against the rubric below. The rubric is the whole authority — do not import standards from anywhere else.

# THE RUBRIC

${loadRubric(callType)}

# THE TWELVE DIMENSIONS YOU MUST RETURN

Return all twelve, once each, using these exact ids:

${table}

# AUTOMATIC CAPS

Check every one before you finish. Report each that fires:

${caps}

# HOW TO SCORE

Evidence or nothing. Every dimension carries the verbatim transcript lines the score rests on, copied character-for-character — same words, same punctuation, same speaker label. Do not paraphrase, tidy, merge two turns, or fix a typo. If you cannot copy a real line, the evidence array is empty and evidence_absent is true.

When a behaviour is not in the transcript, say so. Set evidence_absent to true and score the dimension conservatively at the lower tier of its band. Do not infer a behaviour from the general mood of the call, from the coach seeming competent elsewhere, or from what usually happens on this kind of call. A warm, likeable call with a missing behaviour scores as missing.

Where the rubric lists discrete buckets, pick one. No interpolation, no averaging between two buckets. The reasoning carries the nuance, not the number.

Every reasoning opens with the specific moment it rests on.

quick_fix states what the coach had to do on THIS call to reach full marks on that dimension. Concrete and specific to what happened, not generic advice.

the_one_thing is the single change that moves the total most, with the score the call would have reached with that change alone and nothing else.

red_flags are retention risks: what puts this client at risk of leaving. A high score can still hide one. Return an empty array only if there genuinely are none.

The brief is written to the coach, second person, a few sentences, direct.

# TRANSCRIPT

${transcript}`;
}

/* ------------------------------------------------------------------ */
/*  Evidence verification                                              */
/* ------------------------------------------------------------------ */

const squash = (s: string) =>
  s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();

function verifyEvidence(result: { dimensions: DimensionResult[] }, transcript: string) {
  const haystack = squash(transcript);
  const unverified: string[] = [];
  let total = 0;
  let verified = 0;

  for (const d of result.dimensions) {
    for (const quote of d.evidence ?? []) {
      total += 1;
      const needle = squash(quote).replace(/^\[[^\]]+\]:\s*/, '');
      if (needle.length > 8 && haystack.includes(needle)) verified += 1;
      else unverified.push(`${d.id}: ${quote.slice(0, 90)}`);
    }
  }

  return { total, verified, unverified };
}

/* ------------------------------------------------------------------ */

export async function evaluateCall(transcript: string, callType: CallType): Promise<EvaluationResult> {
  if (!transcript.trim()) throw new Error('The transcript is empty.');
  if (!RUBRIC[callType]) throw new Error(`Unknown call type: ${callType}`);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(transcript, callType),
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: schemaFor(callType),
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('The model returned nothing. The transcript was most likely blocked by a safety filter or the request was cut short.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The model returned malformed JSON. Check the response schema against the SDK version.');
  }

  const problems = validateScores(callType, parsed.dimensions ?? []);
  if (problems.length) {
    throw new Error(`The model broke the rubric contract:\n${problems.map((p: string) => `• ${p}`).join('\n')}`);
  }

  const dimensions = parsed.dimensions as DimensionResult[];
  const disabledIds: string[] = dimensions.filter((d) => d.disabled).map((d) => d.id);
  const rawScore = dimensions.reduce((sum, d) => sum + (d.score ?? 0), 0);
  const maxPossible = activeMax(callType, disabledIds);
  const percentage = normalise(rawScore, callType, disabledIds);
  const band = bandFor(percentage, callType);

  return {
    call_type: callType,
    dimensions,
    caps_fired: parsed.caps_fired ?? [],
    the_one_thing: parsed.the_one_thing,
    brief: parsed.brief,
    red_flags: parsed.red_flags ?? [],
    raw_score: rawScore,
    max_possible: maxPossible,
    percentage,
    band: band.name,
    band_blurb: band.blurb,
    evidence_check: verifyEvidence({ dimensions }, transcript),
  };
}