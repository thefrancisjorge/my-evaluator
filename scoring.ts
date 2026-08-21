import type { DimensionEval } from "./types.js";

export interface ScoreBreakdown {
  rawTotalPoints: number;
  maxPossiblePoints: number;
  finalPercentageScore: number;
}

export function calculateNormalizedScore(evaluations: DimensionEval[]): ScoreBreakdown {
  let rawTotalPoints = 0;
  let maxPossiblePoints = 0;

  for (const item of evaluations) {
    // Skip dimensions marked as not evidenced / non-applicable
    if (item.notEvidenced) continue;

    // Standard scoring assuming max 5 points per active dimension
    rawTotalPoints += item.score;
    maxPossiblePoints += 5;
  }

  // Prevent divide-by-zero if no dimensions were applicable
  if (maxPossiblePoints === 0) {
    return { rawTotalPoints: 0, maxPossiblePoints: 0, finalPercentageScore: 0 };
  }

  // Calculate percentage normalized strictly to a 100-point scale
  const finalPercentageScore = Math.round((rawTotalPoints / maxPossiblePoints) * 100);

  return {
    rawTotalPoints,
    maxPossiblePoints,
    finalPercentageScore,
  };
}