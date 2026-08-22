export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { evaluateCall } from '@/lib/llm';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { transcript, callType, coach, client, program } = await req.json();

    if (!transcript || !callType) {
      return NextResponse.json(
        { error: 'Missing transcript or callType parameter.' },
        { status: 400 }
      );
    }

    const evaluationResult = await evaluateCall(transcript, callType);
    const markdownOutput = typeof evaluationResult === 'string' 
      ? evaluationResult 
      : JSON.stringify(evaluationResult);

    // Tanggalin muna ang coach, client, program kung wala pa sa DB schema
    const { data, error: dbError } = await supabaseAdmin.from('evaluations').insert([
      {
        call_type: callType,
        transcript: transcript,
        result: markdownOutput,
        status: 'done',
      },
    ]).select('id').single();
    
    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return NextResponse.json({ error: `Database save failed: ${dbError.message}` }, { status: 500 });
    }

    if (!data?.id) {
      return NextResponse.json({ error: 'Evaluation saved, but no ID was returned from database.' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, report: markdownOutput });
    
  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}