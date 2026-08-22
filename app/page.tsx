'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RUBRIC, type CallType } from '@/lib/rubrics';

const BAND_HEX: Record<string, string> = {
  ELITE: '#1B7A5A', STRONG: '#2F6FA8', INCONSISTENT: '#A8761B', 'AT RISK': '#B8531F', FAIL: '#A32F2F',
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

  const readFile = async (file: File) => {
    const text = await file.text();
    setTranscript(text);
    setError(null);
  };

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

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <div className="max-w-3xl mx-auto px-6 pb-24">

        <header className="pt-20 pb-12">
          <h1 className="text-3xl font-medium tracking-tight">Call evaluation</h1>
          <p className="mt-3 text-stone-500 max-w-lg">
            Paste a transcript and pick which rubric it belongs to. Every run gets its own link you can send on.
          </p>
        </header>

        {/* call type */}
        <section className="pb-8 border-t border-stone-200 pt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-4">Which call is this</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['coaching', 'kickoff'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCallType(t)}
                className={`text-left px-4 py-3.5 border rounded transition-colors ${
                  callType === t ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="text-[15px] font-medium">{RUBRIC[t].label}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {RUBRIC[t].dimensions.length} dimensions · {RUBRIC[t].dimensions.reduce((s, d) => s + d.points, 0)} points
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* who */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 py-8 border-t border-stone-200">
          <Field label="Coach" value={coach} onChange={setCoach} />
          <Field label="Client" value={client} onChange={setClient} />
          <Field label="Program" value={program} onChange={setProgram} />
        </section>

        {/* transcript */}
        <section className="py-8 border-t border-stone-200">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Transcript</p>
            <div className="flex items-center gap-4 text-xs text-stone-400">
              {wordCount > 0 && <span className="tabular-nums">{wordCount.toLocaleString()} words</span>}
              <label className="cursor-pointer hover:text-stone-900">
                Upload a .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
                />
              </label>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value); if (error) setError(null); }}
            placeholder={'[Coach Name]: How has your body been feeling since last time?\n[Client Name]: Honestly, better than I expected.'}
            rows={14}
            className="w-full text-sm font-mono leading-relaxed p-4 border border-stone-200 rounded resize-y focus:outline-none focus:border-stone-900 placeholder:text-stone-300"
          />

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex items-center gap-5">
            <button
              onClick={submit}
              disabled={submitting}
              className="bg-stone-900 text-white text-sm px-5 py-2.5 rounded hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Starting the run…' : `Score this ${callType} call`}
            </button>
            {transcript && !submitting && (
              <button onClick={() => setTranscript('')} className="text-sm text-stone-400 hover:text-stone-900">
                Clear
              </button>
            )}
          </div>

          {submitting && (
            <p className="mt-4 text-sm text-stone-500 max-w-lg">
              Scoring twelve dimensions against the rubric. You can close this tab once the run page opens — it keeps going without you.
            </p>
          )}
        </section>

        {/* history */}
        <section className="pt-10 border-t border-stone-200">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-2">Recent runs</p>

          {historyLoading ? (
            <div className="py-8 space-y-3">
              <div className="h-4 w-2/3 bg-stone-100 animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-stone-100 animate-pulse rounded" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-8 text-sm text-stone-500">Nothing scored yet. The first run will show up here.</p>
          ) : (
            history.map((r) => {
              const res = typeof r.result === 'string' ? safeParse(r.result) : r.result;
              const pct = res?.percentage;
              const band = res?.band;
              const done = r.status === 'done' || !!res;
              const failed = r.status === 'failed';

              return (
                <Link
                  key={r.id}
                  href={`/evaluations/${r.id}`}
                  className="flex items-center gap-4 py-4 border-b border-stone-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] text-stone-700 group-hover:text-stone-900 truncate">
                      {r.client || 'Untitled client'}
                      {r.coach && <span className="text-stone-400"> · {r.coach}</span>}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {r.call_type ? RUBRIC[r.call_type]?.label : 'Unknown rubric'} ·{' '}
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {failed ? (
                    <span className="text-xs text-red-700">Failed</span>
                  ) : !done ? (
                    <span className="text-xs text-amber-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Running
                    </span>
                  ) : (
                    <>
                      <span className="hidden sm:block text-xs" style={{ color: BAND_HEX[band] ?? '#78716C' }}>{band}</span>
                      <span
                        className="tabular-nums text-[15px] w-10 text-right"
                        style={{ color: BAND_HEX[band] ?? '#57534E' }}
                      >
                        {typeof pct === 'number' ? Math.round(pct) : '—'}
                      </span>
                    </>
                  )}
                  <span className="text-stone-300 text-xs">›</span>
                </Link>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function safeParse(v: string) {
  try { return JSON.parse(v); } catch { return null; }
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