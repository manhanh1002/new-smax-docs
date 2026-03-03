// app/api/test/connection/route.ts
// Simple API endpoint to test connection - responds with "có" (yes in Vietnamese)

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "có",
    timestamp: new Date().toISOString(),
    status: "connected"
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: "có",
    timestamp: new Date().toISOString(),
    status: "connected"
  })
}