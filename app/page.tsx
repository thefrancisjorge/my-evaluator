'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RUBRIC, type CallType } from '@/lib/rubrics';

const BAND_STYLE: Record<string, { text: string; ring: string; chip: string }> = {
  ELITE: { text: 'text-emerald-400', ring: '#34D399', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  STRONG: { text: 'text-sky-400', ring: '#38BDF8', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  INCONSISTENT: { text: 'text-amber-400', ring: '#FBBF24', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  'AT RISK': { text: 'text-orange-400', ring: '#FB923C', chip: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  FAIL: { text: 'text-rose-400', ring: '#FB7185', chip: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
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
        .limit(20);
      if (error) console.error('Error fetching history:', error);
      if (data) setHistory(data as HistoryRow[]);
      setHistoryLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (transcript.trim().length < 200) {
      setError('That transcript looks too short to score. Paste the whole call.');
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
      if (!res.ok) throw new Error(data?.error || `The run could not be started (${res.status}).`);

      const id = data.id ?? data.evaluation_id ?? data.run_id;
      if (!id) throw new Error('The run started but no id came back, so there is nothing to open.');

      router.push(`/evaluations/${id}`);
    } catch (e: any) {
      setError(e.message || 'Something went wrong starting the run.');
      setSubmitting(false);
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const ready = transcript.trim().length >= 200;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl mx-auto">

        <header className="mb-8">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full uppercase tracking-wider">
            Call intelligence
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">Score a call against the rubric</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl">
            Paste a transcript, pick the rubric it belongs to, and every dimension comes back with the transcript lines its score rests on. Each run gets its own link.
          </p>
        </header>

        {/* call type */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Call type evaluation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['coaching', 'kickoff'] as const).map((t) => {
              const on = callType === t;
              return (
                <button
                  key={t}
                  onClick={() => setCallType(t)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    on
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${on ? 'text-white' : 'text-slate-300'}`}>
                      {RUBRIC[t].label}
                    </span>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${on ? 'border-indigo-400 bg-indigo-400' : 'border-slate-700'}`} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5">
                    {RUBRIC[t].dimensions.length} dimensions ·{' '}
                    {RUBRIC[t].dimensions.reduce((s, d) => s + d.points, 0)} points ·{' '}
                    {RUBRIC[t].caps.length} automatic caps
                  </div>
                </button>
              );
            })}
          </div>

          {/* who */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <Field label="Coach name" value={coach} onChange={setCoach} placeholder="Coach Marcus Vance" />
            <Field label="Client name" value={client} onChange={setClient} placeholder="Sarah Jenkins" />
            <Field label="Program track" value={program} onChange={setProgram} placeholder="Elite Physique 12W" />
          </div>
        </div>

        {/* transcript */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Transcript
            </label>
            <div className="flex items-center gap-4 text-xs">
              {wordCount > 0 && (
                <span className={`tabular-nums ${ready ? 'text-slate-500' : 'text-amber-400'}`}>
                  {wordCount.toLocaleString()} words
                </span>
              )}
              <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">
                Upload .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) { setTranscript(await f.text()); setError(null); }
                  }}
                />
              </label>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value); if (error) setError(null); }}
            placeholder={'[Coach Marcus]: How has your body been feeling since last time?\n[Sarah]: Honestly, better than I expected.'}
            rows={12}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 font-mono leading-relaxed resize-y focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />

          {error && (
            <div className="mt-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <button
              onClick={submit}
              disabled={submitting}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Starting the run…' : `Score this ${callType} call`}
            </button>

            {transcript && !submitting && (
              <button onClick={() => setTranscript('')} className="text-sm text-slate-500 hover:text-slate-300 cursor-pointer">
                Clear
              </button>
            )}
          </div>

          {submitting && (
            <p className="text-sm text-slate-400 mt-4 max-w-lg">
              Scoring twelve dimensions against the rubric. You can close the tab once the run page opens — it keeps going without you.
            </p>
          )}
        </div>

        {/* history */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Recent runs</h2>

          {historyLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-slate-950/60 rounded-xl animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">Nothing scored yet. Your first run will show up here.</p>
          ) : (
            <div className="space-y-2">
              {history.map((r) => {
                const res = typeof r.result === 'string' ? safeParse(r.result) : r.result;
                const pct = typeof res?.percentage === 'number' ? res.percentage : null;
                const band: string = res?.band ?? '';
                const style = BAND_STYLE[band];
                const failed = r.status === 'failed';
                const done = r.status === 'done' || !!res;

                return (
                  <Link
                    key={r.id}
                    href={`/evaluations/${r.id}`}
                    className="flex items-center gap-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors group"
                  >
                    {/* ring */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" strokeWidth="4" className="text-slate-800 fill-none" stroke="currentColor" />
                        {pct !== null && (
                          <circle
                            cx="24" cy="24" r="20" strokeWidth="4" fill="none"
                            stroke={style?.ring ?? '#64748B'}
                            strokeDasharray={125.6}
                            strokeDashoffset={125.6 - (125.6 * pct) / 100}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      <div className={`absolute text-xs font-bold ${style?.text ?? 'text-slate-500'}`}>
                        {failed ? '—' : pct !== null ? Math.round(pct) : '·'}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {r.client || 'Untitled client'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {r.call_type ? RUBRIC[r.call_type]?.label : 'Unknown rubric'}
                        {r.coach && ` · ${r.coach}`}
                        {' · '}
                        {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {failed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20 shrink-0">
                        Failed
                      </span>
                    ) : !done ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Running
                      </span>
                    ) : band ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${style?.chip ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {band}
                      </span>
                    ) : null}

                    <span className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0">→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function safeParse(v: string) {
  try { return JSON.parse(v); } catch { return null; }
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
      />
    </div>
  );
}