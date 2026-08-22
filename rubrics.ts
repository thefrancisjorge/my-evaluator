/**
 * Structural contract for both rubrics.
 *
 * This file holds the SHAPE of a valid evaluation: dimension ids, names,
 * weights, the discrete score buckets each dimension allows, the automatic
 * caps, and the bands. It is deliberately NOT the scoring guidance — the
 * full markdown rubric is what gets sent to the model. This file is what
 * validates whatever comes back, and what the UI renders.
 *
 * Keeping the two apart means a model that invents a dimension, interpolates
 * a score the rubric forbids, or ignores a cap gets caught before the run is
 * ever written to the database.
 */

export type CallType = 'coaching' | 'kickoff';

export interface DimensionSpec {
  id: string;
  n: number;
  name: string;
  pillar: string;
  points: number;
  /** Discrete values the rubric permits. Empty array = continuous 0..points. */
  buckets: number[];
  /** Dimension can be marked N/A and its weight removed from the total. */
  optional?: boolean;
  optionalReason?: string;
}

export interface CapSpec {
  id: string;
  condition: string;
  /** 'total' caps the whole score, 'dimension' caps one dimension. */
  kind: 'total' | 'dimension';
  /** Max points allowed once fired. */
  max: number;
  dimension?: string;
  nonRecoverable?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Coaching call — 12 dimensions                                      */
/* ------------------------------------------------------------------ */

export const COACHING_DIMENSIONS: DimensionSpec[] = [
  { id: 'checkin', n: 1, name: 'Check-in & connection', pillar: 'Connection', points: 10, buckets: [10, 7, 3, 0] },
  { id: 'diagnostics', n: 2, name: 'Diagnostics review', pillar: 'Value', points: 10, buckets: [10, 7, 3, 0], optional: true, optionalReason: 'Non-milestone call or no video submitted. Weight redistributes to D3 and D4.' },
  { id: 'vision', n: 3, name: 'Program focus + vision', pillar: 'Emotion', points: 15, buckets: [15, 10, 5, 0] },
  { id: 'movement', n: 4, name: 'Movement coaching quality', pillar: 'Support', points: 15, buckets: [15, 10, 5, 0], optional: true, optionalReason: 'No live movement coaching occurred on this call.' },
  { id: 'adjustments', n: 5, name: 'Adjustments & strategy', pillar: 'Goals', points: 10, buckets: [10, 7, 3, 0] },
  { id: 'actionsteps', n: 6, name: 'Action steps & accountability', pillar: 'Journey', points: 15, buckets: [15, 10, 5, 0] },
  { id: 'anchor', n: 7, name: 'Accountability anchor', pillar: 'Journey', points: 5, buckets: [5, 3, 0] },
  { id: 'struggle', n: 8, name: 'Struggle handling', pillar: 'Connection + Confidence', points: 5, buckets: [5, 3, 0] },
  { id: 'close', n: 9, name: 'Close quality', pillar: 'Confidence', points: 5, buckets: [5, 3, 0] },
  { id: 'booking', n: 10, name: 'Next call booking', pillar: 'Continuity', points: 5, buckets: [5, 0] },
  { id: 'continuity', n: 11, name: 'Continuity & follow-up clarity', pillar: 'Continuity', points: 5, buckets: [5, 3, 0] },
  { id: 'structure', n: 12, name: 'Structure & time management', pillar: 'Flow', points: 5, buckets: [5, 3, 0] },
];

export const COACHING_CAPS: CapSpec[] = [
  { id: 'no-booking', condition: 'Next call not booked live during the call', kind: 'dimension', dimension: 'booking', max: 0, nonRecoverable: true },
  { id: 'no-vision', condition: 'No connection to long-term vision at any point', kind: 'dimension', dimension: 'vision', max: 10 },
  { id: 'coach-monologue', condition: 'Coach speaks more than 75% of the call', kind: 'total', max: 75 },
  { id: 'no-commitment', condition: 'No concrete accountability commitment the client owns before close', kind: 'dimension', dimension: 'actionsteps', max: 10 },
  { id: 'struggle-ignored', condition: 'Client struggle present but ignored or avoided', kind: 'dimension', dimension: 'struggle', max: 0, nonRecoverable: true },
  { id: 'no-actions', condition: 'No action steps stated for either party before close', kind: 'total', max: 70 },
];

/* ------------------------------------------------------------------ */
/*  Kickoff call — a completely different 12                           */
/* ------------------------------------------------------------------ */

export const KICKOFF_DIMENSIONS: DimensionSpec[] = [
  { id: 'prep', n: 1, name: 'Pre-call preparation', pillar: 'Preparation', points: 10, buckets: [] },
  { id: 'rapport', n: 2, name: 'Rapport & tone', pillar: 'Connection', points: 10, buckets: [] },
  { id: 'agenda', n: 3, name: 'Agenda framing', pillar: 'Structure', points: 5, buckets: [] },
  { id: 'why', n: 4, name: 'Goal alignment & deep why', pillar: 'Emotion', points: 15, buckets: [] },
  { id: 'phases', n: 5, name: 'Program explanation (3 phases)', pillar: 'Belief', points: 10, buckets: [] },
  { id: 'journey', n: 6, name: 'Journey & expectation setting', pillar: 'Journey', points: 10, buckets: [] },
  { id: 'support', n: 7, name: 'Support system clarity', pillar: 'Support', points: 5, buckets: [] },
  { id: 'intelligence', n: 8, name: 'Coaching intelligence questions', pillar: 'Value', points: 10, buckets: [] },
  { id: 'nextsteps', n: 9, name: 'Next steps & diagnostics', pillar: 'Journey', points: 10, buckets: [] },
  { id: 'booking', n: 10, name: 'Booking next call', pillar: 'Continuity', points: 5, buckets: [] },
  { id: 'close', n: 11, name: 'Close, recap & confidence', pillar: 'Confidence', points: 5, buckets: [] },
  { id: 'postcall', n: 12, name: 'Post-call execution', pillar: 'Continuity', points: 5, buckets: [] },
];

export const KICKOFF_CAPS: CapSpec[] = [
  { id: 'no-followups', condition: 'No follow-up questions anywhere in the call', kind: 'total', max: 70 },
  { id: 'coach-monologue', condition: 'Coach speaks more than 70% of the time without client engagement', kind: 'total', max: 80 },
  { id: 'unresolved-confusion', condition: 'Client shows unresolved confusion at any point', kind: 'total', max: 75 },
  { id: 'no-northstar', condition: 'No North Star statement constructed', kind: 'dimension', dimension: 'why', max: 10 },
];

/* ------------------------------------------------------------------ */
/*  Bands — identical thresholds, different descriptions               */
/* ------------------------------------------------------------------ */

export type BandName = 'ELITE' | 'STRONG' | 'INCONSISTENT' | 'AT RISK' | 'FAIL';

export interface Band {
  name: BandName;
  min: number;
  blurb: string;
}

export const COACHING_BANDS: Band[] = [
  { name: 'ELITE', min: 90, blurb: 'Client feels seen, challenged, and connected to their future self. Referral and re-sign behaviour expected.' },
  { name: 'STRONG', min: 80, blurb: 'Good call with isolated weaknesses. Client satisfied but not deeply moved.' },
  { name: 'INCONSISTENT', min: 70, blurb: 'Technically present but emotionally flat. Retention risk building quietly.' },
  { name: 'AT RISK', min: 60, blurb: 'Weak client experience. Client may be doubting the process.' },
  { name: 'FAIL', min: 0, blurb: 'Core elements missing. Immediate coaching intervention required.' },
];

export const KICKOFF_BANDS: Band[] = [
  { name: 'ELITE', min: 90, blurb: 'Deep, clear, and the client confirms. Coach builds a real human relationship, not just process.' },
  { name: 'STRONG', min: 80, blurb: 'Clear and useful but lacks emotional depth or consistent reinforcement.' },
  { name: 'INCONSISTENT', min: 70, blurb: 'Technically correct but generic or surface-level in key areas.' },
  { name: 'AT RISK', min: 60, blurb: 'Weak client experience. Client may be doubting the program.' },
  { name: 'FAIL', min: 0, blurb: 'Missed core elements, major retention risk.' },
];

/* ------------------------------------------------------------------ */
/*  Accessors                                                          */
/* ------------------------------------------------------------------ */

export const RUBRIC = {
  coaching: { label: 'Coaching call', dimensions: COACHING_DIMENSIONS, caps: COACHING_CAPS, bands: COACHING_BANDS },
  kickoff: { label: 'Kickoff call', dimensions: KICKOFF_DIMENSIONS, caps: KICKOFF_CAPS, bands: KICKOFF_BANDS },
} as const;

/**
 * The coaching rubric's own weights sum to 105, not the 100 its prose claims
 * (10+10+15+15+10+15 plus six fives). The kickoff rubric sums to exactly 100.
 *
 * Rather than silently drop five points from an arbitrary dimension, every
 * score is normalised against the weights that are actually there. The rubric
 * already establishes this pattern for the disabled-D4 case: "The percentage
 * is the raw score over 85. Report the result on the 100 scale."
 *
 * So: percentage = raw / (sum of active weights) * 100, bands applied to the
 * percentage. Report both numbers so a reviewer can see the arithmetic.
 */
export function activeMax(callType: CallType, disabledIds: string[] = []): number {
  return RUBRIC[callType].dimensions
    .filter((d) => !disabledIds.includes(d.id))
    .reduce((sum, d) => sum + d.points, 0);
}

export function normalise(raw: number, callType: CallType, disabledIds: string[] = []): number {
  const max = activeMax(callType, disabledIds);
  return max === 0 ? 0 : Math.round((raw / max) * 1000) / 10;
}

export function bandFor(percentage: number, callType: CallType): Band {
  return RUBRIC[callType].bands.find((b) => percentage >= b.min) ?? RUBRIC[callType].bands[RUBRIC[callType].bands.length - 1];
}

/** Rejects a model response before it reaches the database. */
export function validateScores(
  callType: CallType,
  scores: { id: string; score: number | null }[]
): string[] {
  const spec = RUBRIC[callType].dimensions;
  const problems: string[] = [];

  for (const d of spec) {
    const got = scores.find((s) => s.id === d.id);
    if (!got) { problems.push(`Missing dimension: ${d.name}`); continue; }
    if (got.score === null) {
      if (!d.optional) problems.push(`${d.name} returned null but is not an optional dimension`);
      continue;
    }
    if (got.score < 0 || got.score > d.points) {
      problems.push(`${d.name} scored ${got.score}, outside 0–${d.points}`);
    }
    if (d.buckets.length && !d.buckets.includes(got.score)) {
      problems.push(`${d.name} scored ${got.score}; the rubric allows only ${d.buckets.join(', ')} — no interpolation`);
    }
  }

  const unknown = scores.filter((s) => !spec.some((d) => d.id === s.id));
  for (const u of unknown) problems.push(`Unknown dimension returned: ${u.id}`);

  return problems;
}