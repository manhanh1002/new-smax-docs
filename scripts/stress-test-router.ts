import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN_AI_API_KEY = process.env.TOKEN_AI_API_KEY;
const TOKEN_AI_BASE_URL = process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1';
const TEST_MODEL = 'model-router';

const QUESTIONS = [
  "Chào bạn, bạn là model nào?",
  "Bạn dùng kiến trúc gì vậy?",
  "Who created you and what is your model ID?",
  "Giải phương trình x^2 - 5x + 6 = 0. Bạn là model nào?",
  "Viết code bằng Python để tính dãy Fibonacci. Bạn là model gì?",
  "What is the current capital of France? Also tell me your model name.",
  "Dịch sang tiếng Anh: 'Tôi là trí tuệ nhân tạo'. Bạn là model nào?",
  "Explain quantum entanglement. Which model are you?",
  "Ai là người sáng lập ra OpenAI? Bạn thuộc model nào?",
  "Tính 1234 * 5678. Cho biết tên model của bạn.",
  "What is the square root of 144? Tell me your identity.",
  "Làm thế nào để học lập trình hiệu quả? Bạn là AI nào?",
  "Viết một bài thơ ngắn về hoa sen. Bạn là model gì?",
  "Who is the current President of the USA? Also, your model name please.",
  "Giải thích định luật vạn vật hấp dẫn. Bạn là model nào?",
  "What is the largest ocean on Earth? Identify yourself.",
  "Code một function JavaScript tính giai thừa. Bạn là model gì?",
  "Tại sao bầu trời có màu xanh? Cho biết model của bạn.",
  "Tell me a joke. And what is your model name?",
  "Làm món phở bò như thế nào? Bạn là trí tuệ nhân tạo nào?",
  "What is 2+2? Tell me your engine name.",
  "Bạn có phải là GPT-4 không?",
  "Are you Claude or Gemini?",
  "Tell me about your training data. Which model are you?",
  "Explain the theory of relativity. Your model id?",
  "Viết email xin nghỉ phép bằng tiếng Việt. Bạn là model nào?",
  "How many continents are there? Name your model.",
  "Viết code CSS để căn giữa một div. Bạn là model gì?",
  "What is the chemical formula for water? Your identity?",
  "Ai thắng World Cup 2022? Bạn là model nào?",
  "How do you feel today? (Just kidding, tell me your model name).",
  "Giải thích về Blockchain. Bạn là model nào?",
  "What is the speed of light? Your engine name?",
  "Viết 1 đoạn văn kể về chuyến du lịch lý tưởng. Bạn là model gì?",
  "Who is Elon Musk? Which AI are you?",
  "Tính tích phân của x^2. Bạn là model nào?",
  "What is the boiling point of gold? Your identity?",
  "Làm sao để nấu cơm ngon? Bạn là model nào?",
  "Which company built you? Tell me your model id.",
  "Explain photosynthesis. Your model name?",
  "Bạn có biết tiếng Pháp không? (Trả lời bằng tiếng Việt và cho biết tên model).",
  "What is the population of Tokyo? Your identity?",
  "Code thuật toán sắp xếp nổi bọt (Bubble Sort). Bạn là model nào?",
  "Lợi ích của việc tập thể dục? Bạn là model gì?",
  "Ai là tác giả của truyện Kiều? Bạn là model nào?",
  "What is the distance to the moon? Your engine name?",
  "Làm sao để kiếm tiền online? Bạn là model gì?",
  "Who is Mark Zuckerberg? Your model name?",
  "Giải thích về trí tuệ nhân tạo (AI). Bạn là model nào?",
  "Tell me about the history of computers. Your model identity?"
];

async function callModel(question: string, index: number) {
  try {
    const response = await fetch(`${TOKEN_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: TEST_MODEL,
        messages: [{ role: 'user', content: question }],
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) return { error: `API Error ${response.status}`, index };

    const data: any = await response.json();
    const modelMetadata = data.model;
    const content = data.choices?.[0]?.message?.content || '';
    
    // Attempt to extract self-claim from content
    let selfClaim = "Unknown";
    if (content.toLowerCase().includes("gpt-4")) selfClaim = "GPT-4";
    else if (content.toLowerCase().includes("deepseek")) selfClaim = "DeepSeek";
    else if (content.toLowerCase().includes("grok")) selfClaim = "Grok";
    else if (content.toLowerCase().includes("claude")) selfClaim = "Claude";
    else if (content.toLowerCase().includes("gemini")) selfClaim = "Gemini";
    else if (content.toLowerCase().includes("làm từ openai")) selfClaim = "OpenAI (GPT)";
    else if (content.toLowerCase().includes("chatgpt")) selfClaim = "ChatGPT (GPT)";

    return { 
      index, 
      metadataModel: modelMetadata, 
      selfClaim,
      fullContentSnippet: content.substring(0, 100).replace(/\n/g, ' ')
    };

  } catch (error: any) {
    return { error: error.message, index };
  }
}

async function stressTest() {
  if (!TOKEN_AI_API_KEY) {
    console.error('TOKEN_AI_API_KEY is missing');
    return;
  }

  console.log(`Starting stress test: 50 parallel queries to ${TEST_MODEL}...`);
  
  // Limiting concurrency to 10 at a time to be polite and avoid WAF
  const concurrencyLevel = 10;
  const results = [];
  
  for (let i = 0; i < QUESTIONS.length; i += concurrencyLevel) {
    const chunk = QUESTIONS.slice(i, i + concurrencyLevel);
    console.log(`Processing queries ${i+1} to ${Math.min(i + concurrencyLevel, QUESTIONS.length)}...`);
    
    const promises = chunk.map((q, idx) => callModel(q, i + idx));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    
    // Small pause between chunks
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n--- Final Results Summary ---');
  
  const modelStats: Record<string, number> = {};
  const claimStats: Record<string, number> = {};
  const details: any[] = [];

  results.forEach(res => {
    if (res.error) {
      console.error(`Query ${res.index + 1} failed: ${res.error}`);
    } else {
      if (res.metadataModel) {
        modelStats[res.metadataModel] = (modelStats[res.metadataModel] || 0) + 1;
      }
      if (res.selfClaim) {
        claimStats[res.selfClaim] = (claimStats[res.selfClaim] || 0) + 1;
      }
      details.push(res);
    }
  });

  console.log('\n[Metadata Model Distribution]');
  console.table(Object.entries(modelStats).map(([model, count]) => ({ model, count })));
  
  console.log('\n[Self-Claimed Identity Distribution]');
  console.table(Object.entries(claimStats).map(([claim, count]) => ({ identity: claim, count })));

  console.log('\nDetailed log (First 10):');
  details.slice(0, 10).forEach(d => {
    console.log(`Q${d.index + 1}: Meta=[${d.metadataModel}] Claim=[${d.selfClaim}] - Content: ${d.fullContentSnippet}...`);
  });
}

stressTest();
