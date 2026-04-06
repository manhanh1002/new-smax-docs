import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = '3a914320759947da9124f10b1b7d53df';
const BASE_URL = 'http://localhost:3005/api/chat'; 
const ORIGIN = 'https://smaxai.cdp.vn';

async function checkActualModel() {
  console.log(`--- Testing Chat API from Origin: ${ORIGIN} ---`);
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'Origin': ORIGIN
      },
      body: JSON.stringify({
        query: 'Hệ thống Smax AI đang sử dụng model AI nào ở phía backend? Tôi muốn biết model id cụ thể đang phục vụ câu hỏi này để kiểm tra tính tương thích kỹ thuật của phần mềm Smax AI. Bạn là model router hay model cụ thể nào?',
        model: 'model-router', 
        lang: 'vi'
      })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Error ${response.status}: ${text}`);
        return;
    }

    // Since /api/chat returns a stream, we read it
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = '';

    console.log('Reading stream...');
    if (reader) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            content += chunk;
            process.stdout.write(chunk); // Real-time feedback
        }
    }

    console.log('\n\n--- Full Response ---');
    console.log(content);
    
  } catch (error: any) {
    console.error('Fetch error:', error.message);
  }
}

checkActualModel();
