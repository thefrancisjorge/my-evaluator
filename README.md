# Bievermind Coaching Call Transcript Evaluator

A robust, production-ready transcript evaluation pipeline built with TypeScript and Node.js. It leverages Google Gemini (`gemini-3.6-flash`) to perform deterministic quality assurance scoring on coaching calls, enforcing strict grounding verification and concurrency controls.

## Key Features

- **Deterministic Evaluation:** Scores criteria against custom configurations.
- **Strict Grounding:** Verifies exact quote string matches and line index alignment to prevent hallucinations.
- **Resilience & Rate Limiting:** Utilizes `p-retry` for API call retries and `p-limit` for concurrency control.
- **JSON Reporting:** Generates structured evaluation summaries exported directly to JSON files.

## Project Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/thefrancisjorge/my-evaluator.git](https://github.com/thefrancisjorge/my-evaluator.git)
   cd my-evaluator