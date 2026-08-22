export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { evaluateCall } from '../../../llm';
import { supabase } from '../../../supabase';

export async function POST(req: Request) {
  try {
    const { transcript, callType } = await req.json();

    if (!transcript || !callType) {
      return NextResponse.json(
        { error: 'Missing transcript or callType parameter.' },
        { status: 400 }
      );
    }

    const evaluationResult = await evaluateCall(transcript, callType);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        await supabase.from('evaluations').insert([
          {
            call_type: callType,
            transcript,
            result: evaluationResult,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (dbError) {
        console.error('Supabase save error:', dbError);
      }
    }

    return NextResponse.json(evaluationResult);
  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}