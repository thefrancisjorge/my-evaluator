'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../supabase';

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
.ce-section { padding: 110px 0; }
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
  transition: border-color .3s ease, background .3s ease;
}
.ce-nav.is-scrolled { border-bottom-color: var(--line); }
.ce-nav-inner {
  height: 100%; display: flex; align-items: center; justify-content: space-between;
  max-width: 980px; margin: 0 auto; padding: 0 22px;
}
.ce-mark { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.ce-mark span { color: var(--muted); font-weight: 400; }
.ce-nav-links { display: flex; align-items: center; gap: 26px; }
.ce-nav-links a {
  font-size: 12px; color: var(--ink); text-decoration: none; opacity: .82;
  transition: opacity .2s ease;
}
.ce-nav-links a:hover { opacity: 1; }
@media (max-width: 620px) { .ce-nav-links .ce-hide-sm { display: none; } }

/* hero */
.ce-hero { padding: 90px 0 70px; text-align: center; }
.ce-eyebrow {
  font-size: 19px; font-weight: 600; color: var(--blue);
  letter-spacing: -0.01em; margin: 0 0 8px;
}
.ce-h1 {
  font-size: clamp(38px, 7.2vw, 72px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  font-weight: 700;
  margin: 0 0 20px;
}
.ce-sub {
  font-size: clamp(17px, 2.4vw, 22px);
  line-height: 1.45;
  color: var(--muted);
  max-width: 640px;
  margin: 0 auto 34px;
  letter-spacing: -0.01em;
}
.ce-cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

/* buttons */
.ce-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 0; border-radius: 980px;
  padding: 12px 24px;
  font-size: 15px; font-weight: 500; letter-spacing: -0.01em;
  text-decoration: none; cursor: pointer;
  background: var(--blue); color: #fff;
  transition: background .2s ease, transform .2s ease, opacity .2s ease;
}
.ce-btn:hover { background: var(--blue-dark); }
.ce-btn:active { transform: scale(0.97); }
.ce-btn-ghost {
  background: transparent; color: var(--blue);
  box-shadow: inset 0 0 0 1px rgba(0,113,227,0.35);
}
.ce-btn-ghost:hover { background: rgba(0,113,227,0.06); }
.ce-btn-block { width: 100%; padding: 14px 24px; font-size: 16px; }
.ce-btn:disabled { background: #b8b8bd; cursor: not-allowed; }
.ce-btn:focus-visible, .ce-nav-links a:focus-visible, .ce-field:focus-visible,
.ce-row:focus-visible {
  outline: 2px solid var(--blue); outline-offset: 3px;
}

/* section heads */
.ce-h2 {
  font-size: clamp(28px, 4.4vw, 44px);
  line-height: 1.1; letter-spacing: -0.028em; font-weight: 700;
  margin: 0 0 14px; text-align: center;
}
.ce-lead {
  font-size: 17px; line-height: 1.5; color: var(--muted);
  text-align: center; max-width: 560px; margin: 0 auto 56px;
}

/* feature grid */
.ce-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 800px) { .ce-grid { grid-template-columns: 1fr; } }
.ce-card {
  background: var(--surface); border-radius: 18px; padding: 34px 30px;
  border: 1px solid var(--line);
  transition: transform .35s cubic-bezier(.25,.8,.35,1), box-shadow .35s ease;
}
.ce-card:hover { transform: translateY(-4px); box-shadow: 0 14px 40px rgba(0,0,0,0.07); }
.ce-card h3 { font-size: 19px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 8px; }
.ce-card p { font-size: 15px; line-height: 1.55; color: var(--muted); margin: 0; }
.ce-dot {
  width: 30px; height: 30px; border-radius: 9px; margin-bottom: 18px;
  display: grid; place-items: center;
  background: rgba(0,113,227,0.1); color: var(--blue);
}

/* tool panel */
.ce-panel {
  background: var(--surface); border-radius: 22px; padding: 40px;
  border: 1px solid var(--line);
  box-shadow: 0 20px 60px rgba(0,0,0,0.05);
}
@media (max-width: 620px) { .ce-panel { padding: 26px 20px; border-radius: 18px; } }
.ce-form { display: flex; flex-direction: column; gap: 22px; }
.ce-label {
  display: block; font-size: 12px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
}
.ce-field {
  width: 100%; padding: 13px 15px;
  border-radius: 12px; border: 1px solid var(--line);
  background: var(--surface-2);
  font-family: inherit; font-size: 16px; color: var(--ink);
  outline: none;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
.ce-field::placeholder { color: #a1a1a6; }
.ce-field:focus {
  background: var(--surface); border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(0,113,227,0.12);
}
textarea.ce-field { resize: vertical; min-height: 190px; line-height: 1.55; }
.ce-count { font-size: 12px; color: var(--muted); margin: 8px 0 0; text-align: right; }

/* report */
.ce-report { margin-top: 38px; padding-top: 32px; border-top: 1px solid var(--line); }
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
.ce-name { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 4px; }
.ce-role { font-size: 15px; color: var(--muted); margin: 0 0 26px; }

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
  (md || '')
    .replace(/[#*_>`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* ---------------------------------- page ---------------------------------- */

export default function Home() {
  const [callType, setCallType] = useState('Inbound Sales');
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState('');
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
      if (data.report) {
        setReport(data.report);
        fetchHistory();
      } else {
        setReport('The report could not be generated. Check the transcript and try again.');
      }
    } catch (err) {
      console.error(err);
      setReport('The evaluation could not be completed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <a href="#evaluator">Evaluate</a>
            <a className="ce-hide-sm" href="#history">History</a>
            <a href="#collab">Collab</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="ce-wrap ce-hero">
        <Reveal>
          <p className="ce-eyebrow">Call QA</p>
          <h1 className="ce-h1">
            Every call, scored.
            <br />
            In seconds.
          </h1>
          <p className="ce-sub">
            Paste a transcript. Get category scores, what went well, and a coaching plan your
            team can actually use.
          </p>
          <div className="ce-cta-row">
            <a className="ce-btn" href="#evaluator">Evaluate a call</a>
            <a className="ce-btn ce-btn-ghost" href="#how">See how it works</a>
          </div>
        </Reveal>
      </header>

      {/* How it works */}
      <section id="how" className="ce-band ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">Built for teams that review calls daily.</h2>
            <p className="ce-lead">
              Three things it does well, and nothing it doesn&apos;t need to do.
            </p>
          </Reveal>

          <div className="ce-grid">
            {[
              {
                icon: '↯',
                title: 'Scored in seconds',
                body: 'Category scoring, strengths, and a coaching plan generated from the full transcript.',
              },
              {
                icon: '✓',
                title: 'Saved automatically',
                body: 'Every evaluation is written to Supabase, so the history is there when you need to audit it.',
              },
              {
                icon: '⌘',
                title: 'Readable reports',
                body: 'Clean Markdown output with tables and headings. Open any past report in one tap.',
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <article className="ce-card">
                  <div className="ce-dot" aria-hidden="true">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Evaluator */}
      <section id="evaluator" className="ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">Evaluate a call.</h2>
            <p className="ce-lead">Paste the transcript below. The report appears right here.</p>
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
                </div>

                <div>
                  <label className="ce-label" htmlFor="transcript">Call transcript</label>
                  <textarea
                    id="transcript"
                    className="ce-field"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Agent: Thanks for calling, how can I help today?&#10;Customer: Hi, I&apos;m following up on my order…"
                  />
                  <p className="ce-count">
                    {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : 'No transcript yet'}
                  </p>
                </div>

                <button className="ce-btn ce-btn-block" type="submit" disabled={loading || !transcript.trim()}>
                  {loading ? 'Evaluating…' : 'Evaluate call'}
                </button>
              </form>

              {report && (
                <section className="ce-report">
                  <h3 className="ce-row-title" style={{ fontSize: 19, marginBottom: 14 }}>
                    Evaluation report
                  </h3>
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
      <section id="history" className="ce-band ce-anchor">
        <div className="ce-wrap ce-section">
          <Reveal>
            <h2 className="ce-h2">Recent evaluations.</h2>
            <p className="ce-lead">
              {history.length > 0
                ? `${history.length} report${history.length === 1 ? '' : 's'} saved. Open one to see the full breakdown.`
                : 'Reports show up here the moment they are saved.'}
            </p>
          </Reveal>

          <Reveal delay={80}>
            {history.length === 0 ? (
              <div className="ce-empty">
                Nothing saved yet. Run your first evaluation above and it will appear here.
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
                      <p className="ce-row-preview">{plainPreview(item.report)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </section>

      {/* Collab */}
      <section id="collab" className="ce-anchor">
        <div className="ce-wrap ce-section ce-collab">
          <Reveal>
            <div className="ce-avatar" aria-hidden="true">FJ</div>
            <h2 className="ce-h2" style={{ marginBottom: 18 }}>Let&apos;s collab.</h2>
            <p className="ce-name">Francis Jorge Asilum</p>
            <p className="ce-role">Builder of CallEvaluator.ai — open to projects and ideas.</p>
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