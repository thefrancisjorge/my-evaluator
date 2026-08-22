'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../../supabase';

export default function EvaluationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('id', id)
          .single();

        if (data) setReport(data);
        if (error) console.error('Error fetching report:', error);
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReport();
  }, [id]);

  if (loading) return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading report...</main>;
  if (!report) return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Report not found.</main>;

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <a href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>← Back to Home</a>
      <h1 style={{ marginTop: '1rem' }}>Evaluation: {report.call_type}</h1>
      <p style={{ color: '#888' }}>Date: {new Date(report.created_at).toLocaleString()}</p>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#ffffff' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.report}</ReactMarkdown>
      </div>
    </main>
  );
}