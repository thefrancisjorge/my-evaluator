'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RUBRIC, type CallType } from '@/lib/rubrics';

const BAND_COLOR: Record<string, string> = {
  ELITE: '#30D158', STRONG: '#0A84FF', INCONSISTENT: '#FFD60A', 'AT RISK': '#FF9F0A', FAIL: '#FF453A',
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
      setError('Transcript is too short. Please provide a complete session transcript.');
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
      if (!res.ok) throw new Error(data?.error || `Evaluation failed to start (${res.status}).`);
      const id = data.id ?? data.evaluation_id ?? data.run_id;
      if (!id) throw new Error('Evaluation started, but no ID was returned.');
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
      <style>{professionalCSS}</style>

      {/* Top Header / Navigation */}
      <header className="app-header">
        <div className="shell header-content">
          <div className="logo-group">
            <div className="logo-pulse" />
            <span className="logo-text">CallEval<span className="logo-badge">Pro</span></span>
          </div>
          <button onClick={scrollToTool} className="btn-header-action">New Evaluation</button>
        </div>
      </header>

      {/* Hero Intro */}
      <section className="hero-section">
        <div className="shell hero-inner">
          <span className="eyebrow-tag">Precision Call Auditing</span>
          <h1 className="hero-title">
            Objective coaching evaluations,<br />
            <span className="hero-subtitle-dim">backed by verbatim proof.</span>
          </h1>
          <p className="hero-desc">
            Analyze recorded transcripts across 12 strict dimensions. Enforce automated caps, 
            tier buckets, and evidence-based grading instantly.
          </p>
        </div>
      </section>

      {/* Main Evaluator Tool */}
      <section className="shell tool-wrapper" ref={toolRef}>
        <div className="eval-card">
          <div className="card-section-title">
            <h2>Evaluation Parameters</h2>
            <p>Select rubric configuration and enter session metadata.</p>
          </div>

          <div className="rubric-selector">
            {(['coaching', 'kickoff'] as const).map((t) => {
              const active = callType === t;
              return (
                <button key={t} onClick={() => setCallType(t)} className={`rubric-option ${active ? 'active' : ''}`}>
                  <div className="radio-indicator" />
                  <div className="rubric-details">
                    <span className="rubric-name">{RUBRIC[t].label}</span>
                    <span className="rubric-specs">
                      {RUBRIC[t].dimensions.length} dimensions · {RUBRIC[t].dimensions.reduce((s, d) => s + d.points, 0)} pts
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="metadata-grid">
            <InputField label="Coach Name" value={coach} onChange={setCoach} placeholder="e.g. Marcus Vance" />
            <InputField label="Client Name" value={client} onChange={setClient} placeholder="e.g. Sarah Jenkins" />
            <InputField label="Program Track" value={program} onChange={setProgram} placeholder="e.g. Elite Physique 12W" />
          </div>

          <div className="transcript-header">
            <label className="input-label">Session Transcript</label>
            <div className="transcript-tools">
              {wordCount > 0 && <span className={`word-count ${wordCount < 40 ? 'warning' : ''}`}>{wordCount.toLocaleString()} words</span>}
              <label className="file-upload-btn">
                Import .txt
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
            placeholder={'[Coach]: How has your performance felt this week?\n[Client]: Much better, especially with consistency.'}
            rows={12}
            className="transcript-textarea"
          />

          {error && <div className="error-banner">{error}</div>}

          <div className="action-footer">
            <button onClick={submit} disabled={submitting} className="btn-primary-eval">
              {submitting ? 'Analyzing Transcript...' : `Run ${callType} Evaluation`}
            </button>
            {transcript && !submitting && (
              <button onClick={() => setTranscript('')} className="btn-text-clear">Clear Input</button>
            )}
          </div>
        </div>
      </section>

      {/* History Feed */}
      <section className="shell history-section">
        <div className="section-header-row">
          <h2>Recent Evaluations</h2>
          <p>Access audit trails and detailed dimension breakdowns.</p>
        </div>

        {historyLoading ? (
          <div className="loading-skeletons">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton-row" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">No evaluations recorded yet. Run your first assessment above.</div>
        ) : (
          <div className="history-list">
            {history.map((row) => {
              const res = typeof row.result === 'string' ? safeJsonParse(row.result) : row.result;
              const pct = typeof res?.percentage === 'number' ? res.percentage : null;
              const band: string = res?.band ?? '';
              const color = BAND_COLOR[band] ?? '#8E8E93';
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
                    <span className="ring-text" style={{ color: pct !== null ? color : '#8E8E93' }}>
                      {isFailed ? '!' : pct !== null ? Math.round(pct) : '·'}
                    </span>
                  </div>

                  <div className="history-info">
                    <span className="history-client-name">{row.client || 'Untitled Evaluation'}</span>
                    <span className="history-meta">
                      {row.call_type ? RUBRIC[row.call_type]?.label : 'Standard Audit'}
                      {row.coach && ` · ${row.coach}`}
                      {' · '}
                      {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {isFailed ? (
                    <span className="status-badge failed">Failed</span>
                  ) : !isDone ? (
                    <span className="status-badge running"><span className="pulse-dot" />Running</span>
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
        <p>Enterprise Coaching Audit Platform · Secure Verbatim Tracking</p>
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

const professionalCSS = `
.app-container {
  background-color: #09090b;
  color: #f4f4f5;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 80px;
}

.shell {
  max-width: 880px;
  margin: 0 auto;
  padding: 0 20px;
}

.app-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 9, 11, 0.85);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-pulse {
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
}
.logo-text {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: #ffffff;
}
.logo-badge {
  font-size: 10px;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 500;
}
.btn-header-action {
  background: #ffffff;
  color: #09090b;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-header-action:hover {
  opacity: 0.9;
}

.hero-section {
  padding: 60px 0 40px;
  text-align: left;
}
.eyebrow-tag {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3b82f6;
  margin-bottom: 12px;
  display: block;
}
.hero-title {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 16px 0;
  color: #ffffff;
}
.hero-subtitle-dim {
  color: #71717a;
}
.hero-desc {
  font-size: 15px;
  line-height: 1.6;
  color: #a1a1aa;
  max-width: 620px;
  margin: 0;
}

.tool-wrapper {
  margin-bottom: 60px;
}
.eval-card {
  background: #121215;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
.card-section-title h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #ffffff;
}
.card-section-title p {
  font-size: 13px;
  color: #71717a;
  margin: 0 0 20px 0;
}

.rubric-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}
.rubric-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}
.rubric-option:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
}
.rubric-option.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}
.radio-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #52525b;
  margin-top: 2px;
  flex-shrink: 0;
  transition: all 0.2s;
}
.rubric-option.active .radio-indicator {
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 3px #3b82f6;
}
.rubric-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 2px;
}
.rubric-specs {
  display: block;
  font-size: 12px;
  color: #71717a;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.input-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
  margin-bottom: 6px;
}
.input-group input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px 12px;
  color: #f4f4f5;
  font-size: 13.5px;
  transition: border-color 0.2s;
}
.input-group input:focus {
  outline: none;
  border-color: #3b82f6;
}
.input-group input::placeholder {
  color: #3f3f46;
}

.transcript-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.input-label {
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
}
.transcript-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #71717a;
}
.word-count.warning {
  color: #f59e0b;
}
.file-upload-btn {
  color: #3b82f6;
  font-weight: 500;
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
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px;
  color: #f4f4f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s;
}
.transcript-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}
.transcript-textarea::placeholder {
  color: #3f3f46;
}

.error-banner {
  margin-top: 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}

.action-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}
.btn-primary-eval {
  background: #3b82f6;
  color: #ffffff;
  font-weight: 500;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary-eval:hover {
  background: #2563eb;
}
.btn-primary-eval:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-text-clear {
  background: transparent;
  color: #71717a;
  border: none;
  font-size: 13px;
  cursor: pointer;
}
.btn-text-clear:hover {
  color: #f4f4f5;
}

.history-section {
  margin-top: 40px;
}
.section-header-row {
  margin-bottom: 16px;
}
.section-header-row h2 {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 4px 0;
}
.section-header-row p {
  font-size: 13px;
  color: #71717a;
  margin: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #121215;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}
.history-item:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: #18181b;
}

.score-ring-wrapper {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ring-svg {
  position: absolute;
  width: 36px;
  height: 36px;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 3;
}
.ring-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}
.ring-text {
  font-size: 11px;
  font-weight: 600;
}

.history-info {
  flex: 1;
  min-width: 0;
}
.history-client-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-meta {
  display: block;
  font-size: 12px;
  color: #71717a;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-transform: uppercase;
}
.status-badge.failed {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
}
.status-badge.running {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}
.pulse-dot {
  width: 5px;
  height: 5px;
  background-color: #f59e0b;
  border-radius: 50%;
  animation: pulse-kf 1.5s infinite;
}
@keyframes pulse-kf {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}

.chevron-icon {
  color: #52525b;
  font-size: 16px;
  transition: transform 0.2s;
}
.history-item:hover .chevron-icon {
  transform: translateX(3px);
  color: #a1a1aa;
}

.loading-skeletons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-row {
  height: 60px;
  background: #121215;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.empty-state {
  font-size: 13px;
  color: #71717a;
  padding: 24px 0;
}

.app-footer {
  margin-top: 60px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 24px;
  text-align: center;
  font-size: 12px;
  color: #71717a;
}

@media(max-width: 768px) {
  .metadata-grid, .rubric-selector {
    grid-template-columns: 1fr;
  }
}
`;