const Holdings = require('../models/InvestmentHoldings.model');
const InvestmentTx = require('../models/InvestmentTransaction.model');

const getHoldings = async (req, res) => {
  try {
    const holdings = await Holdings.find({ userId: req.user.id }).sort({ totalInvested: -1 });
    const portfolio = holdings.map(h => {
      const currentValue = h.quantity * h.currentPrice;
      const invested = h.quantity * h.avgBuyPrice;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      return {
        ...h.toObject(),
        currentValue: Math.round(currentValue),
        pnl: Math.round(pnl),
        pnlPct: Math.round(pnlPct * 100) / 100,
        allocationPct: 0
      };
    });
    const total = portfolio.reduce((s, h) => s + h.currentValue, 0);
    portfolio.forEach(h => { h.allocationPct = total > 0 ? Math.round((h.currentValue / total) * 10000) / 100 : 0; });
    res.json({ success: true, data: portfolio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const holdings = await Holdings.find({ userId: req.user.id });
    const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avgBuyPrice, 0);
    const currentValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
    const totalPnl = currentValue - totalInvested;
    const totalReturns = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    const txns = await InvestmentTx.find({ userId: req.user.id }).sort({ date: -1 }).limit(10);
    const totalBuys = txns.filter(t => t.type === 'BUY').reduce((s, t) => s + t.total, 0);
    const totalSells = txns.filter(t => t.type === 'SELL').reduce((s, t) => s + t.total, 0);

    res.json({
      success: true,
      data: {
        totalInvested: Math.round(totalInvested),
        currentValue: Math.round(currentValue),
        totalPnl: Math.round(totalPnl),
        totalReturns: Math.round(totalReturns * 100) / 100,
        holdingsCount: holdings.length,
        totalBuys: Math.round(totalBuys),
        totalSells: Math.round(totalSells),
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const buyStock = async (req, res) => {
  try {
    const { symbol, name, sector, quantity, price, date, notes, platform } = req.body;
    if (!symbol || !quantity || !price) {
      return res.status(400).json({ success: false, message: 'symbol, quantity, price required' });
    }

    const total = quantity * price;

    // Add transaction record
    await InvestmentTx.create({
      userId: req.user.id,
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      type: 'BUY',
      quantity, price, total,
      date: date ? new Date(date) : new Date(),
      notes, platform: platform || 'Manual'
    });

    // Upsert holding (update avg price)
    const existing = await Holdings.findOne({ userId: req.user.id, symbol: symbol.toUpperCase() });
    if (existing) {
      const newTotalQty = existing.quantity + quantity;
      const newAvgPrice = ((existing.avgBuyPrice * existing.quantity) + (price * quantity)) / newTotalQty;
      existing.quantity = newTotalQty;
      existing.avgBuyPrice = newAvgPrice;
      existing.totalInvested = existing.quantity * existing.avgBuyPrice;
      existing.currentPrice = price;
      if (sector) existing.sector = sector;
      if (name) existing.name = name;
      await existing.save();
    } else {
      await Holdings.create({
        userId: req.user.id,
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        sector: sector || 'Other',
        quantity,
        avgBuyPrice: price,
        currentPrice: price,
        totalInvested: total
      });
    }

    res.json({ success: true, message: `Bought ${quantity} shares of ${symbol.toUpperCase()}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const sellStock = async (req, res) => {
  try {
    const { symbol, quantity, price, date, notes, platform } = req.body;
    if (!symbol || !quantity || !price) {
      return res.status(400).json({ success: false, message: 'symbol, quantity, price required' });
    }

    const holding = await Holdings.findOne({ userId: req.user.id, symbol: symbol.toUpperCase() });
    if (!holding) return res.status(404).json({ success: false, message: 'Holding not found' });
    if (holding.quantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient shares to sell' });

    const total = quantity * price;
    await InvestmentTx.create({
      userId: req.user.id,
      symbol: symbol.toUpperCase(),
      name: holding.name,
      type: 'SELL',
      quantity, price, total,
      date: date ? new Date(date) : new Date(),
      notes, platform: platform || 'Manual'
    });

    holding.quantity -= quantity;
    if (holding.quantity <= 0) {
      await Holdings.deleteOne({ _id: holding._id });
    } else {
      holding.currentPrice = price;
      holding.totalInvested = holding.quantity * holding.avgBuyPrice;
      await holding.save();
    }

    res.json({ success: true, message: `Sold ${quantity} shares of ${symbol.toUpperCase()}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { symbol } = req.query;
    const filter = { userId: req.user.id };
    if (symbol) filter.symbol = symbol.toUpperCase();
    const txns = await InvestmentTx.find(filter).sort({ date: -1 }).limit(100);
    const summary = {
      totalBuys: txns.filter(t => t.type === 'BUY').reduce((s, t) => s + t.total, 0),
      totalSells: txns.filter(t => t.type === 'SELL').reduce((s, t) => s + t.total, 0),
      txCount: txns.length
    };
    res.json({ success: true, data: txns, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updatePrice = async (req, res) => {
  try {
    const { symbol, price } = req.body;
    if (!symbol || !price) return res.status(400).json({ success: false, message: 'symbol and price required' });
    const holding = await Holdings.findOne({ userId: req.user.id, symbol: symbol.toUpperCase() });
    if (!holding) return res.status(404).json({ success: false, message: 'Holding not found' });
    holding.currentPrice = price;
    await holding.save();
    res.json({ success: true, message: `Updated ${symbol.toUpperCase()} price to ${price}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllocation = async (req, res) => {
  try {
    const holdings = await Holdings.find({ userId: req.user.id });
    const total = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);

    const byStock = holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      value: Math.round(h.quantity * h.currentPrice),
      pct: total > 0 ? Math.round((h.quantity * h.currentPrice / total) * 10000) / 100 : 0
    })).sort((a, b) => b.value - a.value);

    const sectorMap = {};
    holdings.forEach(h => {
      const key = h.sector || 'Other';
      if (!sectorMap[key]) sectorMap[key] = 0;
      sectorMap[key] += h.quantity * h.currentPrice;
    });
    const bySector = Object.entries(sectorMap).map(([sector, value]) => ({
      sector, value: Math.round(value),
      pct: total > 0 ? Math.round((value / total) * 10000) / 100 : 0
    })).sort((a, b) => b.value - a.value);

    res.json({ success: true, data: { totalValue: Math.round(total), byStock, bySector } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getRebalanceSuggestions = async (req, res) => {
  try {
    const holdings = await Holdings.find({ userId: req.user.id });
    const total = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
    if (holdings.length === 0) return res.json({ success: true, data: [] });

    const targetAlloc = {
      'Technology': 0.25, 'Finance': 0.20, 'Healthcare': 0.15,
      'Consumer': 0.15, 'Energy': 0.10, 'Other': 0.15
    };

    const sectorTotals = {};
    holdings.forEach(h => {
      const sec = h.sector || 'Other';
      sectorTotals[sec] = (sectorTotals[sec] || 0) + h.quantity * h.currentPrice;
    });

    const suggestions = [];
    for (const [sector, currentVal] of Object.entries(sectorTotals)) {
      const targetPct = targetAlloc[sector] || 0.15;
      const currentPct = currentVal / total;
      const diff = targetPct - currentPct;
      const absDiff = Math.abs(diff);
      if (absDiff > 0.03) {
        suggestions.push({
          sector,
          currentPct: Math.round(currentPct * 10000) / 100,
          targetPct: targetPct * 100,
          diff: Math.round(diff * 10000) / 100,
          action: diff > 0 ? 'underweight' : 'overweight',
          suggestedAdjustment: Math.round(Math.abs(diff) * total),
          severity: absDiff > 0.1 ? 'high' : absDiff > 0.05 ? 'medium' : 'low'
        });
      }
    }

    res.json({ success: true, data: suggestions.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPerformance = async (req, res) => {
  try {
    const txns = await InvestmentTx.find({
      userId: req.user.id,
      date: { $gte: new Date(Date.now() - 365 * 86400000) }
    }).sort({ date: 1 });

    const monthlyMap = {};
    txns.forEach(t => {
      const key = t.date.toISOString().slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { buys: 0, sells: 0, net: 0 };
      if (t.type === 'BUY') monthlyMap[key].buys += t.total;
      else monthlyMap[key].sells += t.total;
    });

    const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      buys: Math.round(data.buys),
      sells: Math.round(data.sells),
      net: Math.round(data.buys - data.sells)
    })).sort((a, b) => a.month.localeCompare(b.month));

    res.json({ success: true, data: monthly });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAnalysis = async (req, res) => {
  try {
    const holdings = await Holdings.find({ userId: req.user.id });
    if (holdings.length === 0) return res.json({ success: true, data: {
      diversificationScore: 0, riskLevel: 'unknown',
      sectorConcentration: [], recommendations: ['Add holdings to analyze your portfolio.']
    }});

    const total = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
    const sectorMap = {};
    holdings.forEach(h => {
      const sec = h.sector || 'Other';
      sectorMap[sec] = (sectorMap[sec] || 0) + h.quantity * h.currentPrice;
    });

    const sectorConcentration = Object.entries(sectorMap)
      .map(([sector, value]) => ({ sector, value: Math.round(value), pct: Math.round((value / total) * 1000) / 10 }))
      .sort((a, b) => b.pct - a.pct);

    const hhi = Object.values(sectorMap).reduce((s, v) => s + (v / total * 100) ** 2, 0);
    const diversificationScore = Math.round(Math.max(0, Math.min(100, 100 - hhi / 2)));

    let riskLevel = 'very_low';
    if (hhi > 3000) riskLevel = 'very_high';
    else if (hhi > 2000) riskLevel = 'high';
    else if (hhi > 1200) riskLevel = 'moderate';
    else if (hhi > 600) riskLevel = 'low';

    const recommendations = [];
    if (holdings.length < 3) recommendations.push('Consider diversifying across at least 3-5 different stocks.');
    sectorConcentration.filter(s => s.pct > 40).forEach(s =>
      recommendations.push(`Your ${s.sector} allocation (${s.pct}%) is very high. Consider balancing into other sectors.`)
    );
    if (riskLevel === 'very_high') recommendations.push('Portfolio is heavily concentrated. Rebalancing is strongly recommended.');
    if (recommendations.length === 0) recommendations.push('Your portfolio is well-diversified. Maintain current allocation.');
    recommendations.push('Review holdings quarterly and rebalance when any sector exceeds 30%.');

    res.json({ success: true, data: { diversificationScore, riskLevel, sectorConcentration, recommendations } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getHoldings, getSummary, buyStock, sellStock,
  getTransactions, updatePrice, getAllocation,
  getRebalanceSuggestions, getPerformance, getAnalysis
};
