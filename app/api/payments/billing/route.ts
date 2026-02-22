import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { billingKey, amount, orderName, customerKey } = await request.json();

    if (!billingKey || !amount || !orderName || !customerKey) {
      return NextResponse.json(
        { message: "필수 파라미터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 토스페이먼츠 빌링 결제 API 호출
    const response = await fetch(
      `https://api.tosspayments.com/v1/billing/${billingKey}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerKey,
          amount,
          orderId: `seller_${customerKey}_${Date.now()}`,
          orderName,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "결제 실패" },
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
