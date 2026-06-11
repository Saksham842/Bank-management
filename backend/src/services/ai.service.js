// ai.service.js
// Uses Google Gemini (FREE - no credit card needed!)
// Free limits: 15 requests/min, 1 million tokens/day
// Get your key at: https://aistudio.google.com/app/apikey

const { GoogleGenerativeAI } = require('@google/generative-ai');

// This creates the Gemini client only once (saves memory)
let geminiInstance = null;
const getGemini = () => {
  if (!geminiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      console.warn('⚠️  GEMINI_API_KEY not set. AI features will use MOCK fallback responses.');
      return null; // Return null so we fall back to mock
    }
    geminiInstance = new GoogleGenerativeAI(apiKey);
  }
  return geminiInstance;
};

// Helper: check if API key is properly configured
const isApiKeySet = () => {
  const key = process.env.GEMINI_API_KEY;
  return key && !key.startsWith('your-') && key.length > 10;
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature 1: Financial Advisor
// Answers questions about the user's spending habits using Gemini AI
// ─────────────────────────────────────────────────────────────────────────────
const analyzeSpending = async (question, transactions) => {
  // Build a short text summary of up to 30 recent transactions
  const summary = transactions
    .slice(0, 30)
    .map(t => `${t.date}: ${t.type} ₹${t.amount} [${t.category}] - ${t.description}`)
    .join('\n');

  // If no API key, return a helpful mock response
  if (!isApiKeySet()) {
    return `[MOCK AI ADVISOR] Based on your transactions, you appear to spend most on Food and Transport. 
Try planning a budget so that any single category stays under 30% of your total expenses. 
Set your GEMINI_API_KEY in backend/.env to get real AI-powered answers!`;
  }

  try {
    const client = getGemini();
    // gemini-1.5-flash is the fastest FREE model
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a personal finance advisor. Be concise (under 150 words).
    
Here are the user's recent transactions:
${summary}

User question: ${question}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini API error in analyzeSpending:', err.message);
    return `[AI ERROR] Could not fetch insights right now. Tip: Monitor recurring subscriptions closely — they add up over time!`;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature 2: Auto-Categorizer
// Given a transaction description, returns the best category
// ─────────────────────────────────────────────────────────────────────────────
const categorizeTransaction = async (description) => {
  // Local heuristic fallback (works even without API key)
  const heuristicCategory = (desc) => {
    const d = desc.toLowerCase();
    if (d.match(/food|restaurant|swiggy|zomato|burger|pizza|cafe|eat|lunch|dinner|breakfast/)) return 'Food';
    if (d.match(/uber|ola|cab|train|metro|bus|flight|travel|taxi|petrol|fuel/)) return 'Transport';
    if (d.match(/netflix|spotify|movie|game|concert|stream|entertainment|youtube premium/)) return 'Entertainment';
    if (d.match(/hospital|doctor|medical|medicine|pharmacy|clinic|health/)) return 'Healthcare';
    if (d.match(/amazon|myntra|flipkart|mall|shopping|buy|purchase|order/)) return 'Shopping';
    if (d.match(/electricity|water|gas|internet|wifi|bill|rent|mobile recharge/)) return 'Utilities';
    if (d.match(/salary|paycheck|credit|dividend|payout|bonus|income/)) return 'Salary';
    if (d.match(/stock|mutual fund|crypto|invest|sip|save|fd|ppf/)) return 'Investment';
    return 'Other';
  };

  // If no API key, use local heuristic (works instantly, offline)
  if (!isApiKeySet()) {
    return heuristicCategory(description);
  }

  try {
    const client = getGemini();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Categorize this transaction into EXACTLY ONE of these categories:
Food, Transport, Entertainment, Healthcare, Shopping, Utilities, Salary, Investment, Other

Transaction: "${description}"

Reply with just the category name, nothing else.`;

    const result = await model.generateContent(prompt);
    const category = result.response.text().trim();

    // Validate it's one of our allowed categories
    const allowed = ['Food', 'Transport', 'Entertainment', 'Healthcare', 'Shopping', 'Utilities', 'Salary', 'Investment', 'Other'];
    return allowed.includes(category) ? category : heuristicCategory(description);
  } catch (err) {
    console.error('Gemini API error in categorizeTransaction:', err.message);
    return heuristicCategory(description); // Fall back to local heuristic
  }
};

module.exports = { analyzeSpending, categorizeTransaction };
