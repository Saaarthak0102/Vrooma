import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    // Stub response for Phase 1; wired to Vercel AI SDK in Phase 5
    return NextResponse.json({
      ok: true,
      data: {
        reply: `Thank you for your inquiry about "${message}". A showroom specialist at Hazratganj is ready to assist you.`,
        mode: "mock_stub",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

