'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../supabase';

export default function HomePage() {
  const [callType, setCallType] = useState('Inbound Sales');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  // Function para kunin ang evaluation history mula sa Supabase
  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // I-load ang history sa unang bukas ng page
  useEffect(() => {
    fetchHistory();
  }, []);

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate call');
      }

      // Kuhanin nang direkta ang rawOutput string mula sa JSON response
      let cleanResult = '';
      if (typeof data === 'string') {
        cleanResult = data;
      } else if (data && typeof data.rawOutput === 'string') {
        cleanResult = data.rawOutput;
      } else {
        cleanResult = String(data);
      }

      setResult(cleanResult);

      // I-refresh ang history list pagka-evaluate
      fetchHistory();
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
      )}

      {/* History Section */}
      <div style={{ marginTop: '4rem', borderTop: '2px solid #eaeaea', paddingTop: '2rem' }}>
        <h2>Recent Evaluations</h2>
        {history.length === 0 ? (
          <p style={{ color: '#666' }}>No history records found yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {history.map((item) => (
              <li 
                key={item.id} 
                onClick={() => {
                  setResult(item.report);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  border: '1px solid #eaeaea', 
                  borderRadius: '6px', 
                  backgroundColor: '#fafafa',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{item.call_type}</strong>
                  <small style={{ color: '#888' }}>{new Date(item.created_at).toLocaleString()}</small>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.report}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}