const { Asset, NetWorthSnapshot } = require('../models/Asset.model');

const ASSET_LABELS = {
  cash: 'Cash', bank: 'Bank Accounts', investment: 'Investments',
  property: 'Real Estate', vehicle: 'Vehicles', crypto: 'Crypto',
  valuables: 'Valuables', business: 'Business', other: 'Other'
};

const getAssets = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { userId: req.user.id };
    if (type) filter.type = type;
    const assets = await Asset.find(filter).sort({ value: -1 });
    const total = assets.reduce((s, a) => s + a.value, 0);
    const enriched = assets.map(a => ({
      ...a.toObject(),
      allocationPct: total > 0 ? Math.round((a.value / total) * 10000) / 100 : 0,
      appreciation: a.acquisitionValue > 0
        ? Math.round(((a.value - a.acquisitionValue) / a.acquisitionValue) * 10000) / 100
        : 0
    }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createAsset = async (req, res) => {
  try {
    const { name, type, value, acquisitionValue, acquisitionDate, notes, growthRate, liquid } = req.body;
    if (!name || !type || value === undefined) {
      return res.status(400).json({ success: false, message: 'name, type, value required' });
    }
    const asset = await Asset.create({
      userId: req.user.id, name, type,
      value, acquisitionValue: acquisitionValue || value,
      acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
      notes, growthRate: growthRate || 0, liquid: liquid || false
    });
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.userId;
    const asset = await Asset.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getNetWorth = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id });
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);

    const byType = {};
    assets.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + a.value;
    });

    const latestSnapshot = await NetWorthSnapshot.findOne({ userId: req.user.id }).sort({ date: -1 });
    const totalLiabilities = latestSnapshot?.totalLiabilities || 0;
    const netWorth = totalAssets - totalLiabilities;

    const liquid = assets.filter(a => a.liquid).reduce((s, a) => s + a.value, 0);

    res.json({
      success: true,
      data: {
        totalAssets: Math.round(totalAssets),
        totalLiabilities: Math.round(totalLiabilities),
        netWorth: Math.round(netWorth),
        liquidAssets: Math.round(liquid),
        assetCount: assets.length,
        byType,
        breakdown: Object.entries(byType).map(([type, value]) => ({
          type,
          label: ASSET_LABELS[type] || type,
          value: Math.round(value),
          pct: totalAssets > 0 ? Math.round((value / totalAssets) * 10000) / 100 : 0
        })).sort((a, b) => b.value - a.value)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLiabilities = async (req, res) => {
  try {
    const { totalLiabilities, breakdown } = req.body;
    const snapshot = await NetWorthSnapshot.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          totalLiabilities: totalLiabilities || 0,
          'liabilities.other': totalLiabilities || 0,
          date: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Also create a full net worth snapshot
    const assets = await Asset.find({ userId: req.user.id });
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const byType = {};
    assets.forEach(a => { byType[a.type] = (byType[a.type] || 0) + a.value; });

    await NetWorthSnapshot.create({
      userId: req.user.id,
      date: new Date(),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: totalLiabilities || 0,
      netWorth: Math.round(totalAssets - (totalLiabilities || 0)),
      breakdown: byType,
      liabilities: { other: totalLiabilities || 0 }
    });

    res.json({ success: true, message: 'Liabilities updated', data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const snapshots = await NetWorthSnapshot.find({
      userId: req.user.id,
      date: { $gte: since }
    }).sort({ date: 1 });

    // Also generate current from assets if no snapshots
    if (snapshots.length === 0) {
      const assets = await Asset.find({ userId: req.user.id });
      const totalAssets = assets.reduce((s, a) => s + a.value, 0);
      const latestLiab = await NetWorthSnapshot.findOne({ userId: req.user.id }).sort({ date: -1 });
      const liab = latestLiab?.totalLiabilities || 0;

      if (assets.length > 0) {
        snapshots.push({
          date: new Date(),
          totalAssets: Math.round(totalAssets),
          totalLiabilities: Math.round(liab),
          netWorth: Math.round(totalAssets - liab)
        });
      }
    }

    const data = snapshots.map(s => ({
      date: s.date.toISOString().slice(0, 7),
      totalAssets: s.totalAssets || 0,
      totalLiabilities: s.totalLiabilities || 0,
      netWorth: s.netWorth || 0
    }));

    const latest = data.length > 0 ? data[data.length - 1] : null;
    const first = data.length > 0 ? data[0] : null;
    const change = first && latest
      ? first.netWorth > 0 ? Math.round(((latest.netWorth - first.netWorth) / first.netWorth) * 10000) / 100 : 0
      : 0;

    res.json({ success: true, data: { history: data, change, startNetWorth: first?.netWorth || 0, currentNetWorth: latest?.netWorth || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getGoal = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id });
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const snapshot = await NetWorthSnapshot.findOne({ userId: req.user.id }).sort({ date: -1 });
    const liab = snapshot?.totalLiabilities || 0;
    const netWorth = totalAssets - liab;
    const monthlySavings = 50000; // estimate, could come from transactions

    const targets = [
      { label: '₹1 Cr', value: 10000000, years: netWorth >= 10000000 ? 0 : Math.ceil((10000000 - netWorth) / (monthlySavings * 12)) },
      { label: '₹5 Cr', value: 50000000, years: netWorth >= 50000000 ? 0 : Math.ceil((50000000 - netWorth) / (monthlySavings * 12)) },
      { label: '₹10 Cr', value: 100000000, years: netWorth >= 100000000 ? 0 : Math.ceil((100000000 - netWorth) / (monthlySavings * 12)) },
    ];

    res.json({
      success: true,
      data: {
        currentNetWorth: Math.round(netWorth),
        monthlySavingsEstimate: monthlySavings,
        targets
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAssets, createAsset, updateAsset, deleteAsset,
  getNetWorth, updateLiabilities, getHistory, getGoal
};
