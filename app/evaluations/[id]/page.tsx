'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';

interface Criterion {
  name: string;
  score: number;
  maxScore: number;
  evidence: string;
  quickFix: string;
}

interface EvaluationData {
  id: string;
  coach: string;
  client: string;
  program: string;
  callType: 'Coaching Call' | 'Kickoff Call';
  overallPercentage: number;
  date: string;
  transcriptSummary: string;
  criteria: Criterion[];
}

const mockEvaluations: Record<string, EvaluationData> = {
  '1': {
    id: '1',
    coach: 'Coach Marcus Vance',
    client: 'Sarah Jenkins',
    program: 'Elite Physique Transformation 12W',
    callType: 'Coaching Call',
    overallPercentage: 84,
    date: '2026-06-06',
    transcriptSummary:
      'The session began with solid rapport-building and a check-in on sleep and nutrition metrics. Diagnostics review was thorough, though program focus could tie back tighter to the primary macro-goal. Movement coaching pointers on the squat depth were exceptional. Minor gaps in structured accountability anchoring toward the final 5 minutes.',
    criteria: [
      { name: 'Check in & connection', score: 9, maxScore: 10, evidence: 'Coach warmly welcomed the client, inquired about her week and energy levels immediately.', quickFix: 'Maintain the energetic tone but anchor the mood state right into performance readiness earlier.' },
      { name: 'Diagnostics review', score: 8, maxScore: 10, evidence: 'Reviewed water intake and step logs efficiently using screen share.', quickFix: 'Inquire specifically about compliance bottlenecks behind the missing Friday tracking data.' },
      { name: 'Program focus + vision', score: 7, maxScore: 10, evidence: 'Touched briefly on the 12-week milestone, but drifted quickly into daily habits.', quickFix: 'Explicitly tie today\u2019s macro adjustments back to the overarching end-of-quarter body composition target.' },
      { name: 'Movement coaching quality', score: 10, maxScore: 10, evidence: 'Pinpointed knee valgus during single-leg romanian deadlifts and cued lateral knee drive accurately.', quickFix: 'None, stellar technical coaching delivery.' },
      { name: 'Adjustments & strategy', score: 8, maxScore: 10, evidence: 'Decreased calorie deficit by 150kcal safely due to fatigue reports.', quickFix: 'Provide clearer rationale on how carbohydrate timing around workouts will change.' },
      { name: 'Action steps & accountability', score: 7, maxScore: 10, evidence: 'Listed daily water goals and workout check-ins loosely at the end.', quickFix: 'Have the client repeat back the top 3 non-negotiable action items before wrapping up.' },
      { name: 'Accountability anchor', score: 6, maxScore: 10, evidence: 'Failed to set a strict penalty or strict tracking consequence for missed check-ins.', quickFix: 'Establish a concrete digital accountability trigger (e.g., automated morning screenshot upload).' },
      { name: 'Struggle handling', score: 9, maxScore: 10, evidence: 'Empathized gracefully with evening sweet-tooth cravings without sounding judgmental.', quickFix: 'Introduce a practical fiber/protein substitution strategy for late-night windows.' },
      { name: 'Close quality', score: 8, maxScore: 10, evidence: 'Ended warmly, wishing her luck on upcoming travel days.', quickFix: 'Ensure structural transition into formal call closure before casual chatting.' },
      { name: 'Next call booking', score: 10, maxScore: 10, evidence: 'Confirmed date and time for next Tuesday check-in live on the calendar.', quickFix: 'None.' },
      { name: 'Continuity and follow up', score: 8, maxScore: 10, evidence: 'Promised to send a summary text via chat application post-call.', quickFix: 'Automate a template breakdown sheet instantly following session completion.' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Score helpers                                                      */
/*  Tailwind cannot build class names at runtime, so every variant is  */
/*  written out in full.                                               */
/* ------------------------------------------------------------------ */

type Tone = 'good' | 'ok' | 'watch' | 'risk';

const toneOf = (percent: number): Tone =>
  percent >= 90 ? 'good' : percent >= 75 ? 'ok' : percent >= 60 ? 'watch' : 'risk';

const BADGE: Record<Tone, string> = {
  good: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ok: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  watch: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  risk: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const DOT: Record<Tone, string> = {
  good: 'text-emerald-400',
  ok: 'text-sky-400',
  watch: 'text-amber-400',
  risk: 'text-rose-400',
};

const VERDICT: Record<Tone, string> = {
  good: 'Exceptional execution',
  ok: 'High performance',
  watch: 'Needs coaching',
  risk: 'Below standard',
};

// Plain hex for the print sheet. html2canvas cannot parse oklch() or
// color-mix(), which is what Tailwind v4 emits for every default colour
// and every /opacity modifier.
const HEX: Record<Tone, string> = {
  good: '#047857',
  ok: '#0369A1',
  watch: '#B45309',
  risk: '#BE123C',
};

/* ------------------------------------------------------------------ */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EvaluationDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const evalId = resolvedParams?.id || '1';
  const evalData = mockEvaluations[evalId] || mockEvaluations['1'];

  const [coach, setCoach] = useState(evalData.coach);
  const [client, setClient] = useState(evalData.client);
  const [program, setProgram] = useState(evalData.program);
  const [callType, setCallType] = useState<'Coaching Call' | 'Kickoff Call'>(evalData.callType);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const overallTone = toneOf(evalData.overallPercentage);
  const dateLabel = new Date(evalData.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setPdfError(null);
    try {
      const element = document.getElementById('printable-report-card');
      if (!element) throw new Error('Print sheet is not mounted.');

      const html2pdf = (await import('html2pdf.js')).default;

      // The options object is passed straight into .set() on purpose.
      // Pulling it out into a `const opt` widens 'jpeg' and 'portrait' to
      // `string`, which no longer matches the literal unions the types
      // expect — that is the TS2345 on image.type.
      await html2pdf()
        .from(element)
        .set({
          margin: [0.5, 0.5, 0.6, 0.5],
          filename: `Evaluation_${client.replace(/\s+/g, '_')}_${callType.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 900 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .save();
    } catch (error) {
      console.error('PDF Generation Failed:', error);
      setPdfError('Could not generate the PDF. Check the console for details.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors">
            ← Back to Evaluations Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">Call Intelligence &amp; Rubric Scorecard</h1>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? 'Generating PDF…' : 'Download PDF report'}
          </button>
          {pdfError && <p className="text-xs text-rose-400">{pdfError}</p>}
        </div>
      </div>

      {/* ---------------- on-screen card ---------------- */}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-800/80 pb-6">
            <div>
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full uppercase tracking-wider">
                Session audit review
              </span>
              <div className="mt-3">
                <label className="sr-only" htmlFor="client-title">Client name</label>
                <input
                  id="client-title"
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="text-2xl sm:text-3xl font-bold bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors text-white w-full"
                />
              </div>
              <p className="text-sm text-slate-400 mt-1">{dateLabel}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="relative flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" className="text-slate-800 fill-none" />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-indigo-500 fill-none"
                    strokeDasharray={175.9}
                    strokeDashoffset={175.9 - (175.9 * evalData.overallPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-sm font-bold text-white">{evalData.overallPercentage}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Overall execution</div>
                <div className={`text-sm font-semibold mt-0.5 ${DOT[overallTone]}`}>● {VERDICT[overallTone]}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
            <div>
              <label htmlFor="f-coach" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Coach name</label>
              <input id="f-coach" type="text" value={coach} onChange={(e) => setCoach(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="f-client" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Client name</label>
              <input id="f-client" type="text" value={client} onChange={(e) => setClient(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="f-program" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Program track</label>
              <input id="f-program" type="text" value={program} onChange={(e) => setProgram(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="f-type" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Call type</label>
              <select id="f-type" value={callType} onChange={(e) => setCallType(e.target.value as 'Coaching Call' | 'Kickoff Call')}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="Coaching Call">Coaching Call</option>
                <option value="Kickoff Call">Kickoff Call</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-2">Transcript summary</h2>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            {evalData.transcriptSummary}
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Full evaluation rubric</h2>
          <div className="grid grid-cols-1 gap-4">
            {evalData.criteria.map((item, idx) => {
              const tone = toneOf((item.score / item.maxScore) * 100);
              return (
                <div key={item.name} className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                    <div>
                      <span className="text-xs font-mono text-indigo-400 tracking-wider">CRITERIA #{idx + 1}</span>
                      <h3 className="text-base font-bold text-white mt-0.5">{item.name}</h3>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${BADGE[tone]}`}>
                      Score: {item.score} / {item.maxScore}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                    <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Verified evidence</span>
                      <p className="text-slate-300">{item.evidence}</p>
                    </div>
                    <div className="bg-indigo-950/20 border border-indigo-900/40 p-3.5 rounded-xl">
                      <span className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Quick fix to reach max score</span>
                      <p className="text-indigo-200/90">{item.quickFix}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- off-screen print sheet ----------------
          Every colour here is a literal hex and every layout value is an
          inline style. No Tailwind classes, because Tailwind v4 compiles
          its palette to oklch() and its /opacity modifiers to color-mix(),
          neither of which html2canvas can rasterise. Kept white so the
          exported document is printable. */}
      <div
        id="printable-report-card"
        aria-hidden
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 0,
          width: '880px',
          background: '#ffffff',
          color: '#111827',
          padding: '8px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '13px',
          lineHeight: 1.6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', paddingBottom: '16px', borderBottom: '2px solid #111827' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280' }}>Session audit review</div>
            <div style={{ fontSize: '24px', fontWeight: 700, margin: '6px 0 0' }}>{client}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {coach} · {program} · {callType} · {dateLabel}
            </div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1, color: HEX[overallTone] }}>{evalData.overallPercentage}%</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>{VERDICT[overallTone]}</div>
          </div>
        </div>

        <div style={{ margin: '20px 0 24px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '6px' }}>Transcript summary</div>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#374151' }}>{evalData.transcriptSummary}</p>
        </div>

        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '10px' }}>Rubric breakdown</div>

        {evalData.criteria.map((item, idx) => {
          const tone = toneOf((item.score / item.maxScore) * 100);
          return (
            <div key={item.name} style={{ padding: '12px 0', borderBottom: '1px solid #E5E7EB', breakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{idx + 1}. {item.name}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: HEX[tone], whiteSpace: 'nowrap' }}>{item.score} / {item.maxScore}</div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#374151' }}>
                <strong style={{ fontWeight: 600 }}>Evidence.</strong> {item.evidence}
              </div>
              <div style={{ marginTop: '3px', fontSize: '12px', color: '#4B5563' }}>
                <strong style={{ fontWeight: 600 }}>Quick fix.</strong> {item.quickFix}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '22px', paddingTop: '10px', borderTop: '1px solid #E5E7EB', fontSize: '10.5px', color: '#9CA3AF' }}>
          Evaluation {evalData.id} · generated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}