'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../supabase';

export default function Home() {
  const [callType, setCallType] = useState('Inbound Sales');
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setHistory(data);
    if (error) console.error('Error fetching history:', error);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setLoading(true);
    setReport('');

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType, transcript }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);

        // Save to Supabase
        await supabase.from('evaluations').insert([
          {
            call_type: callType,
            transcript: transcript,
            report: data.report,
          },
        ]);

        fetchHistory();
      } else {
        setReport('Failed to generate evaluation report.');
      }
    } catch (err) {
      console.error(err);
      setReport('An error occurred during evaluation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: '700', letterSpacing: '-0.03em', margin: '0 0 0.5rem 0', color: '#111' }}>
          Call Evaluator AI
        </h1>
        <p style={{ color: '#666', fontSize: '1rem', margin: 0, fontWeight: '400' }}>
          Analyze and score call transcripts instantly with structured AI feedback.
        </p>
      </header>

      {/* Evaluation Form */}
      <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
            Call Type
          </label>
          <input
            type="text"
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #eaeaea',
              fontSize: '0.95rem',
              backgroundColor: '#fafafa',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#111'}
            onBlur={(e) => e.target.style.borderColor = '#eaeaea'}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
            Call Transcript
          </label>
          <textarea
            rows={8}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste transcript here..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #eaeaea',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              backgroundColor: '#fafafa',
              boxSizing: 'border-box',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#111'}
            onBlur={(e) => e.target.style.borderColor = '#eaeaea'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: loading ? '#888' : '#111111',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            marginTop: '0.5rem',
          }}
        >
          {loading ? 'Evaluating...' : 'Evaluate Call'}
        </button>
      </form>

      {/* Generated Report Result */}
      {report && (
        <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eaeaea' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
            Latest Result
          </h2>
          <div style={{ padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#ffffff' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* History Section */}
      <section style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid #eaeaea' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
          Recent Evaluations
        </h2>
        {history.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No evaluation records found yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((item) => (
              <li
                key={item.id}
                onClick={() => (window.location.href = `/evaluations/${item.id}`)}
                style={{
                  padding: '1rem 1.25rem',
                  border: '1px solid #eaeaea',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#111';
                  e.currentTarget.style.backgroundColor = '#fafafa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#eaeaea';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#111' }}>{item.call_type}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.report}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}