'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RUBRIC, type CallType } from '@/lib/rubrics';

const BAND_COLOR: Record<string, string> = {
  ELITE: '#10b981', STRONG: '#2563eb', INCONSISTENT: '#d97706', 'AT RISK': '#ea580c', FAIL: '#dc2626',
};

interface HistoryRow {
  id: string;
  created_at: string;
  call_type: CallType | null;
  client: string | null;
  coach: string | null;
  status: string | null;
  result: any;
}

export default function HomePage() {
  const router = useRouter();
  const toolRef = useRef<HTMLDivElement>(null);

  const [callType, setCallType] = useState<CallType>('coaching');
  const [coach, setCoach] = useState('');
  const [client, setClient] = useState('');
  const [program, setProgram] = useState('');
  const [transcript, setTranscript] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, created_at, call_type, client, coach, status, result')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) console.error('Error fetching history:', error);
      if (data) setHistory(data as HistoryRow[]);
      setHistoryLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (transcript.trim().length < 200) {
      setError('Transcript is too short. Please paste a complete session conversation to run an accurate audit.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, callType, call_type: callType, coach, client, program }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Audit initialization failed (${res.status}).`);
      const id = data.id ?? data.evaluation_id ?? data.run_id;
      if (!id) throw new Error('Audit started, but no record ID was returned.');
      router.push(`/evaluations/${id}`);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      setSubmitting(false);
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const scrollToTool = () => toolRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="app-container">
      <style>{lightThemeCSS}</style>

      {/* Top Header / Navigation */}
      <header className="app-header">
        <div className="shell header-content">
          <div className="logo-group">
            <div className="logo-pulse" />
            <span className="logo-text">CallEval<span className="logo-badge">QA Hub</span></span>
          </div>
          <button onClick={scrollToTool} className="btn-header-action">+ New Call Audit</button>
        </div>
      </header>

      {/* Hero Intro */}
      <section className="hero-section">
        <div className="shell hero-inner">
          <span className="eyebrow-tag">Quality Assurance & Performance Tracking</span>
          <h1 className="hero-title">
            Real-time call scoring &<br />
            <span className="hero-subtitle-dim">actionable feedback for your team.</span>
          </h1>
          <p className="hero-desc">
            Upload recorded transcripts to evaluate adherence, engagement, and execution against your core program frameworks.
          </p>
        </div>
      </section>

      {/* Main Evaluator Tool */}
      <section className="shell tool-wrapper" ref={toolRef}>
        <div className="eval-card">
          <div className="card-section-title">
            <h2>1. Select Framework & Details</h2>
            <p>Choose the target evaluation rubric and assign session metadata.</p>
          </div>

          <div className="rubric-selector">
            {(['coaching', 'kickoff'] as const).map((t) => {
              const active = callType === t;
              return (
                <button key={t} onClick={() => setCallType(t)} className={`rubric-option ${active ? 'active' : ''}`}>
                  <div className="radio-indicator" />
                  <div className="rubric-details">
                    <span className="rubric-name">{RUBRIC[t].label} Framework</span>
                    <span className="rubric-specs">
                      {RUBRIC[t].dimensions.length} key metrics · {RUBRIC[t].dimensions.reduce((s, d) => s + d.points, 0)} max points
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="metadata-grid">
            <InputField label="Assigned Coach / Agent" value={coach} onChange={setCoach} placeholder="e.g. Coach Marcus" />
            <InputField label="Client / Prospect Name" value={client} onChange={setClient} placeholder="e.g. Sarah Jenkins" />
            <InputField label="Offer / Program Track" value={program} onChange={setProgram} placeholder="e.g. 12-Week Scaling Program" />
          </div>

          <div className="transcript-section-header">
            <div className="card-section-title" style={{ marginBottom: 0 }}>
              <h2>2. Session Transcript</h2>
              <p>Paste the raw meeting transcript or import from a file (.txt).</p>
            </div>
            <div className="transcript-tools">
              {wordCount > 0 && <span className={`word-count ${wordCount < 40 ? 'warning' : ''}`}>{wordCount.toLocaleString()} words</span>}
              <label className="file-upload-btn">
                Import Transcript File
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setTranscript(await file.text());
                      setError(null);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value); if (error) setError(null); }}
            placeholder={'[Coach]: How has your execution been this week?\n[Client]: Much better, completed all assigned action items.'}
            rows={12}
            className="transcript-textarea"
          />

          {error && <div className="error-banner">{error}</div>}

          <div className="action-footer">
            <button onClick={submit} disabled={submitting} className="btn-primary-eval">
              {submitting ? 'Running Quality Audit...' : `Generate ${callType === 'coaching' ? 'Coaching' : 'Kickoff'} Scorecard`}
            </button>
            {transcript && !submitting && (
              <button onClick={() => setTranscript('')} className="btn-text-clear">Clear Form</button>
            )}
          </div>
        </div>
      </section>

      {/* History Feed */}
      <section className="shell history-section">
        <div className="section-header-row">
          <h2>Recent Team Audits</h2>
          <p>Review completed scorecards, adherence gaps, and historical agent performance.</p>
        </div>

        {historyLoading ? (
          <div className="loading-skeletons">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton-row" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">No audits recorded yet. Run your first session assessment above.</div>
        ) : (
          <div className="history-list">
            {history.map((row) => {
              const res = typeof row.result === 'string' ? safeJsonParse(row.result) : row.result;
              const pct = typeof res?.percentage === 'number' ? res.percentage : null;
              const band: string = res?.band ?? '';
              const color = BAND_COLOR[band] ?? '#71717a';
              const isFailed = row.status === 'failed';
              const isDone = row.status === 'done' || !!res;

              return (
                <Link key={row.id} href={`/evaluations/${row.id}`} className="history-item">
                  <div className="score-ring-wrapper">
                    <svg viewBox="0 0 36 36" className="ring-svg">
                      <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      {pct !== null && (
                        <path
                          className="ring-fill"
                          stroke={color}
                          strokeDasharray={`${pct}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                    </svg>
                    <span className="ring-text" style={{ color: pct !== null ? color : '#71717a' }}>
                      {isFailed ? '!' : pct !== null ? Math.round(pct) : '·'}
                    </span>
                  </div>

                  <div className="history-info">
                    <span className="history-client-name">{row.client || 'Untitled Evaluation'}</span>
                    <span className="history-meta">
                      {row.call_type ? `${RUBRIC[row.call_type]?.label} Call` : 'Audit Scorecard'}
                      {row.coach && ` · Handled by ${row.coach}`}
                      {' · '}
                      {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {isFailed ? (
                    <span className="status-badge failed">Failed Audit</span>
                  ) : !isDone ? (
                    <span className="status-badge running"><span className="pulse-dot" />Analyzing...</span>
                  ) : band ? (
                    <span className="status-badge" style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
                      {band}
                    </span>
                  ) : null}

                  <span className="chevron-icon">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="shell app-footer">
        <p>Internal Quality Assurance & Performance Dashboard</p>
      </footer>
    </main>
  );
}

function safeJsonParse(v: string) {
  try { return JSON.parse(v); } catch { return null; }
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

const lightThemeCSS = `
.app-container {
  background-color: #f8fafc;
  color: #0f172a;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 80px;
}

.shell {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
}

.app-header {
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}
.logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-pulse {
  width: 9px;
  height: 9px;
  background-color: #2563eb;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
}
.logo-text {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: #0f172a;
}
.logo-badge {
  font-size: 10px;
  background: #eff6ff;
  color: #2563eb;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 600;
}
.btn-header-action {
  background: #0f172a;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 500;
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-header-action:hover {
  background: #1e293b;
}

.hero-section {
  padding: 50px 0 30px;
  text-align: left;
}
.eyebrow-tag {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #2563eb;
  margin-bottom: 10px;
  display: block;
}
.hero-title {
  font-size: clamp(28px, 3.5vw, 38px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0 0 14px 0;
  color: #0f172a;
}
.hero-subtitle-dim {
  color: #64748b;
}
.hero-desc {
  font-size: 15px;
  line-height: 1.6;
  color: #475569;
  max-width: 650px;
  margin: 0;
}

.tool-wrapper {
  margin-bottom: 50px;
}
.eval-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 36px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.card-section-title {
  margin-bottom: 24px;
}
.card-section-title h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #0f172a;
}
.card-section-title p {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
}

.rubric-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}
.rubric-option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}
.rubric-option:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.rubric-option.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.radio-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #94a3b8;
  margin-top: 2px;
  flex-shrink: 0;
  transition: all 0.2s;
}
.rubric-option.active .radio-indicator {
  border-color: #2563eb;
  box-shadow: inset 0 0 0 4px #2563eb;
}
.rubric-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}
.rubric-specs {
  display: block;
  font-size: 13px;
  color: #64748b;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e2e8f0;
}
.input-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}
.input-group input {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px 14px;
  color: #0f172a;
  font-size: 14px;
  transition: all 0.2s;
}
.input-group input:focus {
  outline: none;
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.input-group input::placeholder {
  color: #94a3b8;
}

.transcript-section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.transcript-tools {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: #64748b;
  padding-top: 4px;
}
.word-count.warning {
  color: #d97706;
  font-weight: 600;
}
.file-upload-btn {
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}
.file-upload-btn:hover {
  text-decoration: underline;
}
.file-upload-btn input {
  display: none;
}
.transcript-textarea {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 16px;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;
}
.transcript-textarea:focus {
  outline: none;
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.transcript-textarea::placeholder {
  color: #94a3b8;
}

.error-banner {
  margin-top: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
}

.action-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 28px;
}
.btn-primary-eval {
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
  font-size: 14.5px;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}
.btn-primary-eval:hover {
  background: #1d4ed8;
}
.btn-primary-eval:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-text-clear {
  background: transparent;
  color: #64748b;
  border: none;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
}
.btn-text-clear:hover {
  color: #0f172a;
}

.history-section {
  margin-top: 50px;
}
.section-header-row {
  margin-bottom: 18px;
}
.section-header-row h2 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}
.section-header-row p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}
.history-item:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.score-ring-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ring-svg {
  position: absolute;
  width: 40px;
  height: 40px;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: #e2e8f0;
  stroke-width: 3.5;
}
.ring-fill {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
}
.ring-text {
  font-size: 12px;
  font-weight: 700;
}

.history-info {
  flex: 1;
  min-width: 0;
}
.history-client-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-meta {
  display: block;
  font-size: 13px;
  color: #64748b;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.status-badge.failed {
  color: #dc2626;
  border-color: #fecaca;
  background: #fef2f2;
}
.status-badge.running {
  color: #d97706;
  border-color: #fde68a;
  background: #fffbeb;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pulse-dot {
  width: 6px;
  height: 6px;
  background-color: #d97706;
  border-radius: 50%;
  animation: pulse-kf 1.5s infinite;
}
@keyframes pulse-kf {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}

.chevron-icon {
  color: #94a3b8;
  font-size: 18px;
  transition: transform 0.2s;
}
.history-item:hover .chevron-icon {
  transform: translateX(4px);
  color: #2563eb;
}

.loading-skeletons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-row {
  height: 68px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.empty-state {
  font-size: 14px;
  color: #64748b;
  padding: 30px 0;
  text-align: center;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.app-footer {
  margin-top: 60px;
  border-top: 1px solid #e2e8f0;
  padding-top: 30px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
}

@media(max-width: 768px) {
  .metadata-grid, .rubric-selector {
    grid-template-columns: 1fr;
  }
}
`;