import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { billingKey, amount, orderId, orderName, customerKey, participantId } = await request.json();

    const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        orderId,
        orderName,
        customerKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || '결제 실패' },
        { status: 400 }
      );
    }

    if (participantId) {
      const { error } = await supabase
        .from('group_buy_participants')
        .update({
          status: 'paid',
          is_paid: true,
          payment_method: 'card',
          payment_key: data.paymentKey,
          paid_at: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (error) {
        console.error('DB 업데이트 오류:', error);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('빌링키 결제 오류:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}