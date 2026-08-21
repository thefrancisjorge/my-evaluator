import fs from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { evaluateDimensionWithClaude } from "./llm.js";
import { verifyEvaluationPayload } from "./checker.js";
import { calculateNormalizedScore } from "./scoring.js";
import type { DimensionEvaluation } from "./types.js";

interface DimensionConfig {
  id: string;
  description: string;
}

const CONCURRENCY_LIMIT = 2;

async function runEvaluationPipeline(transcriptPath: string) {
  try {
    // 1. Load Dimensions Config
    const configPath = path.join(process.cwd(), "dimensions.json");
    const rawConfig = await fs.readFile(configPath, "utf-8");
    const dimensions: DimensionConfig[] = JSON.parse(rawConfig);

    // 2. Read Transcript
    const rawTranscript = await fs.readFile(transcriptPath, "utf-8");
    console.log(`\n--- Evaluating: ${path.basename(transcriptPath)} ---`);

    // 3. Batch Process LLM Evaluations
    const limit = pLimit(CONCURRENCY_LIMIT);
    const rawEvaluations = await Promise.all(
      dimensions.map((dim) =>
        limit(() => evaluateDimensionWithClaude(rawTranscript, dim.description))
      )
    );

    // 4. Grounding Verification
    const verifiedPayloads: DimensionEvaluation[] = [];
    for (const payload of rawEvaluations) {
      const verification = verifyEvaluationPayload(rawTranscript, payload);
      if (verification.isValid) {
        verifiedPayloads.push(verification.data!);
      } else {
        console.error(`❌ Grounding Error [${payload.dimensionId}]:`, verification.errors);
      }
    }

    if (verifiedPayloads.length === 0) {
      console.error("❌ No dimensions passed validation.");
      return;
    }

    // 5. Calculate Score & Export Individual Report
    const scoreData = calculateNormalizedScore(verifiedPayloads);
    const reportName = `evaluation_${path.basename(transcriptPath, ".txt")}.json`;
    const outputPath = path.join(process.cwd(), reportName);

    const outputReport = {
      timestamp: new Date().toISOString(),
      transcriptFile: path.basename(transcriptPath),
      metrics: scoreData,
      evaluations: verifiedPayloads,
    };

    await fs.writeFile(outputPath, JSON.stringify(outputReport, null, 2), "utf-8");
    console.log(`✅ Success! Written to ${reportName}`);
    console.log(scoreData);

  } catch (error) {
    console.error("Pipeline Execution Failure:", error);
  }
}

// I-run ang evaluation sa transcript.txt
runEvaluationPipeline("./transcript.txt");