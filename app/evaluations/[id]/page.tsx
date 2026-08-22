'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../../supabase';

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleCopy = () => {
    if (report && report.report) {
      navigator.clipboard.writeText(report.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this evaluation report?')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Bumalik sa home page matapos ma-delete
      router.push('/');
    } catch (err: any) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report.');
      setDeleting(false);
    }
  };

  if (loading) return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading report...</main>;
  if (!report) return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Report not found.</main>;

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>← Back to Home</a>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: copied ? '#28a745' : '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {copied ? 'Copied!' : 'Copy Report'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: deleting ? '#ccc' : '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <h1 style={{ marginTop: '1.5rem' }}>Evaluation: {report.call_type}</h1>
      <p style={{ color: '#888' }}>Date: {new Date(report.created_at).toLocaleString()}</p>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#ffffff' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.report}</ReactMarkdown>
      </div>
    </main>
  );
}