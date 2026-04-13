// ══════════════════════════════════════════════════════════════
// 🔐 APP CONFIGURATION — EDIT THIS FILE WITH YOUR REAL KEYS
// ══════════════════════════════════════════════════════════════
// This file is listed in .gitignore — it will NOT be committed.
// Copy config.example.js → config.js if this file is missing.
// ══════════════════════════════════════════════════════════════

window.APP_CONFIG = {

  firebase: {
    apiKey: "AIzaSyCq0LExBPRiU2ljpcQizrg-lxckD3F9iAk",
    authDomain: "india-llms.firebaseapp.com",
    projectId: "india-llms",
    storageBucket: "india-llms.firebasestorage.app",
    messagingSenderId: "364936295146",
    appId: "1:364936295146:web:2f93ad5494c852dbf29d93",
    measurementId: "G-LRG0F16PPF"
  },

  openai: {
    apiKey:       "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",
    model:        "gpt-4o",
    modelMini:    "gpt-4o-mini",
    embeddingModel: "text-embedding-3-large"
  },

  app: {
    name:           "NexGen Scholar",
    maxFreeMessages: 20,
    maxUploadSizeMB: 25,
    defaultLanguage: "en"
  }
};
