import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { transcript, callType } = await req.json();

    if (!transcript || !callType) {
      return NextResponse.json({ error: 'Missing transcript or call type' }, { status: 400 });
    }

    const mockReport = {
      gradeBand: 'Good',
      finalScore: 85,
      theOneThing: 'Improve objection handling during price presentation.',
      theBrief: 'The coach maintained good rapport but missed closing signals.',
      redFlags: 'Client expressed confusion about timeline.',
      evaluations: []
    };

    const { data, error } = await supabase
      .from('evaluations')
      .insert([{ call_type: callType, transcript, report_json: mockReport }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id, report: mockReport });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Evaluation error' }, { status: 500 });
  }
}