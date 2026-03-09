// lib/embeddings.ts
// Handles chunking and embedding generation using Google Gemini API for embeddings
// and Token.ai.vn (OpenAI-compatible) for chat completions

import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from './supabase-admin'

// Configure Google Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Embedding model - Google Gemini text-embedding-004
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'models/text-embedding-004'

// Chat model for RAG responses - Token.ai.vn (OpenAI-compatible)
export const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'

// Token.ai.vn configuration (OpenAI-compatible API)
const TOKEN_AI_API_KEY = process.env.TOKEN_AI_API_KEY || ''
const TOKEN_AI_BASE_URL = process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1'

// GPT configuration for post-processing
export const POST_PROCESSING_MODEL = process.env.POST_PROCESSING_MODEL || process.env.CHAT_MODEL || 'gpt-4o-mini'
const POST_PROCESSING_API_KEY = process.env.POST_PROCESSING_API_KEY || process.env.TOKEN_AI_API_KEY || ''
const POST_PROCESSING_BASE_URL = process.env.POST_PROCESSING_BASE_URL || 'https://token.ai.vn/v1'

// Gemini text-embedding-004 dimension is 768
export const EMBEDDING_DIMENSION = 768

export interface ChunkResult {
  content: string
  embedding: number[]
  tokenCount: number
}

// Simple text splitter (no langchain dependency)
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  // Split by markdown headers first
  const sections = text.split(/(?=^#{1,6}\s)/m)
  
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const section of sections) {
    if (!section.trim()) continue
    
    // If adding this section would exceed chunk size
    if (currentChunk.length + section.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      
      // Handle overlap - keep last N characters
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + section
    } else {
      currentChunk += section
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  // If chunks are still too large, split by paragraphs
  const finalChunks: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= chunkSize) {
      finalChunks.push(chunk)
    } else {
      // Split by paragraphs
      const paragraphs = chunk.split('\n\n')
      let subChunk = ''
      
      for (const para of paragraphs) {
        if (subChunk.length + para.length > chunkSize && subChunk.length > 0) {
          finalChunks.push(subChunk.trim())
          subChunk = para
        } else {
          subChunk += '\n\n' + para
        }
      }
      
      if (subChunk.trim()) {
        finalChunks.push(subChunk.trim())
      }
    }
  }
  
  return finalChunks.filter(c => c.length > 50) // Filter out very small chunks
}

// Function to generate embedding using Google Gemini embedding-001 (fallback)
export async function generateEmbeddingFallback(text: string): Promise<number[]> {
  const input = text.replace(/\n+/g, ' ').trim()

  try {
    // Try using google-generative-ai SDK with "models/embedding-001" and v1beta API
    // This is the most standard way to call it
    const model = genAI.getGenerativeModel({ model: "models/embedding-001" });
    const result = await model.embedContent(input);
    const embedding = result.embedding.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid fallback embedding response')
    }
    
    return embedding
  } catch (error) {
    console.error('Error generating fallback embedding:', error)
    throw error
  }
}

// Function to generate embedding using Google Gemini gemini-embedding-001
// Uses Matryoshka Embeddings with outputDimensionality=768 for optimal storage
// Based on reference implementation from manhanh1002/tai-lieu-smax
export async function generateEmbedding(text: string): Promise<number[]> {
  // Normalize text: remove excessive newlines
  const input = text.replace(/\n+/g, ' ').trim()

  try {
    // Use the embedContent API with outputDimensionality for Matryoshka Embeddings
    // Using v1beta and gemini-embedding-001 as proven in reference repo
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: input }],
          },
          outputDimensionality: 768, // 768 for optimal storage
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `Embedding API error: ${response.status}`)
    }

    const data = await response.json()
    const embedding = data.embedding?.values

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Gemini API')
    }

    return embedding
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error)
    throw error
  }
}

