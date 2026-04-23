
import { supabaseAdmin } from '../lib/supabase-admin'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

async function run() {
  console.log('🚀 Starting Smax AI Feature Analysis...')

  // 1. Load Env
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

  const baseURL = process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1'
  const apiKey = process.env.TOKEN_AI_API_KEY || 'dummy'
  const model = process.env.CHAT_MODEL || 'gpt-5-chat'

  const client = new OpenAI({ apiKey, baseURL })

  // 2. Fetch all document titles from Supabase
  console.log('📅 Fetching document titles from Supabase...')
  const { data: docs, error } = await supabaseAdmin
    .from('documents')
    .select('title')

  if (error) {
    console.error('❌ Error fetching documents:', error)
    return
  }

  const allTitles = docs.map(d => d.title).filter(Boolean)
  const uniqueTitles = Array.from(new Set(allTitles)).sort()
  
  console.log(`✅ Found ${uniqueTitles.length} unique document titles.`)

  // 3. Prepare AI Prompt for Discovery & Categorization
  console.log('🤖 Sending data to AI for discovery and analysis...')
  
  const prompt = `
Bạn là một chuyên gia về Smax AI. Dưới đây là danh sách toàn bộ tiêu đề tài liệu của Smax AI trích xuất từ database.
Nhiệm vụ của bạn:
1. "Dò" (Discover) và xác định trong danh sách này đâu là các MODULE TÍNH NĂNG chính của Smax AI.
2. Phân nhóm các tính năng đó vào 5 danh mục sau:
   - Kết nối kênh (Cài đặt kết nối Fanpage, Zalo, Tiktok, Instagram, Shopee, v.v.)
   - Tính Năng Chính (Các công cụ cốt lõi như Live Chat, Quản lý đơn hàng, Giao diện, v.v.)
   - Automation (Bám đuổi, Follow-up, Kịch bản tự động, Bot AI, GenAI, v.v.)
   - Integration (Tích hợp API, Webhook, Meta Dataset, CAPI, CRM đối tác, v.v.)
   - Modules (Các tiện ích mở rộng như Lucky Wheel, Mini Game, Puzzle, Coupon, v.v.)

3. Với mỗi tính năng, hãy thực hiện phân tích 3 khía cạnh sau:
   - **Newbie SME**: Tính năng này người mới kinh doanh (SME) có dễ dùng không? Có cần kiến thức kỹ thuật không?
   - **Pro Mindset**: Người dùng chuyên nghiệp cần tư duy gì? Khi nào cần nhờ đội ngũ Smax AI hỗ trợ?
   - **Enterprise**: Tính năng này có thể bán/tư vấn cho khách hàng Enterprise để xây dựng giải pháp tổng thể như thế nào?

HÃY TRÌNH BÀY DƯỚI DẠNG MARKDOWN TABLE.

Danh sách tiêu đề tài liệu:
${uniqueTitles.join('\n')}
`

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia tư vấn giải pháp Smax AI, am hiểu sâu về các module và tính năng của nền tảng.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    })

    const result = response.choices[0]?.message?.content || ''

    // 4. Write to file
    const outputPath = path.resolve(process.cwd(), 'smax-ai-features.md')
    const fileHeader = `# Báo cáo Tổng thể Module & Tính năng Smax AI\n\n*Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}*\n\n`
    fs.writeFileSync(outputPath, fileHeader + result)

    console.log(`\n🎉 ANALYSIS COMPLETE! Results written to: ${outputPath}`)
  } catch (err) {
    console.error('❌ AI Analysis failed:', err)
  }
}

run()
