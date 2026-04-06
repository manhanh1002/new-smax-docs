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

  // Auto-init logic
  const checkAutoInit = () => {
    // Search for script tags with data-auto-init
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i];
      if (s.hasAttribute('data-auto-init')) {
        // Read config from data-attributes if provided
        const config: any = {};
        const apiBaseUrl = s.getAttribute('data-api-base-url');
        const lang = s.getAttribute('data-lang');

        if (apiBaseUrl) config.apiBaseUrl = apiBaseUrl;
        if (lang) config.lang = lang as any;

        return SmaxAIChat.init(config);
      }
    }
  };


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutoInit);
  } else {
    checkAutoInit();
  }

}
