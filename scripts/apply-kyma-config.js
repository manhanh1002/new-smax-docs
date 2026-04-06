require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateConfig() {
  const kymaConfig = {
    provider: 'kymaapi',
    apiKey: 'kyma-bf261b9d753dbbb53cec6a50b5d828a032677763a799a6f3',
    model: 'qwen-3.6-plus',
    baseURL: 'https://kymaapi.com/v1'
  };

  const { error } = await supabase
    .from('system_settings')
    .update({ 
      value: kymaConfig 
    })
    .eq('key', 'ai_config');

  if (error) {
    console.error('Lỗi khi cập nhật cấu hình:', error);
  } else {
    console.log('Cập nhật cấu hình KymaAPI thành công!');
  }
}

updateConfig();
