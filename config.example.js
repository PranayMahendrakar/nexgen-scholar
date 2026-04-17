// ══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION TEMPLATE
// ══════════════════════════════════════════════════════════════
//
// SETUP INSTRUCTIONS:
// 1. Copy this file → rename to "config.js"
// 2. Replace all placeholder values with your real keys
// 3. NEVER commit config.js to Git (it's in .gitignore)
//
// ⚠️  WARNING: OpenAI API keys in frontend code can be exposed
//     to users. For production, use Firebase Cloud Functions
//     as a backend proxy (see README.md for setup).
//     For development/personal use, direct frontend calls work.
//
// ══════════════════════════════════════════════════════════════

window.APP_CONFIG = {

  // ─── Firebase Configuration ────────────────────────────────
  // Get from: Firebase Console → Project Settings → General → Your Apps
  firebase: {
    apiKey: "AIzaSyCq0LExBPRiU2ljpcQizrg-lxckD3F9iAk",
    authDomain: "india-llms.firebaseapp.com",
    projectId: "india-llms",
    storageBucket: "india-llms.firebasestorage.app",
    messagingSenderId: "364936295146",
    appId: "1:364936295146:web:2f93ad5494c852dbf29d93",
    measurementId: "G-LRG0F16PPF"
  },

  // ─── OpenAI API Configuration ──────────────────────────────
  // Get from: https://platform.openai.com/api-keys
  // Used for: AI Tutor, Content Generation, Essay Grading, etc.
  openai: {
    apiKey:       "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",
    model:        "gpt-4o",              // Primary model for complex tasks
    modelMini:    "gpt-4o-mini",         // Cost-optimized for quizzes, flashcards
    embeddingModel: "text-embedding-3-large"
  },

  // ─── App Settings ──────────────────────────────────────────
  app: {
    name:           "NexGen Scholar",
    maxFreeMessages: 20,    // Free tier daily AI messages
    maxUploadSizeMB: 25,    // Max document upload size
    defaultLanguage: "en"
  }
};
