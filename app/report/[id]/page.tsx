'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ReportPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: record } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();
      if (record) setData(record);
    }
    if (id) load();
  }, [id]);

  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('pdf-report');
    html2pdf().from(element).save(`Bievermind-Report-${id}.pdf`);
  };

  if (!data) return <div className="p-8 text-center">Loading Report...</div>;

  const r = data.report_json;

  return (
    <main className="max-w-4xl mx-auto p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Evaluation Report</h1>
        <button
          onClick={handleDownloadPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
        >
          Download PDF
        </button>
      </div>

      <div id="pdf-report" className="space-y-6 bg-white p-6 border rounded shadow-sm">
        <div className="border-b pb-4">
          <p className="text-sm text-gray-500">Call Type: {data.call_type}</p>
          <div className="text-3xl font-extrabold mt-1">
            Grade Band: <span className="text-blue-600">{r.gradeBand || 'Inconsistent'}</span> ({r.finalScore || 0}/100)
          </div>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
          <h3 className="font-bold text-amber-900">The One Thing</h3>
          <p className="text-amber-800">{r.theOneThing}</p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <h3 className="font-bold text-blue-900">The Brief</h3>
          <p className="text-blue-800">{r.theBrief}</p>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <h3 className="font-bold text-red-900">Red Flags</h3>
          <p className="text-red-800">{r.redFlags}</p>
        </div>
      </div>
    </main>
  );
}