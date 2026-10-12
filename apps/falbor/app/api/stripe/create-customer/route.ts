import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Mock customer creation so the UI doesn't crash on 404
  return NextResponse.json({ customerId: 'cus_mock_' + Math.random().toString(36).slice(2) })
}
