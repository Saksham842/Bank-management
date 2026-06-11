/**
 * ML Client Service
 * Communicates with the Python ML microservice for ML-powered predictions.
 * All heuristic/keyword logic should route through this service.
 */
const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5050';
const fetch = require('node-fetch');

// Simple in-memory cache (optional)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cachedFetch = async (url, options = {}, cacheKey = null) => {
  if (cacheKey && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
    cache.delete(cacheKey);
  }

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML service error (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (cacheKey) cache.set(cacheKey, { data, ts: Date.now() });
  return data;
};

/**
 * Check if the ML service is healthy
 */
const healthCheck = async () => {
  try {
    const data = await cachedFetch(`${ML_BASE_URL}/health`, {}, 'ml_health');
    return data;
  } catch {
    return { status: 'unhealthy', models_loaded: [], version: 'unknown' };
  }
};

/**
 * Categorize a transaction using ML
 * @param {string} text - the raw text
 * @param {string} [description] - transaction description
 * @param {string} [merchant] - merchant name
 * @returns {Promise<{category: string, confidence: number, probabilities: object}>}
 */
const categorizeTransaction = async ({ text, description, merchant }) => {
  try {
    const data = await cachedFetch(
      `${ML_BASE_URL}/categorize`,
      {
        method: 'POST',
        body: JSON.stringify({ text, description, merchant }),
      },
      `cat_${(text || description || merchant || '').slice(0, 80)}`
    );
    return data;
  } catch (err) {
    console.warn('[ML Client] categorizeTransaction failed, using fallback:', err.message);
    return fallbackCategorize(description || text || merchant || '');
  }
};

/**
 * Parse raw SMS/bank text into structured transaction data using ML
 * @param {string} rawText - the SMS or bank statement text
 * @returns {Promise<{amount: number, merchant: string, category: string, type: string, date: string, confidence: number}>}
 */
const parseSMS = async (rawText) => {
  try {
    const data = await cachedFetch(
      `${ML_BASE_URL}/parse-sms`,
      {
        method: 'POST',
        body: JSON.stringify({ raw_text: rawText }),
      },
      `sms_${rawText.slice(0, 80)}`
    );
    return {
      amount: data.amount,
      merchant: data.merchant,
      category: data.category,
      type: data.type,
      date: data.date,
      confidence: data.confidence,
      merchant_confidence: data.merchant_confidence,
      category_confidence: data.category_confidence,
      extractedFrom: 'ml_service',
    };
  } catch (err) {
    console.warn('[ML Client] parseSMS failed, using fallback:', err.message);
    return fallbackParseSMS(rawText);
  }
};

/**
 * Detect anomalies in a batch of transactions
 * @param {Array} transactions - array of {amount, frequency?, category_index?, hour?, day_of_week?}
 * @returns {Promise<{anomalies: Array, anomaly_scores: Array, is_anomaly: Array}>}
 */
const detectAnomalies = async (transactions) => {
  try {
    const data = await cachedFetch(
      `${ML_BASE_URL}/detect-anomalies`,
      {
        method: 'POST',
        body: JSON.stringify({ transactions }),
      }
    );
    return data;
  } catch (err) {
    console.warn('[ML Client] detectAnomalies failed, using fallback:', err.message);
    return fallbackDetectAnomalies(transactions);
  }
};

/**
 * Predict future spending
 * @param {number} daysAhead - number of days to predict
 * @param {number} [currentDay] - current day index
 * @returns {Promise<{predictions: Array, days: Array}>}
 */
const predictSpending = async (daysAhead = 30, currentDay = null) => {
  try {
    const data = await cachedFetch(
      `${ML_BASE_URL}/predict-spending`,
      {
        method: 'POST',
        body: JSON.stringify({ days_ahead: daysAhead, current_day: currentDay }),
      }
    );
    return data;
  } catch (err) {
    console.warn('[ML Client] predictSpending failed:', err.message);
    return { predictions: Array(daysAhead).fill(0), days: Array.from({ length: daysAhead }, (_, i) => i) };
  }
};

// ─── Heuristic Fallbacks (used when ML service is unavailable) ──────────

