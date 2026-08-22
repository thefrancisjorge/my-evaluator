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
    return <Shell><div className="h-6 w-40 bg-zinc-100 animate-pulse rounded" /><div className="mt-8 h-32 w-full bg-zinc-50 animate-pulse rounded-2xl" /></Shell>;
  }

  if (state === 'missing') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-24">
          <h1 className="text-xl font-medium tracking-tight text-zinc-900">This run doesn&apos;t exist</h1>
          <p className="mt-2 text-zinc-500 text-sm leading-relaxed">The link points to an ID that was never created or has been removed.</p>
          <Link href="/" className="mt-8 inline-flex items-center justify-center bg-zinc-900 text-white text-xs font-medium tracking-wide px-5 py-2.5 rounded-full shadow-sm hover:bg-zinc-800 transition-all">Evaluate a call</Link>
        </div>
      </Shell>
    );
  }

  if (state === 'running') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-24">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-200/60 mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-medium text-zinc-700 tracking-wider uppercase">Scoring in progress</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-900">Analyzing session transcript...</h1>
          <p className="mt-2 text-zinc-500 text-sm leading-relaxed">This page updates automatically in the background.</p>
        </div>
      </Shell>
    );
  }

  if (state === 'failed' || !result) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto py-16">
          <div className="p-6 bg-red-50/50 border border-red-200/60 rounded-2xl">
            <h1 className="text-sm font-semibold text-red-900">Evaluation failed</h1>
            <pre className="mt-3 p-4 bg-white border border-red-100 rounded-xl text-xs font-mono text-red-700 whitespace-pre-wrap overflow-x-auto">
              {row?.error || 'No specific error recorded.'}
            </pre>
          </div>
        </div>
      </Shell>
    );
  }

  const bandColor = BAND_HEX[result.band] ?? '#52525B';
  const fabricated = result.evidence_check.total - result.evidence_check.verified;

  return (
    <main className="min-h-screen bg-[#FBFBFD] text-zinc-900 pb-32 selection:bg-zinc-900 selection:text-white">
      {/* Apple-style Glass Navigation */}
      <div className="sticky top-0 z-30 bg-[#FBFBFD]/80 backdrop-blur-xl border-b border-zinc-200/60">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors">
            <span>←</span> Back to runs
          </Link>
          <div className="flex items-center gap-2.5">
            <button 
              onClick={downloadPDF} 
              disabled={pdfBusy} 
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-zinc-900 text-white px-3.5 py-1.5 rounded-full shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              {pdfBusy ? 'Exporting PDF...' : 'Download PDF'}
            </button>
            <button 
              onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied'); }} 
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100/80 hover:bg-zinc-200/70 px-3 py-1.5 rounded-full transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-8">
        
        {/* Main Score Hero Card */}
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 md:p-10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-zinc-100 text-zinc-600">
                {spec?.label}
              </span>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">{client || 'Untitled Client Session'}</h1>
              <p className="text-sm text-zinc-500">
                {[coach ? `Coach: ${coach}` : null, program ? `Program: ${program}` : null].filter(Boolean).join(' · ') || 'No metadata assigned yet'}
              </p>
            </div>

            <div className="flex items-center gap-5 bg-zinc-50/80 border border-zinc-200/60 px-6 py-4 rounded-2xl shrink-0">
              <div className="text-4xl font-bold tracking-tight tabular-nums" style={{ color: bandColor }}>
                {Math.round(result.percentage)}%
              </div>
              <div className="border-l border-zinc-200 pl-5">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: bandColor }}>{result.band}</div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{result.raw_score} / {result.max_possible} pts</div>
              </div>
            </div>
          </div>

          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-8">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.percentage}%`, background: bandColor }} />
          </div>
          
          <p className="mt-6 text-sm text-zinc-600 leading-relaxed max-w-2xl font-normal">{result.band_blurb}</p>
        </div>

        {/* Metadata Controls */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Field label="Coach" value={coach} onChange={setCoach} />
            <Field label="Client" value={client} onChange={setClient} />
            <Field label="Program" value={program} onChange={setProgram} />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${fabricated === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{result.evidence_check.verified} of {result.evidence_check.total} quoted lines verified verbatim</span>
            </div>
            <button 
              onClick={saveFields} 
              disabled={saving} 
              className="text-xs font-medium bg-zinc-900 text-white px-4 py-1.5 rounded-full hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : 'Save details'}
            </button>
          </div>
        </div>

        {/* High-Impact Pivot & Flags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 block mb-3">The High-Impact Pivot</span>
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight leading-snug">{result.the_one_thing.change}</h2>
              <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{result.the_one_thing.why}</p>
            </div>
            <div className="mt-8 pt-4 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-between">
              <span>Potential Score with this change:</span>
              <span className="text-zinc-900 font-semibold tabular-nums bg-zinc-100 px-3 py-1 rounded-full">{Math.round(result.the_one_thing.score_with_it)} pts</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] p-6 flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 block mb-4">Red Flags & Caps</span>
            {result.red_flags.length === 0 && result.caps_fired.length === 0 ? (
              <div className="my-auto py-12 text-center text-zinc-400 text-xs">No critical flags or caps recorded.</div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
                {result.red_flags.map((f, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-red-50/50 border border-red-100 text-xs">
                    <div className="font-semibold text-red-900 flex items-center justify-between">
                      {f.flag}
                      <span className="uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">{f.severity}</span>
                    </div>
                    <div className="text-red-700/80 mt-1">{f.why}</div>
                  </div>
                ))}
                {result.caps_fired.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                    <div className="font-semibold text-amber-900">Cap Fired: {c.id}</div>
                    <div className="text-amber-700/80 mt-1">{c.explanation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Brief */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] p-6 md:p-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-3">Session Brief</h2>
          <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">{result.brief}</p>
        </div>

        {/* Evaluation Dimensions */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Evaluation Dimensions ({spec?.dimensions.length || 0})</h2>
            <span className="text-xs text-zinc-400">Click row to view evidence</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {spec?.dimensions.map((d) => {
              const dim = result.dimensions.find((x) => x.id === d.id);
              if (!dim) return null;
              const isOpen = open === d.id;
              const pctOf = dim.disabled || dim.score === null ? 0 : (dim.score / d.points) * 100;

              return (
                <div key={d.id} className="transition-colors hover:bg-zinc-50/60">
                  <button 
                    onClick={() => setOpen(isOpen ? null : d.id)} 
                    className="w-full flex items-center gap-4 px-6 py-4 text-left group"
                  >
                    <span className="text-xs font-mono text-zinc-400 w-6 shrink-0">{d.id}</span>
                    <span className={`text-sm font-medium flex-1 ${isOpen ? 'text-zinc-900' : 'text-zinc-700 group-hover:text-zinc-900'}`}>
                      {d.name}
                    </span>

                    {dim.disabled ? (
                      <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">N/A</span>
                    ) : (
                      <>
                        <div className="hidden sm:block w-28 h-1.5 bg-zinc-100 rounded-full overflow-hidden relative">
                          <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${pctOf}%`, background: toneHex(pctOf) }} />
                        </div>
                        <span className="tabular-nums text-sm font-semibold w-16 text-right text-zinc-900">
                          {dim.score}<span className="text-zinc-400 text-xs font-normal">/{d.points}</span>
                        </span>
                      </>
                    )}
                    <span className={`text-zinc-400 text-xs transition-transform duration-200 ml-2 ${isOpen ? 'rotate-90 text-zinc-900' : ''}`}>›</span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-3 bg-zinc-50/50 border-t border-zinc-100 space-y-5">
                      {dim.disabled ? (
                        <p className="text-xs text-zinc-500 italic py-2">Reason disabled: {dim.disabled_reason || 'Not applicable to this call type.'}</p>
                      ) : (
                        <>
                          <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">Reasoning</h4>
                            <p className="text-sm leading-relaxed text-zinc-700">{dim.reasoning}</p>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">Verbatim Evidence</h4>
                            {dim.evidence_absent || dim.evidence.length === 0 ? (
                              <p className="text-xs text-zinc-500 italic bg-zinc-100/70 p-3 rounded-xl border border-zinc-200/50">
                                This behavior was absent from the transcript.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {dim.evidence.map((q, i) => (
                                  <div key={i} className="text-xs text-zinc-700 font-mono bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] leading-relaxed">
                                    &ldquo;{q}&rdquo;
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">Quick Fix to reach {d.points}/{d.points}</h4>
                            <p className="text-sm leading-relaxed text-zinc-800 bg-amber-50/60 border border-amber-200/60 p-4 rounded-xl">{dim.quick_fix}</p>
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-medium px-5 py-3 rounded-2xl shadow-xl z-50 animate-fade-in tracking-wide">
          {toast}
        </div>
      )}
    </main>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-[#FBFBFD] text-zinc-900"><div className="max-w-4xl mx-auto px-6 py-24">{children}</div></main>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="w-full text-xs font-medium bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-xl focus:outline-none focus:border-zinc-900 focus:bg-white transition-all placeholder:text-zinc-300"
      />
    </label>
  );
}