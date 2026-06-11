// ai.controller.js
// Handles AI advisor endpoints using Google Gemini (FREE tier)
// Get your free API key at: https://aistudio.google.com/app/apikey

const { analyzeSpending } = require('../services/ai.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze
// Simple (non-streaming) AI response
// ─────────────────────────────────────────────────────────────────────────────
const analyzeSpendingHandler = async (req, res) => {
  try {
    const { question, transactions } = req.body;
    const insight = await analyzeSpending(question, transactions || []);
    res.json({ success: true, insight });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze-stream
// Streaming AI response using Server-Sent Events (SSE)
// The frontend reads tokens one-by-one and shows them as they arrive
// ─────────────────────────────────────────────────────────────────────────────
const analyzeSpendingStreamHandler = async (req, res) => {
  const { question, transactions } = req.body;

  // Build a short summary of recent transactions to send to Gemini
  const summary = (transactions || [])
    .slice(0, 30)
    .map(t => `${t.date}: ${t.type} ₹${t.amount} [${t.category}] - ${t.description || ''}`)
    .join('\n');

  // Set SSE (Server-Sent Events) headers so browser can read stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const apiKey = process.env.GEMINI_API_KEY;

  // ── No API key → stream a mock response word by word ──
  if (!apiKey || apiKey.startsWith('your-') || apiKey.length < 10) {
    const mockResponse = `[MOCK AI] Analysis for: "${question}". Based on your transactions, most cash outflows are on Food and Transport. Consider setting a weekly budget cap for Swiggy/Zomato. Add your free GEMINI_API_KEY in backend/.env to get real AI insights!`;
    const words = mockResponse.split(' ');

    let i = 0;
    const interval = setInterval(() => {
      if (i < words.length) {
        res.write(`data: ${JSON.stringify({ token: words[i] + ' ' })}\n\n`);
        i++;
      } else {
        res.write('data: [DONE]\n\n');
        res.end();
        clearInterval(interval);
      }
    }, 80);

    // Clean up if browser closes the connection
    req.on('close', () => clearInterval(interval));
    return;
  }

  // ── Real Gemini streaming ──
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-1.5-flash = fastest & free model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a personal finance advisor. Be concise (under 200 words).

Here are the user's recent transactions:
${summary}

User question: ${question}`;

    // generateContentStream streams the response chunk by chunk
    const streamResult = await model.generateContentStream(prompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        // Send each text chunk as an SSE event
        res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini SSE streaming failed:', err.message);
    const errorMsg = `[AI ERROR] Could not stream response: ${err.message}`;
    res.write(`data: ${JSON.stringify({ token: errorMsg })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/decode-merchant
// Feature 3: Plain-English merchant attribution
// Decodes cryptic bank codes (e.g. "NEFT-HDFC-ABCD1234") into readable names
// ─────────────────────────────────────────────────────────────────────────────
const decodeMerchantHandler = async (req, res) => {
  const { merchant } = req.body;
  if (!merchant) return res.status(400).json({ success: false, message: 'Merchant required' });

  const apiKey = process.env.GEMINI_API_KEY;

  // Local heuristics first
  const LOOKUP = {
    neft: 'NEFT Bank Transfer', imps: 'IMPS Instant Payment', rtgs: 'RTGS Wire Transfer',
    upi: 'UPI Payment', nach: 'NACH Auto-Debit', zomato: 'Zomato Food Delivery',
    swiggy: 'Swiggy Food Delivery', uber: 'Uber Ride', ola: 'Ola Cab',
    amazon: 'Amazon India', flipkart: 'Flipkart', netflix: 'Netflix',
    spotify: 'Spotify Music', jio: 'Jio Telecom', airtel: 'Airtel Telecom',
    apollo: 'Apollo Pharmacy', medplus: 'MedPlus Pharmacy', zerodha: 'Zerodha Broker',
    groww: 'Groww Investment', hotstar: 'Disney+ Hotstar', myntra: 'Myntra Fashion',
    blinkit: 'Blinkit Grocery', zepto: 'Zepto Quick Commerce',
  };

  const lower = merchant.toLowerCase();
  for (const [key, val] of Object.entries(LOOKUP)) {
    if (lower.includes(key)) return res.json({ success: true, decoded: val, source: 'local' });
  }

  // Gemini fallback
  if (!apiKey || apiKey.startsWith('your-') || apiKey.length < 10) {
    // Clean up bank code patterns as best-effort
    const cleaned = merchant.replace(/^(NEFT|IMPS|UPI|POS|ACH)\s*/i, '').replace(/\b[A-Z0-9]{8,}\b/g, '').replace(/\d{6,}/g, '').trim();
    return res.json({ success: true, decoded: cleaned || merchant, source: 'local' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `This is a raw bank transaction merchant code from an Indian bank statement: "${merchant}".
Decode it into a short (3-6 word) human-readable merchant name in English. 
Examples: "NEFT-HDFC-ZOMA001" → "Zomato Food Delivery", "POS-AMZNIN-123456" → "Amazon India".
Reply with ONLY the decoded name, nothing else.`;

    const result = await model.generateContent(prompt);
    const decoded = result.response.text().trim();
    res.json({ success: true, decoded, source: 'gemini' });
  } catch (err) {
    console.error('Merchant decode error:', err.message);
    res.json({ success: true, decoded: merchant, source: 'fallback' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/scan-receipt
// Feature 6: Receipt scan via Gemini Vision
// Accepts base64 image, extracts merchant/amount/date/items
// ─────────────────────────────────────────────────────────────────────────────
const scanReceiptHandler = async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (!imageBase64) return res.status(400).json({ success: false, message: 'Image data required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-') || apiKey.length < 10) {
    // Mock response for demo
    return res.json({
      success: true,
      data: {
        merchant: 'Sample Merchant (Demo)',
        amount: 499,
        date: new Date().toISOString().split('T')[0],
        category: 'Shopping',
        items: ['Item 1 - ₹299', 'Item 2 - ₹200'],
        notes: 'Scanned receipt (mock – add GEMINI_API_KEY for real scan)',
      },
      source: 'mock',
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this receipt image and extract the following fields as JSON:
{
  "merchant": "store/restaurant name",
  "amount": total amount as number (in INR),
  "date": "YYYY-MM-DD format",
  "category": one of: Food, Transport, Shopping, Bills, Health, Entertainment, Other,
  "items": array of up to 5 line items as strings,
  "notes": brief description
}
Return ONLY valid JSON, no markdown or explanation.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    const text = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);
    res.json({ success: true, data, source: 'gemini' });
  } catch (err) {
    console.error('Receipt scan error:', err.message);
    res.status(500).json({ success: false, message: 'Could not parse receipt: ' + err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/import-pdf
// Feature 2: PDF bank statement import
// Parses text from uploaded PDF and extracts transactions via Gemini
// ─────────────────────────────────────────────────────────────────────────────
const importPdfHandler = async (req, res) => {
  const { pdfText } = req.body;  // Frontend sends extracted text (using pdf.js)
  if (!pdfText) return res.status(400).json({ success: false, message: 'PDF text required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-') || apiKey.length < 10) {
    // Parse using basic regex as fallback
    const lines = pdfText.split('\n').filter(l => l.trim().length > 5);
    const mockTxns = lines.slice(0, 10).map((line, i) => {
      const amtMatch = line.match(/[\d,]+\.?\d{0,2}/);
      return {
        id: `pdf-${i}`,
        merchant: `Statement Entry ${i + 1}`,
        amount: amtMatch ? parseFloat(amtMatch[0].replace(/,/g, '')) : 100,
        type: line.toLowerCase().includes('cr') ? 'income' : 'expense',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        notes: `PDF import (add GEMINI_API_KEY for AI parsing): ${line.slice(0, 60)}`,
      };
    });
    return res.json({ success: true, transactions: mockTxns, source: 'regex', count: mockTxns.length });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Parse this bank statement text and extract ALL transactions as a JSON array.
Each transaction object must have:
{
  "merchant": "merchant or payee name",
  "amount": number (positive, in INR),
  "type": "income" or "expense",
  "category": one of: Food, Transport, Shopping, Bills, Health, Entertainment, Income, Investment, Other,
  "date": "YYYY-MM-DD",
  "notes": brief description
}

Bank statement text:
${pdfText.slice(0, 8000)}

Return ONLY a valid JSON array of transactions, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let transactions = JSON.parse(text);
    if (!Array.isArray(transactions)) transactions = [transactions];

    // Add IDs
    transactions = transactions.map((t, i) => ({ ...t, id: `pdf-import-${Date.now()}-${i}` }));

    res.json({ success: true, transactions, source: 'gemini', count: transactions.length });
  } catch (err) {
    console.error('PDF import error:', err.message);
    res.status(500).json({ success: false, message: 'Could not parse PDF: ' + err.message });
  }
};

module.exports = {
  analyzeSpending: analyzeSpendingHandler,
  analyzeSpendingStream: analyzeSpendingStreamHandler,
  decodeMerchant: decodeMerchantHandler,
  scanReceipt: scanReceiptHandler,
  importPdf: importPdfHandler,
};
