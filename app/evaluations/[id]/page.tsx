'use client';

import { useEffect, useMemo, useState, use, type ReactNode } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RUBRIC, type CallType } from '@/lib/rubrics';

interface Dim {
  id: string;
  score: number | null;
  disabled: boolean;
  disabled_reason: string | null;
  reasoning: string;
  evidence: string[];
  evidence_absent: boolean;
  quick_fix: string;
}

interface Result {
  call_type: CallType;
  dimensions: Dim[];
  caps_fired: { id: string; explanation: string }[];
  the_one_thing: { change: string; why: string; score_with_it: number };
  brief: string;
  red_flags: { flag: string; why: string; severity: 'low' | 'medium' | 'high' }[];
  raw_score: number;
  max_possible: number;
  percentage: number;
  band: string;
  band_blurb: string;
  evidence_check: { total: number; verified: number; unverified: string[] };
}

const BAND_HEX: Record<string, string> = {
  ELITE: '#1B7A5A', STRONG: '#2F6FA8', INCONSISTENT: '#A8761B', 'AT RISK': '#B8531F', FAIL: '#A32F2F',
};

const toneHex = (pct: number) => (pct >= 85 ? '#1B7A5A' : pct >= 65 ? '#A8761B' : '#A32F2F');

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [row, setRow] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'running' | 'failed'>('loading');
  const [open, setOpen] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fields the operator can correct without re-running the evaluation.
  const [coach, setCoach] = useState('');
  const [client, setClient] = useState('');
  const [program, setProgram] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stop = false;

    const load = async () => {
      const { data, error } = await supabase.from('evaluations').select('*').eq('id', id).single();
      if (stop) return;
      if (error || !data) { setState('missing'); return; }

      setRow(data);
      setCoach(data.coach ?? '');
      setClient(data.client ?? '');
      setProgram(data.program ?? '');

      if (data.status === 'failed') setState('failed');
      else if (data.status === 'done' || data.result) setState('ready');
      else { setState('running'); setTimeout(load, 3000); }
    };

    load();
    return () => { stop = true; };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const result: Result | null = useMemo(() => {
    if (!row?.result) return null;
    return typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
  }, [row]);

  const spec = result ? RUBRIC[result.call_type] : null;

  const saveFields = async () => {
    setSaving(true);
    const { error } = await supabase.from('evaluations').update({ coach, client, program }).eq('id', id);
    setSaving(false);
    setToast(error ? 'Could not save' : 'Saved');
  };

  const downloadPDF = async () => {
    setPdfBusy(true);
    try {
      const el = document.getElementById('print-sheet');
      if (!el) throw new Error('print sheet missing');
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .from(el)
        .set({
          margin: [0.5, 0.5, 0.6, 0.5],
          filename: `${(client || 'call').replace(/\s+/g, '-').toLowerCase()}-evaluation.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .save();
    } catch (e) {
      console.error(e);
      setToast('PDF export failed');
    } finally {
      setPdfBusy(false);
    }
  };

  /* ---------------- non-ready states ---------------- */

  if (state === 'loading') {
    return <Shell><div className="h-6 w-40 bg-stone-200 animate-pulse rounded" /><div className="mt-6 h-24 w-full bg-stone-100 animate-pulse rounded" /></Shell>;
  }

  if (state === 'missing') {
    return (
      <Shell>
        <h1 className="text-2xl font-medium tracking-tight">This run doesn&apos;t exist</h1>
        <p className="mt-2 text-stone-500">The link points to an id that was never created, or the run was deleted.</p>
        <Link href="/" className="mt-6 inline-block bg-stone-900 text-white text-sm px-4 py-2 rounded">Evaluate a call</Link>
      </Shell>
    );
  }

  if (state === 'running') {
    return (
      <Shell>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h1 className="text-2xl font-medium tracking-tight">Still scoring</h1>
        </div>
        <p className="mt-2 text-stone-500 max-w-md">
          This page refreshes itself. You can close the tab — the run finishes without you and this link will hold the result.
        </p>
        <p className="mt-4 text-xs font-mono text-stone-400">run {id.slice(0, 8)}</p>
      </Shell>
    );
  }

  if (state === 'failed' || !result) {
    return (
      <Shell>
        <h1 className="text-2xl font-medium tracking-tight text-red-800">This run failed</h1>
        <pre className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-900 whitespace-pre-wrap">
          {row?.error || 'No reason was recorded.'}
        </pre>
        <Link href="/" className="mt-6 inline-block bg-stone-900 text-white text-sm px-4 py-2 rounded">Try another transcript</Link>
      </Shell>
    );
  }

  /* ---------------- report ---------------- */

  const bandColor = BAND_HEX[result.band] ?? '#57534E';
  const fabricated = result.evidence_check.total - result.evidence_check.verified;

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <div className="max-w-3xl mx-auto px-6 pb-24">

        <div className="flex items-center justify-between py-5 border-b border-stone-200">
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">All runs</Link>
          <div className="flex items-center gap-4">
            <button onClick={downloadPDF} disabled={pdfBusy} className="text-sm text-stone-500 hover:text-stone-900 disabled:opacity-40">
              {pdfBusy ? 'Preparing…' : 'Download PDF'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied'); }} className="text-sm text-stone-500 hover:text-stone-900">
              Share link
            </button>
          </div>
        </div>

        {/* score */}
        <header className="pt-14 pb-10">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{spec?.label}</p>
          <div className="flex items-end gap-6 mt-5">
            <div className="text-[76px] leading-none font-medium tracking-tight tabular-nums" style={{ color: bandColor }}>
              {Math.round(result.percentage)}
            </div>
            <div className="pb-3">
              <div className="text-sm font-medium tracking-wide" style={{ color: bandColor }}>{result.band}</div>
              <div className="text-xs text-stone-400 font-mono mt-1">{result.raw_score} of {result.max_possible} points</div>
            </div>
          </div>
          <div className="h-px bg-stone-200 mt-6 relative">
            <div className="absolute inset-y-0 left-0" style={{ width: `${result.percentage}%`, height: '2px', top: '-0.5px', background: bandColor }} />
          </div>
          <p className="mt-4 text-sm text-stone-500 max-w-lg">{result.band_blurb}</p>
        </header>

        {/* metadata fields */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-10 border-b border-stone-200">
          <Field label="Coach" value={coach} onChange={setCoach} />
          <Field label="Client" value={client} onChange={setClient} />
          <Field label="Program" value={program} onChange={setProgram} />
          <div className="sm:col-span-3">
            <button onClick={saveFields} disabled={saving} className="text-xs text-stone-500 hover:text-stone-900 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </section>

        {/* evidence integrity */}
        <div className="flex items-center gap-2 py-4 text-xs border-b border-stone-200">
          <span className={`w-1.5 h-1.5 rounded-full ${fabricated === 0 ? 'bg-emerald-600' : 'bg-red-600'}`} />
          <span className="text-stone-500">
            {result.evidence_check.verified} of {result.evidence_check.total} quoted lines found verbatim in the transcript
            {fabricated > 0 && <span className="text-red-700 font-medium"> — {fabricated} could not be located</span>}
          </span>
        </div>

        {/* caps */}
        {result.caps_fired.length > 0 && (
          <section className="py-8 border-b border-stone-200">
            <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-4">Caps applied</h2>
            {result.caps_fired.map((c) => {
              const cap = spec?.caps.find((x) => x.id === c.id);
              return (
                <div key={c.id} className="py-3 border-l-2 border-amber-500 pl-4 mb-2">
                  <div className="text-sm font-medium">{cap?.condition ?? c.id}</div>
                  <div className="text-sm text-stone-500 mt-0.5">{c.explanation}</div>
                </div>
              );
            })}
          </section>
        )}

        {/* the one thing */}
        <section className="py-10 border-b border-stone-200">
          <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400">The one thing</h2>
          <p className="text-xl leading-snug mt-4 max-w-xl">{result.the_one_thing.change}</p>
          <p className="text-sm text-stone-500 mt-3 max-w-xl">{result.the_one_thing.why}</p>
          <p className="text-sm mt-4">
            <span className="text-stone-400">This call would have scored </span>
            <span className="font-medium tabular-nums">{Math.round(result.the_one_thing.score_with_it)}</span>
            <span className="text-stone-400"> with that change alone.</span>
          </p>
        </section>

        {/* brief */}
        <section className="py-10 border-b border-stone-200">
          <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-4">The brief</h2>
          <p className="text-[15px] leading-relaxed text-stone-700 max-w-xl whitespace-pre-line">{result.brief}</p>
        </section>

        {/* red flags */}
        {result.red_flags.length > 0 && (
          <section className="py-10 border-b border-stone-200">
            <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-4">Red flags</h2>
            {result.red_flags.map((f, i) => (
              <div key={i} className="py-3 flex gap-4">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.severity === 'high' ? 'bg-red-600' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-stone-400'}`} />
                <div>
                  <div className="text-sm font-medium">{f.flag}</div>
                  <div className="text-sm text-stone-500 mt-0.5">{f.why}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* dimensions */}
        <section className="pt-10">
          <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-2">Twelve dimensions</h2>

          {spec?.dimensions.map((d) => {
            const dim = result.dimensions.find((x) => x.id === d.id);
            if (!dim) return null;
            const isOpen = open === d.id;
            const pctOf = dim.disabled || dim.score === null ? 0 : (dim.score / d.points) * 100;

            return (
              <div key={d.id} className="border-b border-stone-200">
                <button onClick={() => setOpen(isOpen ? null : d.id)} className="w-full flex items-center gap-4 py-4 text-left group">
                  <span className={`text-[15px] flex-1 ${isOpen ? 'text-stone-900' : 'text-stone-600 group-hover:text-stone-900'}`}>
                    {d.name}
                  </span>

                  {dim.disabled ? (
                    <span className="text-xs text-stone-400 font-mono">N/A</span>
                  ) : (
                    <>
                      <span className="hidden sm:block w-24 h-px bg-stone-200 relative">
                        <span className="absolute left-0 top-0 h-[2px] -mt-[0.5px]" style={{ width: `${pctOf}%`, background: toneHex(pctOf) }} />
                      </span>
                      <span className="tabular-nums text-[15px] w-14 text-right">
                        {dim.score}<span className="text-stone-400 text-xs">/{d.points}</span>
                      </span>
                    </>
                  )}
                  <span className={`text-stone-300 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>

                {isOpen && (
                  <div className="pb-8 pl-0 sm:pl-1 space-y-6">
                    {dim.disabled && (
                      <p className="text-sm text-stone-500 italic">{dim.disabled_reason || 'Not applicable to this call.'}</p>
                    )}

                    {!dim.disabled && (
                      <>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-400 mb-2">Reasoning</p>
                          <p className="text-sm leading-relaxed text-stone-700 max-w-xl">{dim.reasoning}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-400 mb-2">Evidence</p>
                          {dim.evidence_absent || dim.evidence.length === 0 ? (
                            <p className="text-sm text-stone-500 italic">
                              This behaviour does not appear in the transcript. Scored on its absence, not inferred from the rest of the call.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {dim.evidence.map((q, i) => (
                                <p key={i} className="text-sm text-stone-700 font-mono leading-relaxed border-l-2 border-stone-300 pl-3 py-0.5">
                                  {q}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-400 mb-2">
                            Quick fix — to reach {d.points}/{d.points}
                          </p>
                          <p className="text-sm leading-relaxed text-stone-700 max-w-xl">{dim.quick_fix}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* print sheet — plain hex only, html2canvas cannot parse oklch */}
      <div id="print-sheet" aria-hidden style={{ position: 'absolute', left: '-10000px', top: 0, width: '860px', background: '#fff', color: '#1C1917', fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '13px', lineHeight: 1.6, padding: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '2px solid #1C1917' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78716C' }}>{spec?.label}</div>
            <div style={{ fontSize: '23px', fontWeight: 600, marginTop: '6px' }}>{client || 'Client'}</div>
            <div style={{ fontSize: '12px', color: '#78716C', marginTop: '3px' }}>
              {[coach, program].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '40px', fontWeight: 600, lineHeight: 1, color: bandColor }}>{Math.round(result.percentage)}</div>
            <div style={{ fontSize: '11px', color: bandColor, marginTop: '5px', letterSpacing: '0.06em' }}>{result.band}</div>
            <div style={{ fontSize: '10px', color: '#A8A29E', marginTop: '2px' }}>{result.raw_score} / {result.max_possible} pts</div>
          </div>
        </div>

        <div style={{ margin: '22px 0', padding: '14px 16px', background: '#FAFAF9', borderLeft: '3px solid #1C1917' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78716C', marginBottom: '5px' }}>The one thing</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{result.the_one_thing.change}</div>
          <div style={{ fontSize: '12px', color: '#57534E', marginTop: '5px' }}>{result.the_one_thing.why}</div>
          <div style={{ fontSize: '12px', marginTop: '7px' }}>Would have scored <strong>{Math.round(result.the_one_thing.score_with_it)}</strong> with this change alone.</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78716C', marginBottom: '6px' }}>The brief</div>
          <div style={{ fontSize: '12.5px', color: '#44403C', whiteSpace: 'pre-line' }}>{result.brief}</div>
        </div>

        {result.red_flags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78716C', marginBottom: '6px' }}>Red flags</div>
            {result.red_flags.map((f, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #E7E5E4' }}>
                <strong style={{ fontSize: '12.5px' }}>{f.flag}</strong>
                <span style={{ fontSize: '10px', color: '#78716C', marginLeft: '8px', textTransform: 'uppercase' }}>{f.severity}</span>
                <div style={{ fontSize: '12px', color: '#57534E' }}>{f.why}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78716C', marginBottom: '8px' }}>Twelve dimensions</div>
        {spec?.dimensions.map((d) => {
          const dim = result.dimensions.find((x) => x.id === d.id);
          if (!dim) return null;
          return (
            <div key={d.id} style={{ padding: '11px 0', borderBottom: '1px solid #E7E5E4', breakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <strong style={{ fontSize: '13px' }}>D{d.n} · {d.name}</strong>
                <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', color: dim.disabled ? '#A8A29E' : toneHex(((dim.score ?? 0) / d.points) * 100) }}>
                  {dim.disabled ? 'N/A' : `${dim.score} / ${d.points}`}
                </span>
              </div>
              {dim.disabled ? (
                <div style={{ fontSize: '12px', color: '#78716C', marginTop: '4px', fontStyle: 'italic' }}>{dim.disabled_reason}</div>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: '#44403C', marginTop: '5px' }}>{dim.reasoning}</div>
                  {dim.evidence_absent || dim.evidence.length === 0 ? (
                    <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '5px', fontStyle: 'italic' }}>Not present in the transcript.</div>
                  ) : (
                    dim.evidence.map((q, i) => (
                      <div key={i} style={{ fontSize: '11.5px', color: '#57534E', marginTop: '4px', paddingLeft: '10px', borderLeft: '2px solid #D6D3D1' }}>{q}</div>
                    ))
                  )}
                  <div style={{ fontSize: '11.5px', color: '#44403C', marginTop: '6px' }}>
                    <strong>Quick fix.</strong> {dim.quick_fix}
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #E7E5E4', fontSize: '10px', color: '#A8A29E' }}>
          Run {id.slice(0, 8)} · {result.evidence_check.verified}/{result.evidence_check.total} quotes verified against the transcript
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm px-4 py-2 rounded">{toast}</div>}
    </main>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-white text-stone-900"><div className="max-w-3xl mx-auto px-6 py-24">{children}</div></main>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.14em] text-stone-400 mb-1.5">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Add ${label.toLowerCase()}`}
        className="w-full text-[15px] bg-transparent border-b border-stone-200 pb-1.5 focus:outline-none focus:border-stone-900 placeholder:text-stone-300"
      />
    </label>
  );
}