'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase';

/* ---------------------------------- styles --------------------------------- */

const css = `
.ce {
  --ink: #1d1d1f;
  --muted: #6e6e73;
  --line: rgba(0,0,0,0.09);
  --surface: #ffffff;
  --surface-2: #f5f5f7;
  --blue: #0071e3;
  --blue-dark: #0060c8;

  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
    "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: var(--ink);
  background: var(--surface);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.ce *, .ce *::before, .ce *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }

/* layout */
.ce-wrap { width: 100%; max-width: 980px; margin: 0 auto; padding: 0 22px; }
.ce-section { padding: 104px 0; }
.ce-band { background: var(--surface-2); }
.ce-anchor { scroll-margin-top: 76px; }

/* nav */
.ce-nav {
  position: sticky; top: 0; z-index: 50;
  height: 48px;
  background: rgba(255,255,255,0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid transparent;
  transition: border-color .3s ease;
}
.ce-nav.is-scrolled { border-bottom-color: var(--line); }
.ce-nav-inner {
  height: 100%; display: flex; align-items: center; justify-content: space-between;
  max-width: 980px; margin: 0 auto; padding: 0 22px;
}
.ce-mark { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.ce-mark span { color: var(--muted); font-weight: 400; }
.ce-nav-links { display: flex; align-items: center; gap: 24px; }
.ce-nav-links a {
  font-size: 12px; color: var(--ink); text-decoration: none; opacity: .82;
  transition: opacity .2s ease;
}
.ce-nav-links a:hover { opacity: 1; }
@media (max-width: 680px) { .ce-nav-links .ce-hide-sm { display: none; } }

/* hero */
.ce-hero { padding: 88px 0 66px; text-align: center; }
.ce-eyebrow {
  font-size: 19px; font-weight: 600; color: var(--blue);
  letter-spacing: -0.01em; margin: 0 0 8px;
}
.ce-h1 {
  font-size: clamp(38px, 7vw, 68px);
  line-height: 1.06; letter-spacing: -0.035em; font-weight: 700;
  margin: 0 0 20px;
}
.ce-sub {
  font-size: clamp(17px, 2.4vw, 21px); line-height: 1.45; color: var(--muted);
  max-width: 660px; margin: 0 auto 34px; letter-spacing: -0.01em;
}
.ce-cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

/* buttons */
.ce-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 0; border-radius: 980px; padding: 12px 24px;
  font-family: inherit; font-size: 15px; font-weight: 500; letter-spacing: -0.01em;
  text-decoration: none; cursor: pointer;
  background: var(--blue); color: #fff;
  transition: background .2s ease, transform .2s ease;
}
.ce-btn:hover { background: var(--blue-dark); }
.ce-btn:active { transform: scale(0.97); }
.ce-btn-ghost {
  background: transparent; color: var(--blue);
  box-shadow: inset 0 0 0 1px rgba(0,113,227,0.35);
}
.ce-btn-ghost:hover { background: rgba(0,113,227,0.06); }
.ce-btn-block { width: 100%; padding: 14px 24px; font-size: 16px; }
.ce-btn:disabled { background: #b8b8bd; cursor: not-allowed; transform: none; }
.ce-btn:focus-visible, .ce-nav-links a:focus-visible, .ce-field:focus-visible,
.ce-row:focus-visible, .ce-chip:focus-visible {
  outline: 2px solid var(--blue); outline-offset: 3px;
}

/* section heads */
.ce-h2 {
  font-size: clamp(28px, 4.2vw, 42px);
  line-height: 1.12; letter-spacing: -0.028em; font-weight: 700;
  margin: 0 0 14px; text-align: center;
}
.ce-lead {
  font-size: 17px; line-height: 1.5; color: var(--muted);
  text-align: center; max-width: 600px; margin: 0 auto 56px;
}

/* steps */
.ce-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 820px) { .ce-steps { grid-template-columns: 1fr; } }
.ce-step {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 18px; padding: 30px 28px; height: 100%;
}
.ce-step-num {
  font-size: 12px; font-weight: 600; letter-spacing: .08em;
  color: var(--blue); margin: 0 0 14px;
}
.ce-step h3 { font-size: 19px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 8px; }
.ce-step p { font-size: 15px; line-height: 1.55; color: var(--muted); margin: 0; }

/* report breakdown */
.ce-split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 820px) { .ce-split { grid-template-columns: 1fr; } }
.ce-item {
  border-top: 1px solid var(--line); padding: 22px 0 4px;
}
.ce-item h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 6px; }
.ce-item p { font-size: 15px; line-height: 1.55; color: var(--muted); margin: 0; }

/* tool panel */
.ce-panel {
  background: var(--surface); border-radius: 22px; padding: 40px;
  border: 1px solid var(--line); box-shadow: 0 20px 60px rgba(0,0,0,0.05);
}
@media (max-width: 620px) { .ce-panel { padding: 26px 20px; border-radius: 18px; } }
.ce-form { display: flex; flex-direction: column; gap: 22px; }
.ce-label {
  display: block; font-size: 12px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
}
.ce-hint { font-size: 13px; color: var(--muted); margin: 8px 0 0; line-height: 1.45; }
.ce-field {
  width: 100%; padding: 13px 15px;
  border-radius: 12px; border: 1px solid var(--line);
  background: var(--surface-2);
  font-family: inherit; font-size: 16px; color: var(--ink); outline: none;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
.ce-field::placeholder { color: #a1a1a6; }
.ce-field:focus {
  background: var(--surface); border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(0,113,227,0.12);
}
textarea.ce-field { resize: vertical; min-height: 200px; line-height: 1.55; }
.ce-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.ce-chip {
  font-family: inherit; font-size: 13px; color: var(--muted);
  background: var(--surface-2); border: 1px solid var(--line);
  border-radius: 980px; padding: 6px 13px; cursor: pointer;
  transition: color .2s ease, border-color .2s ease, background .2s ease;
}
.ce-chip:hover { color: var(--ink); border-color: rgba(0,0,0,0.2); }
.ce-chip.is-active {
  background: rgba(0,113,227,0.08); border-color: rgba(0,113,227,0.4); color: var(--blue);
}

/* report */
.ce-report { margin-top: 38px; padding-top: 32px; border-top: 1px solid var(--line); }
.ce-report-head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
}
.ce-report-head h3 { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.ce-report-meta { font-size: 13px; color: var(--muted); }
.ce-report-body {
  background: var(--surface-2); border-radius: 16px; padding: 26px 28px;
  font-size: 15px; line-height: 1.62;
}
.ce-report-body h1, .ce-report-body h2, .ce-report-body h3 {
  letter-spacing: -0.02em; margin: 22px 0 8px; font-weight: 600;
}
.ce-report-body h1:first-child, .ce-report-body h2:first-child { margin-top: 0; }
.ce-report-body table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
.ce-report-body th, .ce-report-body td {
  border: 1px solid var(--line); padding: 9px 12px; text-align: left;
}
.ce-report-body th { background: rgba(0,0,0,0.03); font-weight: 600; }
.ce-report-body code {
  background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 5px; font-size: 13px;
}

/* history */
.ce-rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.ce-row {
  width: 100%; text-align: left; font-family: inherit;
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  padding: 18px 20px; cursor: pointer;
  transition: transform .2s ease, box-shadow .25s ease, border-color .2s ease;
}
.ce-row:hover {
  border-color: rgba(0,0,0,0.16); box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.ce-row-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 5px; }
.ce-row-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.ce-row-date { font-size: 12px; color: var(--muted); white-space: nowrap; }
.ce-row-preview {
  margin: 0; font-size: 14px; color: var(--muted); line-height: 1.45;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ce-empty {
  border: 1px dashed var(--line); border-radius: 14px; padding: 40px 24px;
  text-align: center; color: var(--muted); font-size: 15px;
}

/* collab */
.ce-collab { text-align: center; }
.ce-avatar {
  width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px;
  display: grid; place-items: center;
  background: linear-gradient(145deg, #1d1d1f, #4a4a4f);
  color: #fff; font-size: 20px; font-weight: 600; letter-spacing: -0.02em;
}
.ce-name { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 6px; }
.ce-role { font-size: 16px; color: var(--muted); margin: 0 auto 28px; max-width: 520px; line-height: 1.5; }

/* footer */
.ce-footer { border-top: 1px solid var(--line); padding: 34px 0; }
.ce-footer-inner {
  display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
  font-size: 12px; color: var(--muted);
}
.ce-footer a { color: var(--muted); text-decoration: none; }
.ce-footer a:hover { color: var(--ink); }

/* reveal */
.ce-reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s cubic-bezier(.22,.7,.3,1); }
.ce-reveal.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .ce-reveal { opacity: 1; transform: none; transition: none; }
  .ce *, .ce *::before, .ce *::after { transition-duration: .01ms !important; }
}
`;

