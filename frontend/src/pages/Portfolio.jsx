import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis,
  LineChart, Line, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, X, RefreshCw, BarChart3, PieChart as PieChartIcon,
  AlertTriangle, Target, DollarSign, Activity, ChevronRight, Sparkles
} from 'lucide-react';
import {
  getHoldings, getPortfolioSummary, buyStock, sellStock, getTransactions,
  updatePrice, getAllocation, getRebalanceSuggestions, getPerformance, getPortfolioAnalysis
} from '../api/investments.api';

const SECTOR_COLORS = {
  'Technology': '#8B5CF6', 'Finance': '#3B82F6', 'Healthcare': '#10B981',
  'Consumer': '#F59E0B', 'Energy': '#EC4899', 'Other': '#64748B'
};
const STOCK_COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6', '#14B8A6', '#F97316'];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const PortfolioPage = () => {
  const { settings, showToast } = useContext(AppContext);

  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({ totalInvested: 0, currentValue: 0, totalPnl: 0, totalReturns: 0, holdingsCount: 0 });
  const [allocation, setAllocation] = useState({ totalValue: 0, byStock: [], bySector: [] });
  const [rebalance, setRebalance] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('holdings');
  const [loading, setLoading] = useState(true);

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [buyForm, setBuyForm] = useState({ symbol: '', name: '', sector: 'Technology', quantity: '', price: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [sellForm, setSellForm] = useState({ symbol: '', quantity: '', price: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [priceUpdates, setPriceUpdates] = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [h, s, a, r, p, txs] = await Promise.all([
        getHoldings(), getPortfolioSummary(),
        getAllocation().catch(() => ({ totalValue: 0, byStock: [], bySector: [] })),
        getRebalanceSuggestions().catch(() => []),
        getPerformance().catch(() => []),
        getTransactions().catch(() => ({ data: [], summary: {} }))
      ]);
      setHoldings(h);
      setSummary(s);
      setAllocation(a);
      setRebalance(r);
      setPerformance(p);
      setTransactions(txs.data || []);
      getPortfolioAnalysis().then(setAnalysis).catch(() => {});
    } catch { showToast('error', 'Could not load portfolio data'); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleBuy = async (e) => {
    e.preventDefault();
    if (!buyForm.symbol || !buyForm.quantity || !buyForm.price) {
      showToast('error', 'Symbol, quantity, and price required'); return;
    }
    try {
      await buyStock({ ...buyForm, quantity: parseFloat(buyForm.quantity), price: parseFloat(buyForm.price) });
      setShowBuyModal(false);
      setBuyForm({ symbol: '', name: '', sector: 'Technology', quantity: '', price: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      await loadAll();
      showToast('success', `Bought ${buyForm.quantity} shares of ${buyForm.symbol.toUpperCase()}`);
    } catch { showToast('error', 'Buy order failed'); }
  };

  const handleSell = async (e) => {
    e.preventDefault();
    if (!sellForm.symbol || !sellForm.quantity || !sellForm.price) {
      showToast('error', 'Symbol, quantity, and price required'); return;
    }
    try {
      await sellStock({ ...sellForm, quantity: parseFloat(sellForm.quantity), price: parseFloat(sellForm.price) });
      setShowSellModal(false);
      setSellForm({ symbol: '', quantity: '', price: '', date: format(new Date(), 'yyyy-MM-dd') });
      await loadAll();
      showToast('success', `Sold ${sellForm.quantity} shares of ${sellForm.symbol.toUpperCase()}`);
    } catch { showToast('error', 'Sell order failed'); }
  };

  const handleUpdatePrice = async (symbol) => {
    const price = priceUpdates[symbol];
    if (!price || parseFloat(price) <= 0) return;
    try {
      await updatePrice(symbol, parseFloat(price));
      setPriceUpdates(p => ({ ...p, [symbol]: '' }));
      await loadAll();
      showToast('success', `Updated ${symbol} price`);
    } catch { showToast('error', 'Failed to update price'); }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 w-full pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Investment Portfolio</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowBuyModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/30 transition-all">
            <TrendingUp className="h-3 w-3" /> Buy
          </button>
          <button onClick={() => setShowSellModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl hover:bg-red-900/30 transition-all">
            <TrendingDown className="h-3 w-3" /> Sell
          </button>
          <button onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white transition-all">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {[
          { key: 'holdings', icon: BarChart3, label: 'Holdings' },
          { key: 'allocation', icon: PieChartIcon, label: 'Allocation' },
          { key: 'analysis', icon: Activity, label: 'Analysis' },
          { key: 'trades', icon: TrendingUp, label: 'Trade History' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === key ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invested', val: `${settings.currency}${summary.totalInvested.toLocaleString()}`, color: 'text-slate-300', icon: DollarSign },
          { label: 'Current Value', val: `${settings.currency}${summary.currentValue.toLocaleString()}`, color: 'text-violet-400', icon: TrendingUp },
          { label: 'Total P&L', val: `${summary.totalPnl >= 0 ? '+' : ''}${settings.currency}${summary.totalPnl.toLocaleString()}`, color: summary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400', icon: summary.totalPnl >= 0 ? TrendingUp : TrendingDown },
          { label: 'Returns', val: `${summary.totalReturns >= 0 ? '+' : ''}${summary.totalReturns}%`, color: summary.totalReturns >= 0 ? 'text-emerald-400' : 'text-red-400', icon: Target },
        ].map(({ label, val, color, icon: Icon }) => (
          <motion.div key={label} variants={item} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><Icon className={`h-4 w-4 ${color}`} /></div>
            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`font-extrabold text-lg leading-tight ${color}`}>{val}</p></div>
          </motion.div>
        ))}
      </div>

      {/* TAB: Holdings */}
      {activeTab === 'holdings' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {loading ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading holdings...</p>
              </div>
            ) : holdings.length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <BarChart3 className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                <p className="text-sm font-semibold text-slate-400">No holdings yet</p>
                <p className="text-xs text-slate-600 mt-1">Click Buy to add your first stock position.</p>
              </div>
            ) : (
              holdings.map(h => (
                <motion.div key={h._id} layout variants={item}
                  className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-violet-500/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                        <Activity className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{h.symbol}</h4>
                          <span className="text-[9px] text-slate-500 truncate max-w-[120px]">{h.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 bg-slate-900 text-slate-500 border border-slate-800 rounded-full">{h.sector}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{h.quantity} shares @ avg {settings.currency}{h.avgBuyPrice}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-base font-extrabold text-white">{settings.currency}{h.currentValue.toLocaleString()}</p>
                      <p className={`text-[10px] font-bold ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {h.pnl >= 0 ? '+' : ''}{settings.currency}{h.pnl.toLocaleString()} ({h.pnlPct >= 0 ? '+' : ''}{h.pnlPct}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900">
                    <div className="flex gap-1 items-center">
                      <span className="text-[9px] text-slate-500">Price:</span>
                      <span className="text-[9px] font-bold text-white">{settings.currency}{h.currentPrice}</span>
                      <input type="number" step="0.01" placeholder="Update"
                        value={priceUpdates[h.symbol] || ''}
                        onChange={e => setPriceUpdates(p => ({ ...p, [h.symbol]: e.target.value }))}
                        className="w-16 bg-slate-950/60 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-slate-200 focus:outline-none focus:border-violet-500 ml-2" />
                      <button onClick={() => handleUpdatePrice(h.symbol)}
                        className="text-[8px] px-1.5 py-0.5 bg-violet-600 text-white rounded hover:opacity-90">Set</button>
                    </div>
                    <span className="text-[9px] text-slate-500">{h.allocationPct}% of portfolio</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* Rebalancing Suggestions */}
            {rebalance.length > 0 && (
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Target className="h-3 w-3 text-amber-400" /> Rebalance Suggestions
                </h3>
                <div className="space-y-2">
                  {rebalance.map((r, i) => (
                    <div key={i} className={`text-[10px] px-3 py-2 rounded-lg border ${r.action === 'underweight' ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-red-950/20 border-red-500/20'}`}>
                      <div className="flex justify-between">
                        <span className="font-bold text-white">{r.sector}</span>
                        <span className={`font-bold ${r.action === 'underweight' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.currentPct}% vs target {r.targetPct}%
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{r.action === 'underweight' ? 'Underweight' : 'Overweight'} — adjust {settings.currency}{r.suggestedAdjustment.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Chart */}
            {performance.length > 0 && (
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Monthly Activity</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' }} />
                      <Bar dataKey="buys" fill="#10B981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="sells" fill="#EF4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Summary</h3>
              <div className="space-y-2 text-[10px]">
                {[
                  { label: 'Holdings', val: summary.holdingsCount.toString() },
                  { label: 'Total Invested', val: `${settings.currency}${summary.totalInvested.toLocaleString()}` },
                  { label: 'Current Value', val: `${settings.currency}${summary.currentValue.toLocaleString()}` },
                  { label: 'Realized P&L', val: `${settings.currency}${(summary.totalSells - summary.totalBuys || 0).toLocaleString()}` },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Allocation */}
      {activeTab === 'allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">By Sector</h3>
            {allocation.bySector.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-8">No holdings to allocate</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-56 w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocation.bySector} dataKey="value" nameKey="sector" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                        {allocation.bySector.map((s, i) => (
                          <Cell key={i} fill={SECTOR_COLORS[s.sector] || STOCK_COLORS[i % STOCK_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' }}
                        formatter={v => `${settings.currency}${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full mt-4">
                  {allocation.bySector.map(s => (
                    <div key={s.sector} className="flex items-center gap-2 text-[10px]">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s.sector] || '#64748B' }} />
                      <span className="text-slate-400 flex-1">{s.sector}</span>
                      <span className="font-bold text-white">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">By Stock</h3>
            {allocation.byStock.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-8">No holdings</p>
            ) : (
              <div className="space-y-3">
                {allocation.byStock.map((s, i) => (
                  <div key={s.symbol}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STOCK_COLORS[i % STOCK_COLORS.length] }} />
                        <span className="text-slate-300 font-semibold">{s.symbol}</span>
                        <span className="text-slate-600">{s.name}</span>
                      </div>
                      <span className="font-bold text-white">{s.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: STOCK_COLORS[i % STOCK_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Analysis */}
      {activeTab === 'analysis' && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <motion.div variants={item} className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Portfolio Health</h3>
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-white">{analysis.diversificationScore}</div>
                  <p className="text-[9px] text-slate-500 mt-1">Diversification Score</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-extrabold ${analysis.riskLevel === 'very_low' || analysis.riskLevel === 'low' ? 'text-emerald-400' : analysis.riskLevel === 'moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                    {analysis.riskLevel.replace('_', ' ').toUpperCase()}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">Risk Level</p>
                </div>
                {analysis.sharpeRatioEstimate != null && (
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-violet-400">{analysis.sharpeRatioEstimate}</div>
                    <p className="text-[9px] text-slate-500 mt-1">Sharpe Ratio (est.)</p>
                  </div>
                )}
              </div>
              <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400"
                  initial={{ width: 0 }} animate={{ width: `${analysis.diversificationScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                <span>Concentrated</span>
                <span>Balanced</span>
                <span>Diversified</span>
              </div>
            </motion.div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Sector Concentration</h3>
              <div className="space-y-2.5">
                {analysis.sectorConcentration.map(s => (
                  <div key={s.sector}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400">{s.sector}</span>
                      <span className="font-bold text-white">{s.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: SECTOR_COLORS[s.sector] || '#7C3AED' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-violet-400" /> Recommendations
              </h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[10px] bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="h-3 w-3 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Trade History */}
      {activeTab === 'trades' && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Trade History</h3>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-1">
              {transactions.map(t => (
                <div key={t._id} className="flex items-center justify-between text-[10px] px-4 py-2.5 bg-slate-900/40 rounded-lg border border-slate-900">
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${t.type === 'BUY' ? 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20' : 'text-red-400 bg-red-950/30 border-red-500/20'}`}>
                      {t.type}
                    </span>
                    <span className="font-bold text-white">{t.symbol}</span>
                    <span className="text-slate-500">{t.quantity} shares @ {settings.currency}{t.price}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{settings.currency}{t.total.toLocaleString()}</span>
                    <span className="text-slate-600">{format(new Date(t.date), 'dd MMM yy')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Buy Modal ─── */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBuyModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowBuyModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1"><TrendingUp className="h-4 w-4 text-emerald-400 inline mr-2" />Buy Stocks</h3>
              <p className="text-xs text-slate-400 mb-6">Record a stock purchase.</p>
              <form onSubmit={handleBuy} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Symbol</label>
                    <input type="text" placeholder="RELIANCE" value={buyForm.symbol} onChange={e => setBuyForm(f => ({ ...f, symbol: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none uppercase" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Sector</label>
                    <select value={buyForm.sector} onChange={e => setBuyForm(f => ({ ...f, sector: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      {Object.keys(SECTOR_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Company Name</label>
                  <input type="text" placeholder="Reliance Industries Ltd." value={buyForm.name} onChange={e => setBuyForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Quantity</label>
                    <input type="number" min="0" step="1" placeholder="10" value={buyForm.quantity} onChange={e => setBuyForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Price per Share ({settings.currency})</label>
                    <input type="number" min="0" step="0.01" placeholder="2500.00" value={buyForm.price} onChange={e => setBuyForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Date</label>
                    <input type="date" value={buyForm.date} onChange={e => setBuyForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Total</label>
                    <div className="text-sm font-bold text-white mt-2.5">{settings.currency}{(parseFloat(buyForm.quantity || 0) * parseFloat(buyForm.price || 0)).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowBuyModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:opacity-90">Buy</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Sell Modal ─── */}
      <AnimatePresence>
        {showSellModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSellModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowSellModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1"><TrendingDown className="h-4 w-4 text-red-400 inline mr-2" />Sell Stocks</h3>
              <p className="text-xs text-slate-400 mb-6">Record a stock sale.</p>
              <form onSubmit={handleSell} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Symbol</label>
                    <select value={sellForm.symbol} onChange={e => setSellForm(f => ({ ...f, symbol: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required>
                      <option value="">Select holding...</option>
                      {holdings.map(h => <option key={h.symbol} value={h.symbol}>{h.symbol} — {h.quantity} shares</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Quantity</label>
                    <input type="number" min="0" step="1" placeholder="5" value={sellForm.quantity} onChange={e => setSellForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Price per Share ({settings.currency})</label>
                    <input type="number" min="0" step="0.01" placeholder="2600.00" value={sellForm.price} onChange={e => setSellForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Date</label>
                    <input type="date" value={sellForm.date} onChange={e => setSellForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowSellModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold rounded-xl hover:opacity-90">Sell</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
