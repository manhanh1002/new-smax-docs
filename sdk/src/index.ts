// sdk/src/index.ts
// Entry point for SDK bundle

import { SmaxAIChatWidget, WidgetConfig } from './widget'

// Auto-initialize singleton
let widgetInstance: SmaxAIChatWidget | null = null

// Create the API object
const createAPI = () => ({
  init: (config: WidgetConfig = {}) => {
    // Destroy existing instance
    if (widgetInstance) {
      widgetInstance.destroy()
    }
    
    // Create new instance
    widgetInstance = new SmaxAIChatWidget(config)
    
    return widgetInstance
  },
  get widget() {
    return widgetInstance
  }
})

// Expose globally - this is what esbuild IIFE will return
// And we also assign to window for direct access
const SmaxAIChat = createAPI()

// Assign to window immediately
if (typeof window !== 'undefined') {
  (window as any).SmaxAIChat = SmaxAIChat
}

// Auto-init if data-auto-init attribute present
if (typeof document !== 'undefined' && document.currentScript?.hasAttribute('data-auto-init')) {
  document.addEventListener('DOMContentLoaded', () => {
    SmaxAIChat.init()
  })
}

// Export for ESM users
export { SmaxAIChatWidget }
export default SmaxAIChat