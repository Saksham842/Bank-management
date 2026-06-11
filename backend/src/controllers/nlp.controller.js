const Transaction = require('../models/Transaction.model');
const { parseNaturalQuery, buildMongoFilter } = require('../services/nlp.service');
const ml = require('../services/ml.client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const isGeminiAvailable = () => {
  const key = process.env.GEMINI_API_KEY;
  return key && !key.startsWith('your-') && key.length > 10;
};

const naturalSearch = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;
    if (!query) return res.status(400).json({ success: false, message: 'Search query is required.' });

    const parsed = await parseNaturalQuery(query);
    const filter = buildMongoFilter(userId, parsed);
    const transactions = await Transaction.find(filter).sort({ date: -1 }).limit(50);

    res.json({ success: true, data: transactions, parsedQuery: parsed, message: `Found ${transactions.length} transactions` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const extractFromText = async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ success: false, message: 'Raw text is required.' });

    // 1. Try ML service (Python models) first
    try {
      const mlResult = await ml.parseSMS(rawText);
      if (mlResult.extractedFrom === 'ml_service' || mlResult.confidence > 0.5) {
        return res.json({
          success: true,
          data: { ...mlResult, rawText, extractedFrom: 'ml_service' },
          message: `Extracted with ${Math.round(mlResult.confidence * 100)}% confidence via ML model`
        });
      }
    } catch { /* fall through to Gemini */ }

    // 2. Fall back to Gemini AI
    if (isGeminiAvailable()) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a transaction data extractor. Parse the given raw bank SMS, receipt, or narration text.

Return ONLY valid JSON with these exact fields:
- amount (number, required - the transaction amount)
- merchant (string, required - the business or entity name)
- date (string, ISO format YYYY-MM-DD, use today if not found)
- category (one of: Food, Transport, Entertainment, Healthcare, Shopping, Utilities, Salary, Investment, Other)
- type (string: "DEBIT" if money going out / purchase / payment / spent, "CREDIT" if money coming in / income / salary / refund / received / earned / deposit)
- confidence (number from 0 to 1, your confidence in this extraction)

No markdown, no explanation, no code blocks. Return ONLY the JSON object.

Raw text: ${rawText}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const extracted = JSON.parse(text);

        return res.json({
          success: true,
          data: { ...extracted, rawText, extractedFrom: 'gemini_ai' },
          message: `Extracted with ${Math.round((extracted.confidence || 0.9) * 100)}% confidence via Gemini AI`
        });
      } catch (aiErr) {
        console.warn('Gemini extraction failed:', aiErr.message);
      }
    }

    // 3. Final fallback: heuristic via ML client's built-in fallback
    const fallback = ml.parseSMS.constructor === Function
      ? await ml.fallbackParseSMS(rawText)
      : null;

    res.json({
      success: true,
      data: {
        ...(fallback || { amount: 0, merchant: 'Unknown', category: 'Other', type: 'DEBIT', date: new Date().toISOString().split('T')[0], confidence: 0.3 }),
        rawText, extractedFrom: 'fallback_heuristic'
      },
      message: 'Extracted via fallback heuristic (no ML service or AI key configured)'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const categorizeLocal = async (req, res) => {
  try {
    const { description, text, merchant } = req.body;
    const input = description || text || merchant || '';
    if (!input) return res.status(400).json({ success: false, message: 'Description is required.' });

    // ML service first
    const result = await ml.categorizeTransaction({ text: input, description, merchant });

    res.json({
      success: true,
      data: { category: result.category, confidence: result.confidence, probabilities: result.probabilities, source: 'ml_service' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { naturalSearch, extractFromText, categorizeLocal };
