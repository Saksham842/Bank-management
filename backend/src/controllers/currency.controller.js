const CurrencyWallet = require('../models/CurrencyWallet.model');
const ForexTransaction = require('../models/ForexTransaction.model');

const RATES = {
  USD: { INR: 83.50, EUR: 0.92, GBP: 0.79, JPY: 149.50, AUD: 1.53, CAD: 1.36, SGD: 1.34, AED: 3.67, SAR: 3.75, CNY: 7.24 },
  INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, JPY: 1.79, AUD: 0.018, CAD: 0.016, SGD: 0.016, AED: 0.044, SAR: 0.045, CNY: 0.087 },
  EUR: { INR: 90.80, USD: 1.09, GBP: 0.86, JPY: 162.50, AUD: 1.67, CAD: 1.48, SGD: 1.46, AED: 4.00, SAR: 4.08, CNY: 7.87 },
  GBP: { INR: 105.60, USD: 1.26, EUR: 1.16, JPY: 189.00, AUD: 1.94, CAD: 1.72, SGD: 1.70, AED: 4.63, SAR: 4.73, CNY: 9.13 },
  JPY: { INR: 0.56, USD: 0.0067, EUR: 0.0062, GBP: 0.0053, AUD: 0.010, CAD: 0.0091, SGD: 0.0090, AED: 0.025, SAR: 0.025, CNY: 0.048 },
  EUR: { INR: 90.80, USD: 1.09, GBP: 0.86, JPY: 162.50, AUD: 1.67, CAD: 1.48, SGD: 1.46, AED: 4.00, SAR: 4.08, CNY: 7.87 },
  AUD: { INR: 54.60, USD: 0.65, EUR: 0.60, GBP: 0.52, JPY: 97.70, CAD: 0.89, SGD: 0.88, AED: 2.39, SAR: 2.44, CNY: 4.72 },
  CAD: { INR: 61.40, USD: 0.74, EUR: 0.68, GBP: 0.58, JPY: 109.90, AUD: 1.12, SGD: 0.99, AED: 2.72, SAR: 2.77, CNY: 5.35 },
  SGD: { INR: 62.30, USD: 0.75, EUR: 0.69, GBP: 0.59, JPY: 111.50, AUD: 1.14, CAD: 1.01, AED: 2.75, SAR: 2.81, CNY: 5.42 },
  AED: { INR: 22.74, USD: 0.27, EUR: 0.25, GBP: 0.22, JPY: 40.69, AUD: 0.42, CAD: 0.37, SGD: 0.36, SAR: 1.02, CNY: 1.97 },
  SAR: { INR: 22.27, USD: 0.27, EUR: 0.24, GBP: 0.21, JPY: 39.84, AUD: 0.41, CAD: 0.36, SGD: 0.36, AED: 0.98, CNY: 1.93 },
  CNY: { INR: 11.53, USD: 0.14, EUR: 0.13, GBP: 0.11, JPY: 20.64, AUD: 0.21, CAD: 0.19, SGD: 0.18, AED: 0.51, SAR: 0.52 },
};
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'SAR', 'CNY'];
const FLAGS = { USD: '🇺🇸', INR: '🇮🇳', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', AED: '🇦🇪', SAR: '🇸🇦', CNY: '🇨🇳' };
const SYMBOLS = { USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ', SAR: '﷼', CNY: '¥' };

function getRate(from, to) {
  if (from === to) return 1;
  return RATES[from]?.[to] || null;
}

const getWallets = async (req, res) => {
  try {
    const wallets = await CurrencyWallet.find({ userId: req.user.id });
    res.json({ success: true, data: wallets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createWallet = async (req, res) => {
  try {
    const existing = await CurrencyWallet.findOne({ userId: req.user.id, currency: req.body.currency });
    if (existing) return res.status(400).json({ success: false, message: 'Wallet for this currency already exists' });
    const wallet = new CurrencyWallet({ ...req.body, userId: req.user.id });
    await wallet.save();
    res.status(201).json({ success: true, data: wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateWallet = async (req, res) => {
  try {
    const wallet = await CurrencyWallet.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, data: wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteWallet = async (req, res) => {
  try {
    const wallet = await CurrencyWallet.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, message: 'Wallet deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getRates = async (req, res) => {
  try {
    res.json({ success: true, data: { rates: RATES, currencies: CURRENCIES, flags: FLAGS, symbols: SYMBOLS } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const convert = async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    if (!from || !to || !amount) return res.status(400).json({ success: false, message: 'from, to, and amount required' });
    const rate = getRate(from.toUpperCase(), to.toUpperCase());
    if (rate === null) return res.status(400).json({ success: false, message: `No rate for ${from}→${to}` });
    const result = parseFloat((amount * rate).toFixed(2));
    res.json({ success: true, data: { from: from.toUpperCase(), to: to.toUpperCase(), amount: parseFloat(amount), rate, result } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const executeConversion = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, fromAmount } = req.body;
    if (!fromCurrency || !toCurrency || !fromAmount) return res.status(400).json({ success: false, message: 'fromCurrency, toCurrency, fromAmount required' });

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const rate = getRate(from, to);
    if (rate === null) return res.status(400).json({ success: false, message: `No rate for ${from}→${to}` });

    const toAmount = parseFloat((fromAmount * rate).toFixed(2));

    const fromWallet = await CurrencyWallet.findOne({ userId: req.user.id, currency: from });
    if (!fromWallet) return res.status(400).json({ success: false, message: `No wallet for ${from}` });
    if (fromWallet.balance < fromAmount) return res.status(400).json({ success: false, message: `Insufficient ${from} balance` });

    let toWallet = await CurrencyWallet.findOne({ userId: req.user.id, currency: to });
    if (!toWallet) {
      toWallet = new CurrencyWallet({ userId: req.user.id, currency: to, balance: 0 });
      await toWallet.save();
    }

    fromWallet.balance -= fromAmount;
    toWallet.balance += toAmount;
    await fromWallet.save();
    await toWallet.save();

    const txn = new ForexTransaction({ userId: req.user.id, fromCurrency: from, toCurrency: to, fromAmount, toAmount, exchangeRate: rate, type: 'conversion' });
    await txn.save();

    res.json({ success: true, data: { transaction: txn, fromWallet, toWallet } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const txns = await ForexTransaction.find({ userId: req.user.id }).sort({ date: -1 }).limit(100);
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const wallets = await CurrencyWallet.find({ userId: req.user.id });
    const totalInINR = wallets.reduce((s, w) => {
      const rate = getRate(w.currency, 'INR');
      return s + (rate ? w.balance * rate : 0);
    }, 0);

    const byCurrency = wallets.map(w => ({
      currency: w.currency,
      flag: FLAGS[w.currency] || '💱',
      symbol: SYMBOLS[w.currency] || w.currency,
      balance: w.balance,
      inINR: Math.round((getRate(w.currency, 'INR') || 0) * w.balance),
      percentage: totalInINR > 0 ? Math.round(((getRate(w.currency, 'INR') || 0) * w.balance / totalInINR) * 100) : 0
    }));

    const txns = await ForexTransaction.find({ userId: req.user.id }).sort({ date: -1 }).limit(50);

    res.json({
      success: true,
      data: {
        totalWallets: wallets.length,
        totalValueINR: Math.round(totalInINR),
        byCurrency,
        recentTransactions: txns,
        rates: { currencies: CURRENCIES, flags: FLAGS }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getWallets, createWallet, updateWallet, deleteWallet, getRates, convert, executeConversion, getTransactions, getAnalytics };
