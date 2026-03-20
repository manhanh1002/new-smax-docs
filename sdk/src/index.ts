import { SmaxAIChatWidget, WidgetConfig } from './widget'

let instance: SmaxAIChatWidget | null = null;

(window as any).SmaxAIChat = {
  init: (cfg: WidgetConfig = {}) => { 
    if (instance) instance.destroy(); 
    instance = new SmaxAIChatWidget(cfg); 
    return instance 
  },
  get widget() { return instance }
}

// Auto-init
if (document.currentScript?.hasAttribute('data-auto-init')) {
  document.addEventListener('DOMContentLoaded', () => { 
    (window as any).SmaxAIChat.init() 
  })
}
