export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { evaluateCall } from '@/lib/llm';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { transcript, callType, coach, client, program } = await req.json();

    if (!transcript || !callType) {
      return NextResponse.json(
        { error: 'Missing transcript or callType parameter.' },
        { status: 400 }
      );
    }

    // 1. I-run ang AI evaluation
    const evaluationResult = await evaluateCall(transcript, callType);
    const markdownOutput = typeof evaluationResult === 'string' 
      ? evaluationResult 
      : JSON.stringify(evaluationResult);

    // Gumawa muna ng random UUID kung sakaling hindi pumasok sa database
    let insertedId = crypto.randomUUID();

    // 2. Subukang i-save sa Supabase kung gumagana
    try {
      const { data, error: dbError } = await supabase.from('evaluations').insert([
        {
          id: insertedId, // I-pilit natin gamitin ang UUID na ito
          call_type: callType,
          transcript: transcript,
          coach: coach || null,
          client: client || null,
          program: program || null,
          result: markdownOutput,
          status: 'done',
        },
      ]).select('id').single();
      
      if (dbError) {
        console.error('Supabase insert warning (falling back to generated ID):', dbError);
      } else if (data?.id) {
        insertedId = data.id;
      }
    } catch (dbError) {
      console.error('Supabase connection exception:', dbError);
    }

    // Siguraduhing may maibabalik na ID anumang mangyari
    return NextResponse.json({ id: insertedId, report: markdownOutput });
    
  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}