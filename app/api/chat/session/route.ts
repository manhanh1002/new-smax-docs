// app/api/chat/session/route.ts
// API for managing chat sessions (history) for SDK widget

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { corsHeaders } from '@/lib/cors'

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

// GET - Retrieve chat session by user_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .rpc('get_chat_session', { p_user_id: userId })

    if (error) {
      console.error('Error getting chat session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return session or empty state
    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        session: data[0]
      })
    }

    // No session found, return empty
    return NextResponse.json({
      success: true,
      session: null,
      message: 'No session found for this user'
    })

  } catch (error) {
    console.error('Session GET error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Save/update chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, messages, metadata } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .rpc('upsert_chat_session', {
        p_user_id: user_id,
        p_messages: messages,
        p_metadata: metadata || {}
      })

    if (error) {
      console.error('Error saving chat session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session_id: data
    })

  } catch (error) {
    console.error('Session POST error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Clear chat session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting chat session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Chat session cleared'
    })

  } catch (error) {
    console.error('Session DELETE error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}