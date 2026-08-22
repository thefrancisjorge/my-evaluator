"use client";

import { useState } from "react";

export default function HomePage() {
  const [transcript, setTranscript] = useState("");
  const [callType, setCallType] = useState("Inbound Sales");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, callType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to evaluate call");

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" }}>
      <h1>Call Evaluator AI</h1>
      <p style={{ color: "#666" }}>Paste a call transcript below to evaluate using Gemini AI.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Call Type
          </label>
          <input
            type="text"
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Call Transcript
          </label>
          <textarea
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Agent: Hello, thanks for calling...\nCustomer: Hi, I have a question about..."
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem", fontFamily: "monospace" }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Evaluating..." : "Evaluate Call"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: "2rem", color: "red", padding: "1rem", border: "1px solid red", borderRadius: "5px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "5px" }}>
          <h2>Evaluation Result</h2>
          <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}