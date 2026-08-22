export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { evaluateCall } from '@/lib/llm';
import { supabase } from '@/lib/supabase';

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

    let insertedId = null;

    // I-save sa Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data, error: dbError } = await supabase.from('evaluations').insert([
          {
            call_type: callType,
            transcript: transcript,
            coach: coach || null,
            client: client || null,
            program: program || null,
            result: markdownOutput,
            status: 'done',
            created_at: new Date().toISOString(),
          },
        ]).select('id').single();
        
        if (dbError) {
          console.error('Supabase insert error details:', JSON.stringify(dbError, null, 2));
        } else if (data) {
          insertedId = data.id;
          console.log('Successfully saved to Supabase:', data);
        }
      } catch (dbError) {
        console.error('Supabase connection error:', dbError);
      }
    } else {
      console.warn('Supabase environment variables are missing on the server!');
    }

    return NextResponse.json({ id: insertedId, report: markdownOutput });
    
  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}