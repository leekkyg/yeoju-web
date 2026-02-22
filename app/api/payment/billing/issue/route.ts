import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { authKey, customerKey, userId } = await request.json();

    const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || '빌링키 발급 실패' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('payment_methods').insert({
      user_id: userId,
      billing_key: data.billingKey,
      card_company: data.card?.acquirerCode || data.card?.issuerCode,
      card_number: data.card?.number,
      card_type: data.card?.cardType,
      is_default: true,
    });

    if (error) {
      console.error('DB 저장 오류:', error);
      return NextResponse.json(
        { success: false, message: 'DB 저장 실패' },
        { status: 500 }
      );
    }

    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId)
      .neq('billing_key', data.billingKey);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('빌링키 발급 오류:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}