// Function to generate chat completion using Google Gemini Flash 1.5 (backup)
export async function generateChatCompletionWithGemini(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { stream?: boolean }
): Promise<string | ReadableStream> {
  // Helper to call Gemini with specific model
  const callGemini = async (modelName: string) => {
    const model = genAI.getGenerativeModel({ model: modelName })
    
    // Convert messages to Gemini format
    // Gemini uses a different format: system instruction + chat history
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    
    // Filter out system messages and ensure alternating user/model roles
    const rawHistory = messages.filter(m => m.role !== 'system')
    const chatHistory = []
    
    // Ensure history starts with user and alternates
    // Also limit context window to last 10 messages for performance
    const recentMessages = rawHistory.slice(-10)
    
    for (let i = 0; i < recentMessages.length - 1; i++) {
      const msg = recentMessages[i]
      // Skip if role is same as previous (shouldn't happen with proper history but safety check)
      if (i > 0 && chatHistory[chatHistory.length - 1].role === (msg.role === 'assistant' ? 'model' : 'user')) {
        continue
      }
      
      chatHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }
    
    // Start chat with system instruction if provided
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemMessage ? {
        parts: [{ text: systemMessage }],
        role: 'system'
      } : undefined,
    })
    
    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    
    if (options?.stream) {
      const result = await chat.sendMessageStream(lastUserMessage)
      const encoder = new TextEncoder()
      
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text()
              if (text) {
                controller.enqueue(encoder.encode(text))
              }
            }
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })
    } else {
      const result = await chat.sendMessage(lastUserMessage)
      return result.response.text()
    }
  }

  try {
    // List of models to try in order - prioritize Flash models for speed
    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-flash-latest',
      'gemini-pro'
    ]

    let lastError = null
    
    // Try with a timeout for each model to ensure responsiveness
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini] Trying model: ${modelName}`)
        // Add timeout promise race
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        )
        
        return await Promise.race([
          callGemini(modelName),
          timeoutPromise
        ]) as string | ReadableStream
      } catch (error) {
        console.warn(`[Gemini] Model ${modelName} failed or timed out:`, error)
        lastError = error
        // Continue to next model
      }
    }
    
    // If all failed
    throw lastError || new Error('All Gemini models failed')
  } catch (error) {
    console.error('Error generating chat completion with Gemini:', error)
    throw error
  }
}

// Function to generate chat completion using Token.ai (OpenAI Compatible) or Gemini as fallback
export async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { stream?: boolean }
): Promise<string | ReadableStream> {
  const apiKey = process.env.TOKEN_AI_API_KEY
  
  // If TOKEN_AI_API_KEY is missing, fallback to Gemini
  if (!apiKey) {
    console.log('[Chat] TOKEN_AI_API_KEY missing, falling back to Gemini')
    return generateChatCompletionWithGemini(messages, options)
  }

  // Determine base URL - use proxy on Vercel to bypass IP restrictions if needed
  // But rewrites only work for client-side fetches or server-side fetches to SELF (localhost)
  // Since we are running on server, we can't easily use the rewrite to mask IP unless we fetch localhost
  
  // Strategy:
  // 1. If running locally (dev), use direct URL
  // 2. If running on Vercel, we can't change the outgoing IP easily
  // 3. The user asked to "whitelist" -> We can't do that, Vercel IP is dynamic
  // 4. So we try to use a proxy service or just fallback to Gemini if blocked
  
  const baseUrl = process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1'
  const model = process.env.CHAT_MODEL || 'gpt-5-chat'

  try {
    console.log(`[Chat] Calling Token.ai API with model: ${model}`)
    
    // Using simple headers as local test proved they work fine
    // Removed complex User-Agent/Referer headers as they might be triggering WAF on Vercel
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 1000,
        stream: options?.stream || false
      }),
      // Keep timeout reasonable
      signal: AbortSignal.timeout(60000) 
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Chat] Token.ai API error: ${response.status} - ${errorText}`)
      throw new Error(`Chat API error: ${response.status} - ${errorText}`)
    }

    if (options?.stream) {
      // Return the raw stream directly from the response
      if (!response.body) {
        throw new Error('Response body is null')
      }
      return response.body
    } else {
      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    }
  } catch (error) {
    console.error('[Chat] Critical Error with Token.ai:', error)
    throw error // No fallback to Gemini as requested
  }
}

