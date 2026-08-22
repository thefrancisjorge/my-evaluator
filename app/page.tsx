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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', color: '#111111' }}>
      
      {/* Navigation Bar */}
      <nav style={{ borderBottom: '1px solid #eaeaea', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '700', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          CallEvaluator<span style={{ color: '#666' }}>.ai</span>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#666', fontWeight: '500' }}>
          Production Ready v1.0
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ maxWidth: '800px', margin: '5rem auto 3rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '50px', backgroundColor: '#f5f5f5', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1.25rem', color: '#444', border: '1px solid #eaeaea' }}>
          ✨ Powered by Google Gemini & Supabase
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: '1.15', margin: '0 0 1.25rem 0' }}>
          Transform Call Transcripts Into Actionable QA Insights.
        </h1>
        <p style={{ color: '#666', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
          An enterprise-grade evaluation pipeline built for modern support and sales teams. Instant scoring, precise feedback, and automated tracking.
        </p>
        <a
          href="#evaluator-tool"
          style={{
            display: 'inline-block',
            backgroundColor: '#111111',
            color: '#ffffff',
            padding: '0.85rem 1.75rem',
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontWeight: '600',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
          }}
        >
          Start Evaluating ↓
        </a>
      </header>

      {/* Feature Highlights Grid */}
      <section style={{ maxWidth: '960px', margin: '2rem auto 5rem auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ padding: '1.75rem', borderRadius: '8px', border: '1px solid #eaeaea', backgroundColor: '#fafafa' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>⚡ Instant AI Analysis</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>Get comprehensive category scoring, strengths, and coaching plans generated in seconds.</p>
        </div>
        <div style={{ padding: '1.75rem', borderRadius: '8px', border: '1px solid #eaeaea', backgroundColor: '#fafafa' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>🔒 Persistent Logging</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>All evaluations are automatically saved to Supabase for easy auditing and history tracking.</p>
        </div>
        <div style={{ padding: '1.75rem', borderRadius: '8px', border: '1px solid #eaeaea', backgroundColor: '#fafafa' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>minimalist UI</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>Clean, distraction-free aesthetic with Markdown rendering and one-click report management.</p>
        </div>
      </section>

      {/* Main Interactive Tool Section */}
      <div id="evaluator-tool" style={{ maxWidth: '720px', width: '100%', margin: '0 auto 5rem auto', padding: '0 1.5rem', boxSizing: 'border-box' }}>
        <div style={{ border: '1px solid #eaeaea', borderRadius: '12px', padding: '2.5rem', backgroundColor: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>
              Live Call Evaluator
            </h2>
            <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
              Paste your transcript below to generate a professional evaluation report.
            </p>
          </div>

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
                }}
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
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.9rem 1.5rem',
                backgroundColor: loading ? '#888' : '#111111',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem',
              }}
            >
              {loading ? 'Analyzing Transcript...' : 'Evaluate Call'}
            </button>
          </form>

          {/* Generated Report Result */}
          {report && (
            <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eaeaea' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
                Evaluation Report
              </h3>
              <div style={{ padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
              </div>
            </section>
          )}
        </div>

        {/* History Section */}
        <section style={{ marginTop: '4rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
            Recent Evaluations History
          </h3>
          {history.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No evaluation records found yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((item) => (
                <li
                  key={item.id}
                  onClick={() => (window.location.href = `/evaluations/${item.id}`)}
                  style={{
                    padding: '1.1rem 1.25rem',
                    border: '1px solid #eaeaea',
                    borderRadius: '8px',
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
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #eaeaea', padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: 'auto' }}>
        Call Evaluator AI. Built with Next.js, Supabase, and Google Gemini.
      </footer>

    </div>
  );
}