/* --------------------------------- helpers -------------------------------- */

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ce-reveal${shown ? ' is-in' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const plainPreview = (md: string) =>
  (md || '').replace(/[#*_>`~\-]/g, ' ').replace(/\s+/g, ' ').trim();

const CALL_TYPES = [
  'Inbound Sales',
  'Outbound Sales',
  'Customer Support',
  'Technical Support',
  'Retention',
  'Collections',
];

const STEPS = [
  {
    n: 'Step 1',
    title: 'Name the call type',
    body: 'The call type is sent with the transcript, so the evaluation is judged against a sales call or a support call — not one generic standard.',
  },
  {
    n: 'Step 2',
    title: 'Paste the transcript',
    body: 'Any length, any format. Speaker labels help, but raw text works. Nothing is uploaded until you press Evaluate call.',
  },
  {
    n: 'Step 3',
    title: 'Read and keep the report',
    body: 'The report renders below the form, and the transcript is filed with it in the same record — so you can always read the feedback next to the call it came from.',
  },
];

const COVERAGE = [
  {
    title: 'An overall score out of 100',
    body: 'One number for the whole call, with a sentence explaining what drove it — enough to triage a stack of calls without opening each one.',
  },
  {
    title: 'A category table',
    body: 'Four to six categories scored out of 10 with a note each. The categories are chosen to fit the call type, so a support call is not graded on closing technique.',
  },
  {
    title: 'What went well, quoted',
    body: 'Each strength cites the actual line from the transcript, so the agent can hear the moment again instead of taking the praise on faith.',
  },
  {
    title: 'What was missed, with a fix',
    body: 'Every gap names where it belonged in the call and gives the better alternative — the wording the agent should have used instead.',
  },
  {
    title: 'Three actions to practise',
    body: 'The report closes with a numbered coaching plan a team lead can hand over as-is before the agent takes their next call.',
  },
  {
    title: 'The call kept with the review',
    body: 'Transcript, report, call type, and timestamp are saved as one record, each with its own page at /evaluations/[id] you can link to or revisit.',
  },
];

/* ---------------------------------- page ---------------------------------- */

export default function Home() {
  const [callType, setCallType] = useState('Inbound Sales');
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState('');
  const [reportType, setReportType] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

      if (res.ok && data.report) {
        setReport(data.report);
        setReportType(callType);
        fetchHistory();
      } else {
        setReport(
          data.error
            ? `**The evaluation did not run.**\n\n${data.error}`
            : '**The evaluation did not run.** Check the transcript and try again.'
        );
        setReportType(callType);
      }
    } catch (err) {
      console.error(err);
      setReport(
        '**The evaluation could not be completed.** The server did not respond. Check your connection and try again.'
      );
      setReportType(callType);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div className="ce">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Nav */}
      <nav className={`ce-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="ce-nav-inner">
          <div className="ce-mark">
            CallEvaluator<span>.ai</span>
          </div>
          <div className="ce-nav-links">
            <a className="ce-hide-sm" href="#how">How it works</a>
            <a className="ce-hide-sm" href="#report">The report</a>
            <a href="#evaluator">Evaluate</a>
            <a href="#history">History</a>
            <a href="#collab">Collab</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="ce-wrap ce-hero">
        <Reveal>
          <p className="ce-eyebrow">Call QA</p>
          <h1 className="ce-h1">
            Turn a transcript
            <br />
            into coaching.
          </h1>
          <p className="ce-sub">
            Paste any call transcript and get a scored evaluation back — what the agent did well,
            what was missed, and what to work on next. Every report is saved, so a month of calls
            becomes a record you can look back on.
          </p>
          <div className="ce-cta-row">
            <a className="ce-btn" href="#evaluator">Evaluate a call</a>
            <a className="ce-btn ce-btn-ghost" href="#how">How it works</a>
          </div>
        </Reveal>
      </header>

      {/* How it works */}
      <section id="how" className="ce-band ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">Three steps, about a minute.</h2>
            <p className="ce-lead">
              No setup, no template to configure. The call type and the transcript are the only
              two things it needs.
            </p>
          </Reveal>

          <div className="ce-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <article className="ce-step">
                  <p className="ce-step-num">{s.n.toUpperCase()}</p>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What the report covers */}
      <section id="report" className="ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">What comes back.</h2>
            <p className="ce-lead">
              Every report comes back in the same five sections, so two calls from two agents
              can actually be compared side by side.
            </p>
          </Reveal>

          <div className="ce-split">
            {COVERAGE.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 70}>
                <div className="ce-item">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Evaluator */}
      <section id="evaluator" className="ce-band ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">Evaluate a call.</h2>
            <p className="ce-lead">The report appears below the form and saves itself.</p>
          </Reveal>

          <Reveal delay={80}>
            <div className="ce-panel">
              <form className="ce-form" onSubmit={handleEvaluate}>
                <div>
                  <label className="ce-label" htmlFor="callType">Call type</label>
                  <input
                    id="callType"
                    className="ce-field"
                    type="text"
                    value={callType}
                    onChange={(e) => setCallType(e.target.value)}
                    placeholder="Inbound Sales"
                  />
                  <div className="ce-chips">
                    {CALL_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`ce-chip${callType === t ? ' is-active' : ''}`}
                        onClick={() => setCallType(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="ce-hint">
                    Type your own if none of these fit. Whatever is in this field is what the
                    evaluation is measured against.
                  </p>
                </div>

                <div>
                  <label className="ce-label" htmlFor="transcript">Call transcript</label>
                  <textarea
                    id="transcript"
                    className="ce-field"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder={
                      'Agent: Thanks for calling, how can I help today?\n' +
                      'Customer: Hi, I\u2019m following up on my order from last week\u2026'
                    }
                  />
                  <p className="ce-hint" style={{ textAlign: 'right' }}>
                    {wordCount > 0 ? `${wordCount.toLocaleString()} words` : 'No transcript yet'}
                  </p>
                </div>

                <button
                  className="ce-btn ce-btn-block"
                  type="submit"
                  disabled={loading || !transcript.trim()}
                >
                  {loading ? 'Evaluating\u2026' : 'Evaluate call'}
                </button>
              </form>

              {report && (
                <section className="ce-report">
                  <div className="ce-report-head">
                    <h3>Evaluation report</h3>
                    <span className="ce-report-meta">
                      {reportType} · {new Date().toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="ce-report-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                  </div>
                </section>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* History */}
      <section id="history" className="ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">Everything you have run.</h2>
            <p className="ce-lead">
              {history.length > 0
                ? `${history.length} report${history.length === 1 ? '' : 's'} saved. Open one to read the full breakdown.`
                : 'Reports appear here the moment they are saved, newest first.'}
            </p>
          </Reveal>

          <Reveal delay={80}>
            {history.length === 0 ? (
              <div className="ce-empty">
                Nothing saved yet. Run your first evaluation above and it will show up here.
              </div>
            ) : (
              <ul className="ce-rows">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      className="ce-row"
                      type="button"
                      onClick={() => (window.location.href = `/evaluations/${item.id}`)}
                    >
                      <div className="ce-row-top">
                        <span className="ce-row-title">{item.call_type}</span>
                        <span className="ce-row-date">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {/* Pinalitan ang item.report ng item.report_json para lumitaw na ang preview */}
                      <p className="ce-row-preview">{plainPreview(item.report_json)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </section>

      {/* Collab */}
      <section id="collab" className="ce-band ce-anchor">
        <div className="ce-wrap ce-section ce-collab">
          <Reveal>
            <div className="ce-avatar" aria-hidden="true">FJ</div>
            <h2 className="ce-h2" style={{ marginBottom: 18 }}>Let&apos;s collab.</h2>
            <p className="ce-name">Francis Jorge Asilum</p>
            <p className="ce-role">
              I built CallEvaluator.ai and I&apos;m open to working on similar tools — QA
              workflows, internal dashboards, anything that turns messy text into something a team
              can act on. Message me and let&apos;s talk.
            </p>
            <a
              className="ce-btn"
              href="https://www.linkedin.com/in/thefrancisjorge/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Connect on LinkedIn →
            </a>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="ce-footer">
        <div className="ce-wrap ce-footer-inner">
          <span>© {new Date().getFullYear()} CallEvaluator.ai — Francis Jorge Asilum</span>
          <span>
            Next.js · Supabase · Google Gemini ·{' '}
            <a href="https://www.linkedin.com/in/thefrancisjorge/" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}