// Helper: Sleep function for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Function to process a document: chunk content, generate embeddings, and store in document_sections table
// IMPROVED: Sequential processing with rate limiting and retry logic
export async function processDocumentForRAG(documentId: string, content: string) {
  console.log(`[RAG] Processing document ${documentId}`)
  
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 5000
  const CHUNK_DELAY_MS = 1500 // Rate limiting delay between chunks
  
  try {
    // 0. Check if content is valid
    if (!content || content.trim().length < 50) {
      console.warn(`[RAG] Document ${documentId} has insufficient content (${content?.length || 0} chars), skipping`)
      return { success: true, chunksProcessed: 0, reason: 'insufficient_content' }
    }
    
    // 1. Split content into chunks
    const chunks = splitTextIntoChunks(content, 1000, 200)
    console.log(`[RAG] Split document into ${chunks.length} chunks`)
    
    if (chunks.length === 0) {
      console.warn(`[RAG] No chunks generated for document ${documentId}`)
      return { success: true, chunksProcessed: 0, reason: 'no_chunks' }
    }

    // 2. Delete existing sections for this document to avoid duplicates
    const { error: deleteError } = await supabaseAdmin
      .from('document_sections')
      .delete()
      .eq('document_id', documentId)
    
    if (deleteError) {
      console.error(`[RAG] Failed to delete existing sections: ${deleteError.message}`)
      // Continue anyway - might not have existing sections
    }
    
    // 3. Process each chunk SEQUENTIALLY with rate limiting (not Promise.all)
    let successCount = 0
    let failedChunks: number[] = []
    
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      
      // Retry logic for each chunk
      let chunkSuccess = false
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          // Generate embedding for this chunk
          const embedding = await generateEmbedding(chunk)
          
          // Insert chunk into document_sections table
          const { error } = await supabaseAdmin
            .from('document_sections')
            .insert({
              document_id: documentId,
              content: chunk,
              embedding: embedding,
              chunk_index: index,
              chunk_count: chunks.length
            })
          
          if (error) {
            throw new Error(`Insert failed: ${error.message}`)
          }
          
          successCount++
          chunkSuccess = true
          console.log(`[RAG] Chunk ${index + 1}/${chunks.length} processed successfully`)
          break // Success, exit retry loop
          
        } catch (error) {
          console.error(`[RAG] Chunk ${index} attempt ${retry + 1}/${MAX_RETRIES} failed:`, error)
          
          if (retry < MAX_RETRIES - 1) {
            console.log(`[RAG] Retrying in ${RETRY_DELAY_MS}ms...`)
            await sleep(RETRY_DELAY_MS)
          }
        }
      }
      
      if (!chunkSuccess) {
        failedChunks.push(index)
      }
      
      // Rate limiting: delay between chunks (except for last chunk)
      if (index < chunks.length - 1) {
        await sleep(CHUNK_DELAY_MS)
      }
    }
    
    // 4. Update document timestamp (chunk_count column doesn't exist in schema)
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
    
    if (updateError) {
      console.error(`[RAG] Failed to update document timestamp: ${updateError.message}`)
      // Don't throw - chunks are already saved
    }
    
    // 5. Log result
    if (failedChunks.length > 0) {
      console.warn(`[RAG] Document ${documentId} processed with ${failedChunks.length} failed chunks: ${failedChunks.join(', ')}`)
    } else {
      console.log(`[RAG] Successfully processed document ${documentId} with ${successCount}/${chunks.length} chunks`)
    }
    
    return { 
      success: successCount > 0, 
      chunksProcessed: successCount, 
      totalChunks: chunks.length,
      failedChunks 
    }
    
  } catch (error) {
    console.error(`[RAG] Failed to process document ${documentId}:`, error)
    throw error
  }
}

// Function to post-process response using GPT-4o-mini or Gemini for better formatting
export async function postProcessResponseWithGPT(
  originalResponse: string,
  context: string
): Promise<string> {
  try {
    const apiKey = process.env.POST_PROCESSING_API_KEY || process.env.TOKEN_AI_API_KEY
    
    // If no OpenAI-compatible key, fallback to Gemini for post-processing
    if (!apiKey) {
      console.log('[Post-processing] No OpenAI-compatible key, falling back to Gemini')
      const messages = [
        {
          role: 'user' as const,
          content: `Hãy viết lại đoạn văn bản sau cho hoàn chỉnh, đẹp và chuyên nghiệp hơn:\n\nINPUT:\n${originalResponse}\n\nCONTEXT (thông tin tham khảo để trích dẫn URL chính xác):\n${context}\n\nYÊU CẦU:\n1. Sửa lỗi mất ký tự đầu (nếu có)\n2. Định dạng lại bằng Markdown chuyên nghiệp\n3. Đảm bảo URL trích dẫn chính xác từ CONTEXT (không tự invent URL)\n4. Giữ nguyên nội dung chính, chỉ cải thiện format và sửa lỗi\n5. Trả về văn bản đã được xử lý`
        }
      ]
      const result = await generateChatCompletionWithGemini(messages, { stream: false })
      return typeof result === 'string' ? result : originalResponse
    }

    console.log(`[Post-processing] Using model: ${POST_PROCESSING_MODEL}`)
    
    // Post-processing prompt
    const postProcessingPrompt = `
Hãy viết lại đoạn văn bản sau cho hoàn chỉnh, đẹp và chuyên nghiệp hơn:

INPUT:
${originalResponse}

CONTEXT (thông tin tham khảo để trích dẫn URL chính xác):
${context}

YÊU CẦU:
1. Sửa lỗi mất ký tự đầu (nếu có)
2. Định dạng lại bằng Markdown chuyên nghiệp
3. Đảm bảo URL trích dẫn chính xác từ CONTEXT (không tự invent URL)
4. Giữ nguyên nội dung chính, chỉ cải thiện format và sửa lỗi
5. Trả về văn bản đã được xử lý

OUTPUT (chỉ trả về văn bản đã xử lý, không giải thích gì thêm):
`

    const apiResponse = await fetch(`${POST_PROCESSING_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POST_PROCESSING_API_KEY}`
      },
      body: JSON.stringify({
        model: POST_PROCESSING_MODEL,
        messages: [
          {
            role: 'user',
            content: postProcessingPrompt
          }
        ],
        temperature: 0.3, // Low temperature for more consistent output
        max_tokens: 2048
      })
    })

    if (!apiResponse.ok) {
      const error = await apiResponse.text()
      console.warn(`[Post-processing] API error: ${apiResponse.status} - ${error}. Returning original response.`)
      return originalResponse
    }

    const data = await apiResponse.json()
    const processedContent = data.choices?.[0]?.message?.content || originalResponse
    
    return processedContent
  } catch (error) {
    console.error('[Post-processing] Error:', error)
    // Return original response if post-processing fails
    return originalResponse
  }
}
