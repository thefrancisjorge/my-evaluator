import { z } from "zod";

export const EvidenceSchema = z.object({
  quote: z.string(),
  lineStart: z.number().optional(),
});

export const DimensionEvaluationSchema = z.object({
  dimensionId: z.string(),
  score: z.number().min(0).max(5),
  reasoning: z.string(),
  evidence: z.array(EvidenceSchema),
  quickFix: z.string().optional(),
  notEvidenced: z.boolean(),
});

export type DimensionEvaluation = z.infer<typeof DimensionEvaluationSchema>;