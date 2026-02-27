
'use client'

import { sendGAEvent } from '@next/third-parties/google'

/**
 * Log AI Chat message event
 */
export const trackAIChat = (messageCount: number, language: string) => {
  sendGAEvent('event', 'ai_chat_message', {
    message_count: messageCount,
    language: language,
  })
}

/**
 * Log Doc Rating event
 */
export const trackDocRating = (docTitle: string, rating: number, language: string) => {
  sendGAEvent('event', 'doc_rating', {
    doc_title: docTitle,
    rating: rating,
    language: language,
  })
}

/**
 * Log Doc Share event
 */
export const trackDocShare = (docTitle: string, platform: string, language: string) => {
  sendGAEvent('event', 'doc_share', {
    doc_title: docTitle,
    platform: platform,
    language: language,
  })
}
