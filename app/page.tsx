'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function HomePage() {
  const [callType, setCallType] = useState('Inbound Sales');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const handleEvaluate = async () => {
    if (!transcript.trim()) {
      setError('Please provide a call transcript.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType, transcript }),
      });

      let data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate call');
      }

      // Kung exact JSON string ang natanggap mula sa API, i-parse muna ito
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // Manatiling string kung hindi parsable bilang JSON
        }
      }

      // Kuhanin ang malinis na rawOutput text string
      const cleanMarkdown = typeof data === 'object' && data.rawOutput 
        ? data.rawOutput 
        : (typeof data === 'string' ? data : JSON.stringify(data));

      setResult(cleanMarkdown);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1>Call Evaluator AI</h1>
      <p style={{ color: '#666' }}>Paste a call transcript below to evaluate using Gemini AI.</p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Call Type</label>
        <input
          type="text"
          value={callType}
          onChange={(e) => setCallType(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Call Transcript</label>
        <textarea
          rows={10}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Agent: Hello...\nCustomer: Hi..."
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <button
        onClick={handleEvaluate}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Evaluating Call...' : 'Evaluate Call'}
      </button>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#ffe6e6', color: '#d8000c', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </main>
  );
}