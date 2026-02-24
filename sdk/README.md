# @smaxai/chat-widget

Embeddable AI Chat Widget SDK for SmaxAI. Cho phép nhúng widget chat AI vào bất kỳ trang web nào.

## Features

- 🔮 **Standalone** - Không phụ thuộc React, có thể nhúng vào bất kỳ trang web nào
- 🔐 **Auto User ID** - Tự động tạo user ID từ browser fingerprint
- 💾 **Chat History** - Lưu lịch sử chat per user
- ⚡ **Streaming Response** - Hiển thị response theo thời gian thực
- 🌙 **Dark Mode** - Tự động theo system preference
- 📱 **Responsive** - Hoạt động tốt trên mobile

## Installation

### Option 1: Script Tag (Recommended)

```html
<script src="https://docs.cdp.vn/sdk/smaxai-chat.min.js"></script>
<script>
  SmaxAIChat.init({
    apiBaseUrl: 'https://docs.cdp.vn',
    lang: 'vi'
  });
</script>
```

### Option 2: Auto-init

```html
<script src="https://docs.cdp.vn/sdk/smaxai-chat.min.js" data-auto-init></script>
```

## Configuration

```typescript
SmaxAIChat.init({
  // API base URL (default: 'https://docs.cdp.vn')
  apiBaseUrl: 'https://docs.cdp.vn',
  
  // Language (default: 'vi')
  lang: 'vi' | 'en',
  
  // Callbacks
  onOpen: () => console.log('Widget opened'),
  onClose: () => console.log('Widget closed')
});
```

## API

### Methods

| Method | Description |
|--------|-------------|
| `SmaxAIChat.init(config)` | Khởi tạo widget với config |
| `SmaxAIChat.widget.open()` | Mở widget |
| `SmaxAIChat.widget.close()` | Đóng widget |
| `SmaxAIChat.widget.clearChat()` | Xóa lịch sử chat |
| `SmaxAIChat.widget.destroy()` | Hủy widget |

## Usage Examples

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your content -->
  
  <!-- Add widget before </body> -->
  <script src="https://docs.cdp.vn/sdk/smaxai-chat.min.js"></script>
  <script>
    SmaxAIChat.init();
  </script>
</body>
</html>
```

### With Custom Config

```html
<script src="https://docs.cdp.vn/sdk/smaxai-chat.min.js"></script>
<script>
  SmaxAIChat.init({
    apiBaseUrl: 'https://docs.cdp.vn',
    lang: 'vi',
    onOpen: () => {
      console.log('User opened chat');
      // Track analytics
    }
  });
</script>
```

### Programmatic Control

```javascript
// Open widget
SmaxAIChat.widget.open();

// Close widget
SmaxAIChat.widget.close();

// Clear chat history
SmaxAIChat.widget.clearChat();

// Destroy widget
SmaxAIChat.widget.destroy();
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Build ESM
npm run build:esm

# Build all
npm run build:all

# Dev mode (watch)
npm run dev
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT © SmaxAI