const CATEGORY_KEYWORDS = {
  Food: ['zomato', 'swiggy', 'restaurant', 'cafe', 'pizza', 'burger', 'food', 'hotel', 'dining', 'starbucks', 'kfc', 'mcdonald', 'eat', 'lunch', 'dinner', 'grocery', 'supermarket', 'dunzo', 'blinkit', 'zepto'],
  Transport: ['uber', 'ola', 'cab', 'taxi', 'metro', 'train', 'bus', 'flight', 'fuel', 'petrol', 'diesel', 'travel', 'toll', 'parking', 'rapido', 'auto', 'indian oil', 'hpcl', 'bpcl'],
  Entertainment: ['netflix', 'spotify', 'prime', 'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'hotstar', 'game', 'gaming', 'concert', 'pub', 'club', 'youtube', 'steam'],
  Healthcare: ['hospital', 'doctor', 'clinic', 'pharmacy', 'medicine', 'medical', 'dentist', 'apollo', 'medplus', 'health', 'surgery', 'diagnostic', 'netmeds', 'practo'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'mall', 'store', 'shopping', 'lifestyle', 'clothing', 'electronics', 'nykaa', 'meesho', 'croma', 'reliance', 'ajio', 'westside'],
  Utilities: ['electricity', 'water', 'gas', 'wifi', 'internet', 'broadband', 'recharge', 'bill', 'rent', 'insurance', 'subscription', 'jio', 'airtel', 'bsnl', 'broadband'],
  Salary: ['salary', 'stipend', 'income', 'paycheck', 'wages', 'bonus', 'dividend', 'payout', 'credit salary', 'refund', 'credited'],
  Investment: ['stock', 'mutual', 'sip', 'invest', 'crypto', 'bitcoin', 'share', 'trading', 'fd', 'ppf', 'nps', 'saving', 'zerodha', 'groww', 'upstox'],
};

const fallbackCategorize = (text) => {
  const lower = text.toLowerCase();
  let bestCat = 'Other';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.95) : 0.3;
  return { category: bestCat, confidence, probabilities: { [bestCat]: confidence } };
};

const fallbackParseSMS = (rawText) => {
  const lower = rawText.toLowerCase();
  let amount = 0;
  const amtMatch = rawText.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
  else {
    const numMatch = rawText.match(/\b(\d+(?:\.\d{1,2})?)\b/);
    if (numMatch) amount = parseFloat(numMatch[1]);
  }

  let type = 'DEBIT';
  if (lower.includes('credit') || lower.includes('received') || lower.includes('refund') || lower.includes('salary') || lower.includes('deposit') || lower.includes('earned')) {
    type = 'CREDIT';
  }

  let merchant = 'Unknown Merchant';
  const mMatch = rawText.match(/(?:at|to|from|via)\s+([A-Za-z0-9\s]{3,30}?)(?:\s+on|\s+at|\s+ref|\s+using|\s+for|\s+rs\.?|\s+inr|$)/i);
  if (mMatch) merchant = mMatch[1].trim();

  const catResult = fallbackCategorize(rawText);
  const dMatch = rawText.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  const date = dMatch ? `${dMatch[3]}-${dMatch[2]}-${dMatch[1]}` : new Date().toISOString().split('T')[0];

  return {
    amount: amount || 0,
    merchant,
    category: catResult.category,
    type,
    date,
    confidence: catResult.confidence,
    merchant_confidence: 0.5,
    category_confidence: catResult.confidence,
    extractedFrom: 'fallback_heuristic',
  };
};

const fallbackDetectAnomalies = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { anomalies: [], anomaly_scores: [], is_anomaly: [] };
  }

  const amounts = transactions.map(t => parseFloat(t.amount) || 0);
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const std = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);

  const anomalies = [];
  const scores = [];
  const is_anomaly = [];

  amounts.forEach((amt, i) => {
    const z = std > 0 ? Math.abs(amt - mean) / std : 0;
    const anom = z > 2.5;
    is_anomaly.push(anom);
    scores.push(-z / 5);
    if (anom) {
      anomalies.push({
        index: i,
        transaction: transactions[i],
        anomaly_score: -z / 5,
        severity: z > 4 ? 'high' : 'medium',
      });
    }
  });

  return { anomalies, anomaly_scores: scores, is_anomaly };
};

module.exports = {
  healthCheck,
  categorizeTransaction,
  parseSMS,
  detectAnomalies,
  predictSpending,
  fallbackParseSMS,
  fallbackCategorize,
  fallbackDetectAnomalies,
};
