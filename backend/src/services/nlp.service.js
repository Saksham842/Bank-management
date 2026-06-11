// Inline Date Helpers to avoid external dependencies
const startOfDay = (d) => {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
};

const endOfDay = (d) => {
  const res = new Date(d);
  res.setHours(23, 59, 59, 999);
  return res;
};

const startOfWeek = (d) => {
  const res = new Date(d);
  const day = res.getDay();
  const diff = res.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  res.setDate(diff);
  res.setHours(0, 0, 0, 0);
  return res;
};

const endOfWeek = (d) => {
  const res = new Date(startOfWeek(d));
  res.setDate(res.getDate() + 6);
  res.setHours(23, 59, 59, 999);
  return res;
};

const startOfMonth = (d) => {
  const res = new Date(d.getFullYear(), d.getMonth(), 1);
  return res;
};

const endOfMonth = (d) => {
  const res = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  res.setHours(23, 59, 59, 999);
  return res;
};

const subWeeks = (d, num) => {
  const res = new Date(d);
  res.setDate(res.getDate() - (num * 7));
  return res;
};

const subMonths = (d, num) => {
  const res = new Date(d);
  res.setMonth(res.getMonth() - num);
  return res;
};

/**
 * Parses a natural language query into structured MongoDB filter fields.
 * Falls back to keyword search if Claude call fails or key is missing.
 */
const parseNaturalQuery = async (query) => {
  console.log('[NLP] Parsing query:', query);
  const parsed = {};
  const qLower = query.toLowerCase();

  // category heuristics (fast, no model needed for simple keyword queries)
  if (qLower.includes('food') || qLower.includes('dining') || qLower.includes('restaurant') || qLower.includes('zomato')) parsed.category = 'Food';
  else if (qLower.includes('transport') || qLower.includes('travel') || qLower.includes('uber') || qLower.includes('cab') || qLower.includes('fuel')) parsed.category = 'Transport';
  else if (qLower.includes('entertainment') || qLower.includes('movie') || qLower.includes('netflix')) parsed.category = 'Entertainment';
  else if (qLower.includes('shopping') || qLower.includes('amazon') || qLower.includes('flipkart')) parsed.category = 'Shopping';
  else if (qLower.includes('utility') || qLower.includes('bill') || qLower.includes('electricity') || qLower.includes('recharge')) parsed.category = 'Utilities';
  else if (qLower.includes('salary') || qLower.includes('income')) parsed.category = 'Salary';
  else if (qLower.includes('investment') || qLower.includes('stock') || qLower.includes('sip')) parsed.category = 'Investment';
  else if (qLower.includes('health') || qLower.includes('medical') || qLower.includes('hospital') || qLower.includes('pharmacy')) parsed.category = 'Healthcare';

  // date range extraction
  if (qLower.includes('today')) parsed.dateRange = 'today';
  else if (qLower.includes('this week') || qLower.includes('this wk')) parsed.dateRange = 'this_week';
  else if (qLower.includes('last week') || qLower.includes('last wk')) parsed.dateRange = 'last_week';
  else if (qLower.includes('this month')) parsed.dateRange = 'this_month';
  else if (qLower.includes('last month')) parsed.dateRange = 'last_month';
  else if (qLower.includes('this year')) parsed.dateRange = 'this_year';

  // amount filtering
  const overMatch = qLower.match(/(?:over|above|more than|greater than|>)\s*(\d+)/);
  if (overMatch) parsed.minAmount = parseFloat(overMatch[1]);

  const underMatch = qLower.match(/(?:under|below|less than|beneath|<)\s*(\d+)/);
  if (underMatch) parsed.maxAmount = parseFloat(underMatch[1]);

  // transaction type
  if (qLower.includes('credit') || qLower.includes('income') || qLower.includes('received') || qLower.includes('earning')) parsed.type = 'CREDIT';
  else if (qLower.includes('debit') || qLower.includes('expense') || qLower.includes('spend') || qLower.includes('paid') || qLower.includes('payment')) parsed.type = 'DEBIT';

  // keyword fallback — anything left after removing known filter terms
  const stopWords = /\b(food|dining|transport|travel|uber|entertainment|shopping|utilities|salary|investment|health|medical|today|this week|last week|this month|last month|this year|last year|over \d+|under \d+|above \d+|below \d+|credit|income|debit|expense|spend|show|list|find|search|get|all|my|transactions|please|could you|can you|i want|need)\b/gi;
  const cleaned = query.replace(stopWords, '').trim();
  if (cleaned && cleaned.length > 2) parsed.keyword = cleaned;

  return parsed;
};

/**
 * Converts parsed NLP query into a MongoDB filter object.
 */
const buildMongoFilter = (userId, parsed) => {
  const filter = { userId };

  if (parsed.category) {
    filter.category = new RegExp(parsed.category, 'i');
  }
  if (parsed.type) {
    filter.type = parsed.type;
  }

  if (parsed.minAmount !== undefined || parsed.maxAmount !== undefined) {
    filter.amount = {};
    if (parsed.minAmount !== undefined) filter.amount.$gte = parsed.minAmount;
    if (parsed.maxAmount !== undefined) filter.amount.$lte = parsed.maxAmount;
  }

  if (parsed.keyword) {
    // If text index search fails or is too restrictive, we fallback to regex on description or tags
    filter.$or = [
      { description: new RegExp(parsed.keyword, 'i') },
      { tags: new RegExp(parsed.keyword, 'i') }
    ];
  }

  if (parsed.dateRange) {
    const now = new Date();
    const ranges = {
      today:      [startOfDay(now), endOfDay(now)],
      this_week:  [startOfWeek(now), endOfDay(now)],
      last_week:  [startOfWeek(subWeeks(now, 1)), endOfWeek(subWeeks(now, 1))],
      this_month: [startOfMonth(now), endOfDay(now)],
      last_month: [startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))],
    };
    const range = ranges[parsed.dateRange];
    if (range) {
      filter.date = { $gte: range[0], $lte: range[1] };
    }
  }

  return filter;
};

module.exports = { parseNaturalQuery, buildMongoFilter };
