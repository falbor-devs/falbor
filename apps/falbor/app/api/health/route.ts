import { NextResponse } from "next/server";
const json = NextResponse.json;

export async function GET() {
  return json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
