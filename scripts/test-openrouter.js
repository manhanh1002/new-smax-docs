const OpenAI = require('openai');

async function test() {
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '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',
    defaultHeaders: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://docs.cdp.vn',
      'Referer': 'https://docs.cdp.vn/',
      'HTTP-Referer': 'https://docs.cdp.vn',
      'X-Title': 'Smax Docs'
    }
  });

  console.log('Sending request...');
  try {
    const stream = await client.chat.completions.create({
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      messages: [{ role: 'user', content: 'Say hello!' }],
      stream: true,
      max_tokens: 100
    });

    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    console.log('\nDone.');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
