import { SmaxAIChatWidget, WidgetConfig } from './widget'

let instance: SmaxAIChatWidget | null = null;

export const SmaxAIChat = {
  init: (cfg: WidgetConfig = {}) => { 
    if (instance) instance.destroy(); 
    instance = new SmaxAIChatWidget(cfg); 
    return instance 
  },
  get widget() { return instance }
};

// For global browser access
if (typeof window !== 'undefined') {
  (window as any).SmaxAIChat = SmaxAIChat;

  // Auto-init
  if (document.currentScript?.hasAttribute('data-auto-init')) {
    document.addEventListener('DOMContentLoaded', () => { 
      SmaxAIChat.init() 
    })
  }
}
