const { JSDOM } = require("jsdom");
const dom = new JSDOM(\`<!DOCTYPE html><html><body></body></html>\`, { 
  runScripts: "dangerously" 
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

require('./sdk/dist/smaxai-chat.min.js');

try {
  window.SmaxAIChat.init({ apiBaseUrl: "http://localhost" });
  console.log("Widget initialized successfully.");
  console.log("Container in body: ", document.getElementById("smaxai-chat-widget") !== null);
  
  // Wait to see if any async errors happen
  setTimeout(() => {
    console.log("Success after delay");
  }, 500);
} catch (e) {
  console.error("Error during init:", e);
}
