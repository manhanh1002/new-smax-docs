const OpenAI = require('openai');

async function testStream() {
  const apiKey = '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';
  const baseURL = 'https://openrouter.ai/api/v1';
  const model = 'nvidia/nemotron-3-super-120b-a12b:free';

  console.log('--- TEST START ---');
  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://docs.cdp.vn',
      'Referer': 'https://docs.cdp.vn/',
      'HTTP-Referer': 'https://docs.cdp.vn',
      'X-Title': 'Smax AI Support'
    }
  });

  try {
    console.log('1. Calling completions.create...');
    const stream = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: 'What is auto bot?' }],
      stream: true,
      temperature: 0.3,
      max_tokens: 1500,
    });
    console.log('2. Stream received, starting consumption...');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
    }
    console.log('\n--- SUCCESS ---');
  } catch (err) {
    console.error('\n--- FAILED ---');
    console.error(err);
  }
}

testStream();
