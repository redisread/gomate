import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/locations-log
 * Debug endpoint to log locations loading
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.error("[LocationsLog]", data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LocationsLog] Error:", error);
    return NextResponse.json({ error: "Log error" }, { status: 500 });
  }
}
