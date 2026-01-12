import { NextRequest, NextResponse } from "next/server";

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "67dfc9cd-9827-4481-bc98-66627a0eed45";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { title, message, url } = await request.json();

    if (!ONESIGNAL_REST_API_KEY) {
      return NextResponse.json({ error: "OneSignal API Key 미설정" }, { status: 500 });
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"], // 모든 구독자에게 발송
        headings: { en: title, ko: title },
        contents: { en: message, ko: message },
        url: url ? `${process.env.NEXT_PUBLIC_BASE_URL || "https://yeoju.market"}${url}` : undefined,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({ error: data.errors }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      recipients: data.recipients,
      id: data.id 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
