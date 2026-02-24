// sdk/src/fingerprint.ts
// Generate unique user ID based on browser fingerprint

interface FingerprintData {
  userAgent: string
  language: string
  platform: string
  screenResolution: string
  timezone: string
  colorDepth: number
  deviceMemory?: number
  hardwareConcurrency?: number
}

async function getFingerprintData(): Promise<FingerprintData> {
  const data: FingerprintData = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
  }

  // Add optional properties if available
  if ('deviceMemory' in navigator) {
    data.deviceMemory = (navigator as any).deviceMemory
  }
  if ('hardwareConcurrency' in navigator) {
    data.hardwareConcurrency = navigator.hardwareConcurrency
  }

  return data
}

// Simple hash function for fingerprint
async function hashFingerprint(data: FingerprintData): Promise<string> {
  const str = JSON.stringify(data)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(str)
  
  // Use SubtleCrypto for hashing
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex.substring(0, 32) // Use first 32 chars as user ID
}

// Get or create user ID
export async function getUserId(): Promise<string> {
  const STORAGE_KEY = 'smaxai_user_id'
  
  // Check localStorage first
  const storedId = localStorage.getItem(STORAGE_KEY)
  if (storedId) {
    return storedId
  }

  // Generate new ID from fingerprint
  const fingerprintData = await getFingerprintData()
  const userId = await hashFingerprint(fingerprintData)
  
  // Store for future use
  localStorage.setItem(STORAGE_KEY, userId)
  
  return userId
}

// Clear user ID (for logout/clear)
export function clearUserId(): void {
  const STORAGE_KEY = 'smaxai_user_id'
  localStorage.removeItem(STORAGE_KEY)
}