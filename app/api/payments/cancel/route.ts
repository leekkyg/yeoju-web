import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, cancelReason } = await request.json();

    if (!paymentKey) {
      return NextResponse.json(
        { message: "paymentKey가 필요합니다" },
        { status: 400 }
      );
    }

    // 토스페이먼츠 결제 취소 API 호출
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: cancelReason || "관리자 거절",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "결제 취소 실패" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "서버 오류" },
      { status: 500 }
    );
  }
}
