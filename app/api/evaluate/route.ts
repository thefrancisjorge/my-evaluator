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

    // 1. Kuhanin ang evaluation result (dapat ito ay string na Markdown)
    const evaluationResult = await evaluateCall(transcript, callType);

    // Siguraduhing string ito
    const markdownOutput = typeof evaluationResult === 'string' 
      ? evaluationResult 
      : JSON.stringify(evaluationResult);

    // 2. I-save sa Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error: dbError } = await supabase.from('evaluations').insert([
          {
            call_type: callType,
            transcript: transcript,
            report: markdownOutput, // Siguraduhing 'report' ang pangalan ng column sa table mo
            created_at: new Date().toISOString(),
          },
        ]);
        
        if (dbError) console.error('Supabase insert error:', dbError);
      } catch (dbError) {
        console.error('Supabase connection error:', dbError);
      }
    }

    // 3. Ibalik sa frontend bilang rawOutput
    return NextResponse.json({ rawOutput: markdownOutput });
    
  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}