// lib/embeddings.ts
// Handles chunking and embedding generation using Google Gemini API
// for both embeddings and chat completions

import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from './supabase-admin'

// Configure Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Embedding model - Google Gemini gemini-embedding-001 with Matryoshka Embeddings
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'models/gemini-embedding-001'

// Chat model for RAG responses - Gemini Flash 1.5
export const CHAT_MODEL = process.env.CHAT_MODEL || 'gemini-1.5-flash'

// Gemini embedding-001 dimension is 3072, but we use 768 for Matryoshka Embeddings
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

// Function to generate embedding using Google Gemini gemini-embedding-001
// Uses Matryoshka Embeddings with outputDimensionality=768 for optimal storage
export async function generateEmbedding(text: string): Promise<number[]> {
  // Normalize text: remove excessive newlines
  const input = text.replace(/\n+/g, ' ').trim()

  try {
    // Use the embedContent API with outputDimensionality for Matryoshka Embeddings
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
          outputDimensionality: EMBEDDING_DIMENSION, // 768 for optimal storage
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

// Function to generate chat completion using Google Gemini Flash 1.5
export async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { stream?: boolean }
): Promise<string | ReadableStream> {
  try {
    const model = genAI.getGenerativeModel({ model: CHAT_MODEL })
    
    // Convert messages to Gemini format
    // Gemini uses a different format: system instruction + chat history
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const chatHistory = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
    
    // Start chat with system instruction if provided
    // Note: systemInstruction must be an object with parts, not a string
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
      // Return a ReadableStream for streaming responses
      const result = await chat.sendMessageStream(lastUserMessage)
      const encoder = new TextEncoder()
      
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const content = chunk.text()
              if (content) {
                controller.enqueue(encoder.encode(content))
              }
            }
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })
    } else {
      // Return the complete response
      const result = await chat.sendMessage(lastUserMessage)
      return result.response.text()
    }
  } catch (error) {
    console.error('Error generating chat completion with Gemini:', error)
    throw error
  }
}

// Function to process a document: generate embedding and update documents table
export async function processDocumentForRAG(documentId: string, content: string) {
  // 1. Generate embedding for the full document content
  // For large documents, you might want to chunk and store separately
  // For simplicity, we'll generate a single embedding for the whole document
  
  console.log(`Processing document ${documentId}`)

  try {
    // Truncate content if too long (Gemini has limits)
    const truncatedContent = content.length > 8000 ? content.slice(0, 8000) : content
    
    const embedding = await generateEmbedding(truncatedContent)

    // 2. Update the document with the embedding
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ 
        embedding,
        content: truncatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Failed to update document embedding: ${updateError.message}`)
    }

    console.log(`Successfully processed document ${documentId}`)
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error)
    throw error
  }
}
