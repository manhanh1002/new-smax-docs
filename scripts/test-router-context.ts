import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN_AI_API_KEY = process.env.TOKEN_AI_API_KEY;
const TOKEN_AI_BASE_URL = process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1';
const TEST_MODEL = 'model-router';

// Sequential conversation messages
const CONVERSATION_STEPS = [
  {
    label: "Step 1: Introduction",
    query: "Chào bạn. Tôi tên là Smax. Tôi rất thích ăn phở bò và ghét ăn hành. Bạn hãy nhớ thông tin này nhé."
  },
  {
    label: "Step 2: Simple Recall",
    query: "Cho tôi hỏi lại, tôi tên là gì và gu ăn uống của tôi như thế nào?"
  },
  {
    label: "Step 3: Reasoning based on context",
    query: "Ngày mai tôi đi du lịch Hà Nội. Bạn có gợi ý địa điểm ăn uống nào phù hợp với sở thích của tôi không? Hãy giải thích tại sao bạn chọn món đó."
  },
  {
    label: "Step 4: Persistence check",
    query: "Nếu một người bạn của tôi hỏi về thói quen ăn uống của tôi, bạn sẽ mô tả như thế nào chỉ trong 1 câu ngắn gọn?"
  }
];

async function runContextTest() {
  if (!TOKEN_AI_API_KEY) {
    console.error('API Key missing');
    return;
  }

  console.log(`--- Testing Context & History for Model: ${TEST_MODEL} ---`);
  
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const step of CONVERSATION_STEPS) {
    console.log(`\n[${step.label}]`);
    console.log(`User: ${step.query}`);
    
    // Add current query to history
    history.push({ role: 'user', content: step.query });

    try {
      const response = await fetch(`${TOKEN_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN_AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: TEST_MODEL,
          messages: history, // Send full history
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error(`  ❌ Error ${response.status}`);
        break;
      }

      const data: any = await response.json();
      const assistantRawContent = data.choices?.[0]?.message?.content || '';
      
      console.log(`Assistant (Model: ${data.model}):`);
      console.log(`> ${assistantRawContent}`);
      
      // Add assistant response to history
      history.push({ role: 'assistant', content: assistantRawContent });

    } catch (error) {
      console.error(`  ❌ Fetch error:`, error);
      break;
    }
  }

  console.log('\n--- Context Verification Summary ---');
  const lastResponse = history[history.length - 1].content.toLowerCase();
  const includesSmax = lastResponse.includes('smax');
  const includesPhoBo = lastResponse.includes('phở bò') || lastResponse.includes('phobo');
  const includesHanh = lastResponse.includes('hành') || lastResponse.includes('ghét');

  console.log(`Remembers Name (Smax): ${includesSmax ? '✅ Yes' : '❌ No'}`);
  console.log(`Remembers Likes (Phở bò): ${includesPhoBo ? '✅ Yes' : '❌ No'}`);
  console.log(`Remembers Dislikes (Ghét hành): ${includesHanh ? '✅ Yes' : '❌ No'}`);
}

runContextTest();
