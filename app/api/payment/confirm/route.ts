import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount, participantId } = await request.json();

    // 토스페이먼츠 결제 승인 요청
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "결제 승인 실패" },
        { status: 400 }
      );
    }

    // 결제 성공 시 DB 업데이트
    const { error } = await supabase
      .from("group_buy_participants")
      .update({
        status: "paid",
        is_paid: true,
        payment_method: "card",
        payment_key: paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq("id", participantId);

    if (error) {
      console.error("DB 업데이트 실패:", error);
      return NextResponse.json(
        { success: false, message: "결제는 완료되었으나 DB 업데이트 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("결제 승인 에러:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}