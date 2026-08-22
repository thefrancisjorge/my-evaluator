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
  ELITE: '#059669', STRONG: '#2563EB', INCONSISTENT: '#D97706', 'AT RISK': '#EA580C', FAIL: '#DC2626',
};

const toneHex = (pct: number) => (pct >= 85 ? '#059669' : pct >= 65 ? '#D97706' : '#DC2626');

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [row, setRow] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'running' | 'failed'>('loading');
  const [open, setOpen] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      else if (data.status === 'done' || data.result || data.report_json) setState('ready');
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
    const raw = row?.result || row?.report_json;
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [row]);

  const spec = result ? RUBRIC[result.call_type] : null;

  const saveFields = async () => {
    setSaving(true);
    const { error } = await supabase.from('evaluations').update({ coach, client, program }).eq('id', id);
    setSaving(false);
    setToast(error ? 'Could not save details' : 'Details saved successfully');
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
          margin: [0.4, 0.4, 0.4, 0.4],
          filename: `${(client || 'call').replace(/\s+/g, '-').toLowerCase()}-evaluation.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 800 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .save();
      setToast('PDF downloaded');
    } catch (e) {
      console.error(e);
      setToast('PDF export failed');
    } finally {
      setPdfBusy(false);
    }
  };

  if (state === 'loading') {
    return <Shell><div className="h-6 w-40 bg-stone-100 animate-pulse rounded" /><div className="mt-6 h-32 w-full bg-stone-50 animate-pulse rounded-xl" /></Shell>;
  }

  if (state === 'missing') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">This run doesn&apos;t exist</h1>
          <p className="mt-2 text-stone-500 text-sm">The link points to an ID that was never created, or the run was deleted.</p>
          <Link href="/" className="mt-6 inline-flex items-center justify-center bg-stone-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-stone-800 transition-colors">Evaluate a call</Link>
        </div>
      </Shell>
    );
  }

  if (state === 'running') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-amber-50 border border-amber-200/60 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wider">Scoring in progress</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Evaluating transcript...</h1>
          <p className="mt-2 text-stone-500 text-sm leading-relaxed">
            This page refreshes automatically. You can safely leave or close this tab—the run will complete in the background.
          </p>
          <div className="mt-6 font-mono text-xs text-stone-400 bg-stone-50 py-1.5 px-3 rounded-md inline-block">Run ID: {id.slice(0, 8)}</div>
        </div>
      </Shell>
    );
  }

  if (state === 'failed' || !result) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto py-12">
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
            <h1 className="text-lg font-semibold text-red-900">This run failed</h1>
            <pre className="mt-3 p-4 bg-white/80 border border-red-100 rounded-lg text-xs font-mono text-red-800 whitespace-pre-wrap overflow-x-auto">
              {row?.error || 'No specific error reason was recorded.'}
            </pre>
          </div>
          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center justify-center bg-stone-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-stone-800 transition-colors">Try another transcript</Link>
          </div>
        </div>
      </Shell>
    );
  }

  const bandColor = BAND_HEX[result.band] ?? '#57534E';
  const fabricated = result.evidence_check.total - result.evidence_check.verified;

  return (
    <main className="min-h-screen bg-stone-50/50 text-stone-900 pb-28">
      {/* Top Sticky Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-stone-500 hover:text-stone-900 flex items-center gap-1.5 transition-colors">
            <span>←</span> All runs
          </Link>
          <div className="flex items-center gap-3">
            <button 
              onClick={downloadPDF} 
              disabled={pdfBusy} 
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-stone-900 text-white px-3.5 py-1.5 rounded-lg shadow-sm hover:bg-stone-800 disabled:opacity-55 transition-all"
            >
              {pdfBusy ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button 
              onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied to clipboard'); }} 
              className="text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70 px-3 py-1.5 rounded-lg transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
        
        {/* Score Card Header */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-bl-full pointer-events-none -z-0" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 mb-3">
                  {spec?.label}
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-stone-900">{client || 'Untitled Client Session'}</h1>
                <p className="text-sm text-stone-500 mt-1">
                  {[coach ? `Coach: ${coach}` : null, program ? `Program: ${program}` : null].filter(Boolean).join(' · ') || 'No metadata assigned yet'}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-stone-50/80 border border-stone-200/60 p-4 rounded-xl shrink-0">
                <div className="text-4xl font-extrabold tracking-tight tabular-nums" style={{ color: bandColor }}>
                  {Math.round(result.percentage)}%
                </div>
                <div className="border-l border-stone-200 pl-4">
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: bandColor }}>{result.band}</div>
                  <div className="text-xs text-stone-500 font-mono mt-0.5">{result.raw_score} / {result.max_possible} points</div>
                </div>
              </div>
            </div>

            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-6">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${result.percentage}%`, background: bandColor }} />
            </div>
            
            <p className="mt-4 text-sm text-stone-600 leading-relaxed max-w-2xl">{result.band_blurb}</p>
          </div>
        </div>

        {/* Metadata Editor Bar */}
        <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Field label="Coach" value={coach} onChange={setCoach} />
            <Field label="Client" value={client} onChange={setClient} />
            <Field label="Program" value={program} onChange={setProgram} />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className={`w-2 h-2 rounded-full ${fabricated === 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>{result.evidence_check.verified} of {result.evidence_check.total} quoted lines verified verbatim</span>
            </div>
            <button 
              onClick={saveFields} 
              disabled={saving} 
              className="text-xs font-medium bg-stone-900 text-white px-4 py-1.5 rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : 'Save details'}
            </button>
          </div>
        </div>

        {/* The One Thing & Caps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 block mb-2">The High-Impact Pivot</span>
              <h2 className="text-lg font-semibold text-stone-900 leading-snug">{result.the_one_thing.change}</h2>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">{result.the_one_thing.why}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 text-xs font-medium text-stone-500 flex items-center justify-between">
              <span>Potential Score with this change:</span>
              <span className="text-stone-900 font-bold tabular-nums bg-stone-100 px-2.5 py-1 rounded-md">{Math.round(result.the_one_thing.score_with_it)} pts</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 block mb-3">Red Flags & Caps</span>
            {result.red_flags.length === 0 && result.caps_fired.length === 0 ? (
              <div className="my-auto py-8 text-center text-stone-400 text-sm">No critical flags or caps recorded on this call.</div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
                {result.red_flags.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-red-50/60 border border-red-100 text-xs">
                    <div className="font-semibold text-red-900 flex items-center justify-between">
                      {f.flag}
                      <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">{f.severity}</span>
                    </div>
                    <div className="text-red-700/80 mt-1">{f.why}</div>
                  </div>
                ))}
                {result.caps_fired.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs">
                    <div className="font-semibold text-amber-900">Cap Fired: {c.id}</div>
                    <div className="text-amber-700/80 mt-1">{c.explanation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The Brief */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 mb-3">Session Brief</h2>
          <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-line">{result.brief}</p>
        </div>

        {/* Twelve Dimensions Scorecard */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Evaluation Dimensions ({spec?.dimensions.length || 0})</h2>
            <span className="text-xs text-stone-400">Click row to expand details & evidence</span>
          </div>

          <div className="divide-y divide-stone-100">
            {spec?.dimensions.map((d) => {
              const dim = result.dimensions.find((x) => x.id === d.id);
              if (!dim) return null;
              const isOpen = open === d.id;
              const pctOf = dim.disabled || dim.score === null ? 0 : (dim.score / d.points) * 100;

              return (
                <div key={d.id} className="transition-colors hover:bg-stone-50/50">
                  <button 
                    onClick={() => setOpen(isOpen ? null : d.id)} 
                    className="w-full flex items-center gap-4 px-6 py-4 text-left group"
                  >
                    <span className="text-xs font-mono text-stone-400 w-6 shrink-0">{d.id}</span>
                    <span className={`text-sm font-medium flex-1 ${isOpen ? 'text-stone-900' : 'text-stone-700 group-hover:text-stone-900'}`}>
                      {d.name}
                    </span>

                    {dim.disabled ? (
                      <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded">N/A</span>
                    ) : (
                      <>
                        <div className="hidden sm:block w-28 h-2 bg-stone-100 rounded-full overflow-hidden relative">
                          <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${pctOf}%`, background: toneHex(pctOf) }} />
                        </div>
                        <span className="tabular-nums text-sm font-semibold w-16 text-right text-stone-900">
                          {dim.score}<span className="text-stone-400 text-xs font-normal">/{d.points}</span>
                        </span>
                      </>
                    )}
                    <span className={`text-stone-400 text-xs transition-transform duration-200 ml-2 ${isOpen ? 'rotate-90 text-stone-900 font-bold' : ''}`}>›</span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 bg-stone-50/40 border-t border-stone-100 space-y-5">
                      {dim.disabled ? (
                        <p className="text-xs text-stone-500 italic py-2">Reason disabled: {dim.disabled_reason || 'Not applicable to this call type.'}</p>
                      ) : (
                        <>
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400 mb-1.5">Reasoning</h4>
                            <p className="text-sm leading-relaxed text-stone-700">{dim.reasoning}</p>
                          </div>

                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400 mb-1.5">Verbatim Evidence</h4>
                            {dim.evidence_absent || dim.evidence.length === 0 ? (
                              <p className="text-xs text-stone-500 italic bg-stone-100/70 p-3 rounded-lg border border-stone-200/50">
                                This behavior was absent from the transcript and scored accordingly.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {dim.evidence.map((q, i) => (
                                  <div key={i} className="text-xs text-stone-700 font-mono bg-white p-3 rounded-lg border border-stone-200/80 shadow-sm leading-relaxed">
                                    &ldquo;{q}&rdquo;
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400 mb-1.5">Quick Fix to reach {d.points}/{d.points}</h4>
                            <p className="text-sm leading-relaxed text-stone-700 bg-amber-50/50 border border-amber-200/60 p-3.5 rounded-xl text-amber-900/90">{dim.quick_fix}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* --- HIDDEN PRINT SHEET FOR PDF EXPORT --- */}
      <div id="print-sheet" aria-hidden style={{ position: 'absolute', left: '-10000px', top: 0, width: '750px', background: '#ffffff', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '12px', lineHeight: 1.5, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '2px solid #111827' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B7280', fontWeight: 600 }}>{spec?.label} Evaluation Report</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: '#111827' }}>{client || 'Client Session'}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
              {[coach ? `Coach: ${coach}` : null, program ? `Program: ${program}` : null].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1, color: bandColor }}>{Math.round(result.percentage)}%</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: bandColor, marginTop: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{result.band}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{result.raw_score} / {result.max_possible} pts</div>
          </div>
        </div>

        <div style={{ margin: '16px 0', padding: '12px 16px', background: '#F9FAFB', borderLeft: '3px solid #111827', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>The High-Impact Pivot</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{result.the_one_thing.change}</div>
          <div style={{ fontSize: '11.5px', color: '#4B5563', marginTop: '4px' }}>{result.the_one_thing.why}</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>Session Brief</div>
          <div style={{ fontSize: '11.5px', color: '#374151', whiteSpace: 'pre-line' }}>{result.brief}</div>
        </div>

        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B7280', fontWeight: 600, marginBottom: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>Evaluation Dimensions</div>
        {spec?.dimensions.map((d) => {
          const dim = result.dimensions.find((x) => x.id === d.id);
          if (!dim) return null;
          return (
            <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6', breakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12px', color: '#111827' }}>{d.id} · {d.name}</strong>
                <span style={{ fontSize: '12px', fontWeight: 600, color: dim.disabled ? '#9CA3AF' : toneHex(((dim.score ?? 0) / d.points) * 100) }}>
                  {dim.disabled ? 'N/A' : `${dim.score} / ${d.points}`}
                </span>
              </div>
              {dim.disabled ? (
                <div style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic', marginTop: '2px' }}>{dim.disabled_reason}</div>
              ) : (
                <div style={{ marginTop: '3px' }}>
                  <div style={{ fontSize: '11.5px', color: '#374151' }}>{dim.reasoning}</div>
                  {!dim.evidence_absent && dim.evidence.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#4B5563', fontStyle: 'italic', marginTop: '2px', paddingLeft: '8px', borderLeft: '2px solid #D1D5DB' }}>
                      &ldquo;{dim.evidence[0]}&rdquo;
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#1F2937', marginTop: '3px' }}>
                    <strong>Quick fix:</strong> {dim.quick_fix}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: '20px', paddingTop: '8px', borderTop: '1px solid #E5E7EB', fontSize: '9.5px', color: '#9CA3AF', display: 'flex', justifyContent: 'space-between' }}>
          <span>Run ID: {id}</span>
          <span>Verified Quotes: {result.evidence_check.verified}/{result.evidence_check.total}</span>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </main>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-stone-50 text-stone-900"><div className="max-w-4xl mx-auto px-6 py-24">{children}</div></main>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="w-full text-sm bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-300"
      />
    </label>
  );
}