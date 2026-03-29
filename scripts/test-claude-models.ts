import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN_AI_API_KEY = process.env.TOKEN_AI_API_KEY;
const TOKEN_AI_BASE_URL = process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1';

const CLAUDE_MODELS = [
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'claude-3.5-sonnet',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229'
];

async function testClaude(modelName: string) {
  try {
    const response = await fetch(`${TOKEN_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Bạn là ai? Hãy cho biết tên model chính xác của bạn.' }],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      return { model: modelName, error: `Error ${response.status}` };
    }

    const data: any = await response.json();
    return {
      model: modelName,
      returnedModel: data.model,
      content: data.choices?.[0]?.message?.content?.substring(0, 100).replace(/\n/g, ' ') || 'No content'
    };
  } catch (error: any) {
    return { model: modelName, error: error.message };
  }
}

async function runTest() {
  if (!TOKEN_AI_API_KEY) {
    console.error('API Key missing');
    return;
  }

  console.log('--- Testing Claude Models through Token.ai ---');
  
  for (const model of CLAUDE_MODELS) {
    console.log(`Checking [${model}]...`);
    const result = await testClaude(model);
    if (result.error) {
      console.log(`  ❌ ${model} failed: ${result.error}`);
    } else {
      console.log(`  ✅ ${model} worked! \n    Meta: ${result.returnedModel} \n    Claim: ${result.content}...`);
    }
  }
}

runTest();
