// app/api/test/token-ai/route.ts
// Test API for Token.ai.vn integration

import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion, CHAT_MODEL } from '@/lib/embeddings'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query') || 'Xin chào, bạn là ai?'
  const stream = searchParams.get('stream') === 'true'

  try {
    console.log(`[Token.ai Test] Testing with model: ${CHAT_MODEL}`)
    console.log(`[Token.ai Test] Query: ${query}`)
    console.log(`[Token.ai Test] Stream: ${stream}`)

    const messages = [
      {
        role: 'system' as const,
        content: 'Bạn là trợ lý AI hữu ích, thân thiện. Trả lời ngắn gọn bằng tiếng Việt.'
      },
      {
        role: 'user' as const,
        content: query
      }
    ]

    const startTime = Date.now()

    if (stream) {
      // Test streaming
      const streamResponse = await generateChatCompletion(messages, { stream: true }) as ReadableStream
      
      // For testing, we'll collect the stream and return the full response
      const reader = streamResponse.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
      }

      const processingTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        model: CHAT_MODEL,
        query,
        response: fullContent,
        streaming: true,
        processingTime
      })
    } else {
      // Test non-streaming
      const response = await generateChatCompletion(messages, { stream: false }) as string
      const processingTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        model: CHAT_MODEL,
        query,
        response,
        streaming: false,
        processingTime
      })
    }
  } catch (error) {
    console.error('[Token.ai Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: CHAT_MODEL
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { query, stream = false, systemPrompt } = body

  if (!query) {
    return NextResponse.json({
      error: 'query is required'
    }, { status: 400 })
  }

  try {
    console.log(`[Token.ai Test POST] Query: ${query}`)

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt || 'Bạn là trợ lý AI hữu ích, thân thiện. Trả lời bằng tiếng Việt.'
      },
      {
        role: 'user' as const,
        content: query
      }
    ]

    const startTime = Date.now()

    if (stream) {
      // Return streaming response
      const streamResponse = await generateChatCompletion(messages, { stream: true }) as ReadableStream
      
      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    } else {
      const response = await generateChatCompletion(messages, { stream: false }) as string
      const processingTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        model: CHAT_MODEL,
        query,
        response,
        processingTime
      })
    }
  } catch (error) {
    console.error('[Token.ai Test POST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}