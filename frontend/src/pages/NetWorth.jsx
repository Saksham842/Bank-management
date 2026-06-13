import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ComposedChart, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, X, RefreshCw, DollarSign,
  Target, AlertTriangle, Building, PiggyBank, Home, Car,
  Bitcoin, Wallet, Briefcase, Gem, Banknote, Sparkles
} from 'lucide-react';
import {
  getAssets, createAsset, updateAsset, deleteAsset,
  getNetWorth, updateLiabilities, getNetWorthHistory, getNetWorthGoal
} from '../api/networth.api';

const ASSET_CONFIG = {
  cash: { label: 'Cash', icon: Banknote, color: '#10B981', liquid: true },
  bank: { label: 'Bank Accounts', icon: Wallet, color: '#3B82F6', liquid: true },
  investment: { label: 'Investments', icon: TrendingUp, color: '#8B5CF6', liquid: true },
  property: { label: 'Real Estate', icon: Building, color: '#F59E0B', liquid: false },
  vehicle: { label: 'Vehicles', icon: Car, color: '#EC4899', liquid: false },
  crypto: { label: 'Crypto', icon: Bitcoin, color: '#F97316', liquid: true },
  valuables: { label: 'Valuables', icon: Gem, color: '#06B6D4', liquid: false },
  business: { label: 'Business', icon: Briefcase, color: '#14B8A6', liquid: false },
  other: { label: 'Other', icon: PiggyBank, color: '#64748B', liquid: false }
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const NetWorthPage = () => {
  const { settings, showToast } = useContext(AppContext);

  const [assets, setAssets] = useState([]);
  const [netWorth, setNetWorth] = useState(null);
  const [history, setHistory] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [typeFilter, setTypeFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showLiabModal, setShowLiabModal] = useState(false);
  const [liabAmount, setLiabAmount] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);

  const [newAsset, setNewAsset] = useState({
    name: '', type: 'cash', value: '', acquisitionValue: '',
    acquisitionDate: format(new Date(), 'yyyy-MM-dd'), notes: '', liquid: false
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, nw, h, g] = await Promise.all([
        getAssets(typeFilter || undefined),
        getNetWorth(),
        getNetWorthHistory(24).catch(() => null),
        getNetWorthGoal().catch(() => null)
      ]);
      setAssets(a);
      setNetWorth(nw);
      setHistory(h);
      setGoal(g);
    } catch { showToast('error', 'Could not load net worth data'); }
    setLoading(false);
  }, [typeFilter, showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.value || parseFloat(newAsset.value) <= 0) {
      showToast('error', 'Name and value required'); return;
    }
    try {
      await createAsset({
        ...newAsset,
        value: parseFloat(newAsset.value),
        acquisitionValue: parseFloat(newAsset.acquisitionValue || newAsset.value),
        liquid: ASSET_CONFIG[newAsset.type]?.liquid || false
      });
      setShowAddModal(false);
      setNewAsset({ name: '', type: 'cash', value: '', acquisitionValue: '', acquisitionDate: format(new Date(), 'yyyy-MM-dd'), notes: '', liquid: false });
      await loadAll();
      showToast('success', 'Asset added');
    } catch { showToast('error', 'Failed to add asset'); }
  };

  const handleDelete = async (id, name) => {
    try {
      await deleteAsset(id);
      await loadAll();
      showToast('warning', `Deleted ${name}`);
    } catch { showToast('error', 'Failed to delete'); }
  };

  const handleLiabilities = async () => {
    if (!liabAmount || parseFloat(liabAmount) < 0) { showToast('error', 'Enter a valid amount'); return; }
    try {
      await updateLiabilities(parseFloat(liabAmount));
      setShowLiabModal(false);
      await loadAll();
      showToast('success', 'Liabilities updated');
    } catch { showToast('error', 'Failed to update'); }
  };

  // Chart data
  const historyChartData = history?.history || [];
  const allocationData = netWorth?.breakdown || [];
  const projectionData = goal?.targets?.map(t => ({ name: t.label, value: t.value, years: t.years })) || [];

  const formatVal = (v) => `${settings.currency}${(v || 0).toLocaleString()}`;
  const chartStyle = { backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 w-full pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Net Worth Tracker</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowLiabModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl hover:bg-red-900/30 transition-all">
            <TrendingDown className="h-3 w-3" /> Liabilities
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/30 transition-all">
            <Plus className="h-3 w-3" /> Add Asset
          </button>
          <button onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white transition-all">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {[
          { key: 'overview', icon: DollarSign, label: 'Overview' },
          { key: 'assets', icon: Building, label: 'Assets' },
          { key: 'allocation', icon: PieChart, label: 'Allocation' },
          { key: 'goals', icon: Target, label: 'Goals' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === key ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* KPI Row (always visible) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Net Worth', val: formatVal(netWorth?.netWorth), color: netWorth?.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400', icon: DollarSign },
          { label: 'Total Assets', val: formatVal(netWorth?.totalAssets), color: 'text-violet-400', icon: TrendingUp },
          { label: 'Liabilities', val: formatVal(netWorth?.totalLiabilities), color: 'text-red-400', icon: TrendingDown },
          { label: 'Liquid Assets', val: formatVal(netWorth?.liquidAssets), color: 'text-cyan-400', icon: Wallet },
        ].map(({ label, val, color, icon: Icon }) => (
          <motion.div key={label} variants={item} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><Icon className={`h-4 w-4 ${color}`} /></div>
            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`font-extrabold text-lg leading-tight ${color}`}>{val}</p></div>
          </motion.div>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {historyChartData.length > 0 && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Net Worth Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyChartData}>
                      <defs>
                        <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                        tickFormatter={(v) => { const [y, m] = v.split('-'); return `${MONTHS[parseInt(m) - 1]} ${y}`; }} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                        tickFormatter={v => `${settings.currency}${(v / 100000).toFixed(1)}L`} />
                      <Tooltip contentStyle={chartStyle} formatter={v => formatVal(v)} />
                      <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} />
                      <Area type="monotone" dataKey="netWorth" stroke="#7C3AED" strokeWidth={2} fill="url(#nwGrad)" name="Net Worth" />
                      <Area type="monotone" dataKey="totalAssets" stroke="#10B981" strokeWidth={1.5} fill="none" name="Assets" />
                      <Area type="monotone" dataKey="totalLiabilities" stroke="#EF4444" strokeWidth={1.5} fill="none" name="Liabilities" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Allocation pie + details */}
            <motion.div variants={item} className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Asset Breakdown</h3>
              {allocationData.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8">Add assets to see allocation</p>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="h-48 w-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={allocationData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                          {allocationData.map((d, i) => (
                            <Cell key={i} fill={ASSET_CONFIG[d.type]?.color || '#64748B'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartStyle} formatter={v => formatVal(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                    {allocationData.map(d => (
                      <div key={d.type} className="flex items-center gap-2 text-[10px]">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_CONFIG[d.type]?.color || '#64748B' }} />
                        <span className="text-slate-400 flex-1 truncate">{ASSET_CONFIG[d.type]?.label || d.type}</span>
                        <span className="font-bold text-white">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {history && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Net Worth Change</h3>
                <div className="text-center py-3">
                  <div className={`text-3xl font-extrabold ${history.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {history.change >= 0 ? '+' : ''}{history.change}%
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">since first recorded</p>
                </div>
                <div className="space-y-2 text-[10px]">
                  {[
                    { label: 'Starting NW', val: formatVal(history.startNetWorth) },
                    { label: 'Current NW', val: formatVal(history.currentNetWorth) },
                    { label: 'Growth', val: `${history.change >= 0 ? '+' : ''}${history.change}%`, color: history.change >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Asset Count', val: (netWorth?.assetCount || 0).toString() },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-bold ${color || 'text-white'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {goal && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Target className="h-3 w-3 text-violet-400" /> Wealth Targets
                </h3>
                <div className="space-y-2">
                  {goal.targets.map(t => {
                    const pct = goal.currentNetWorth > 0 ? Math.min(100, (goal.currentNetWorth / t.value) * 100) : 0;
                    return (
                      <div key={t.label}>
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-slate-300 font-bold">{t.label}</span>
                          <span className={`${t.years <= 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{t.years <= 0 ? 'ACHIEVED 🎉' : `${t.years} yrs`}</span>
                        </div>
                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ─── ASSETS TAB ─── */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {/* Type filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setTypeFilter('')}
                className={`px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg ${!typeFilter ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>All</button>
              {Object.entries(ASSET_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setTypeFilter(k)}
                  className={`px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg ${typeFilter === k ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                  {v.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
              </div>
            ) : assets.length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <Building className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                <p className="text-sm font-semibold text-slate-400">No assets tracked</p>
                <p className="text-xs text-slate-600 mt-1">Add cash, bank accounts, property, investments, and more.</p>
              </div>
            ) : (
              assets.map(a => {
                const cfg = ASSET_CONFIG[a.type] || ASSET_CONFIG.other;
                const Icon = cfg.icon;
                return (
                  <motion.div key={a._id} layout variants={item}
                    className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-violet-500/20 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0" style={{ color: cfg.color }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{a.name}</h4>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: `${cfg.color}33`, color: cfg.color, backgroundColor: `${cfg.color}11` }}>
                              {cfg.label}
                            </span>
                            {a.liquid && <span className="text-[8px] text-cyan-400">💧 Liquid</span>}
                          </div>
                          {a.acquisitionDate && (
                            <p className="text-[9px] text-slate-500 mt-0.5">Since {format(new Date(a.acquisitionDate), 'MMM yyyy')}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-base font-extrabold text-white">{formatVal(a.value)}</p>
                        {a.acquisitionValue > 0 && a.acquisitionValue !== a.value && (
                          <p className={`text-[9px] font-bold ${a.appreciation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {a.appreciation >= 0 ? '+' : ''}{a.appreciation}% since acquisition
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900">
                      <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="font-semibold">{a.allocationPct}% of portfolio</span>
                        {a.notes && <><span className="text-slate-800">|</span><span className="truncate max-w-[140px]">{a.notes}</span></>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(a._id, a.name)}
                          className="p-1 text-red-400 hover:bg-red-950/30 rounded-lg transition-all">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {allocationData.length > 0 && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Asset Composition</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allocationData} layout="vertical" barGap={3}>
                      <XAxis type="number" stroke="#475569" fontSize={8} tickLine={false} axisLine={false}
                        tickFormatter={v => `${settings.currency}${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="label" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} width={60} />
                      <Tooltip contentStyle={chartStyle} formatter={v => formatVal(v)} />
                      <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                        {allocationData.map((d, i) => (
                          <Cell key={i} fill={ASSET_CONFIG[d.type]?.color || '#64748B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            <motion.div variants={item} className="glass-panel rounded-2xl p-5">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Quick Summary</h3>
              <div className="space-y-2 text-[10px]">
                {[
                  { label: 'Cash & Bank', val: formatVal(allocationData.filter(d => ['cash','bank'].includes(d.type)).reduce((s, d) => s + d.value, 0)) },
                  { label: 'Investments', val: formatVal(allocationData.filter(d => d.type === 'investment').reduce((s, d) => s + d.value, 0)) },
                  { label: 'Real Estate', val: formatVal(allocationData.filter(d => d.type === 'property').reduce((s, d) => s + d.value, 0)) },
                  { label: 'Other Assets', val: formatVal(allocationData.filter(d => !['cash','bank','investment','property'].includes(d.type)).reduce((s, d) => s + d.value, 0)) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-white">{val}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ─── ALLOCATION TAB ─── */}
      {activeTab === 'allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={item} className="glass-panel rounded-2xl p-6">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">By Asset Type</h3>
            {allocationData.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-8">No assets</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-56 w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                        {allocationData.map((d, i) => (
                          <Cell key={i} fill={ASSET_CONFIG[d.type]?.color || '#64748B'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartStyle} formatter={v => formatVal(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  {allocationData.map(d => (
                    <div key={d.type} className="flex items-center gap-2 text-[10px]">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_CONFIG[d.type]?.color || '#64748B' }} />
                      <span className="text-slate-400 flex-1">{ASSET_CONFIG[d.type]?.label || d.type}</span>
                      <span className="font-bold text-white">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={item} className="glass-panel rounded-2xl p-6">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Health Assessment</h3>
            {netWorth ? (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-white">
                    {netWorth.totalAssets > 0 ? Math.round((netWorth.liquidAssets / netWorth.totalAssets) * 100) : 0}%
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">Liquidity Ratio</p>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, (netWorth.liquidAssets / Math.max(1, netWorth.totalAssets)) * 100)}%` }} />
                  </div>
                  <p className="text-[8px] text-slate-600 mt-1">Target: 15-20% liquid</p>
                </div>

                <div className="text-center">
                  <div className={`text-4xl font-extrabold ${netWorth.totalLiabilities > netWorth.totalAssets * 0.5 ? 'text-red-400' : netWorth.totalLiabilities > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {netWorth.totalAssets > 0 ? Math.round((netWorth.totalLiabilities / netWorth.totalAssets) * 100) : 0}%
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">Debt-to-Asset Ratio</p>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${netWorth.totalLiabilities > netWorth.totalAssets * 0.5 ? 'bg-red-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, (netWorth.totalLiabilities / Math.max(1, netWorth.totalAssets)) * 100)}%` }} />
                  </div>
                  <p className="text-[8px] text-slate-600 mt-1">Keep below 50%</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 text-center py-8">Add assets to see health assessment</p>
            )}
          </motion.div>
        </div>
      )}

      {/* ─── GOALS TAB ─── */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {projectionData.length > 0 && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Net Worth Targets</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                        tickFormatter={v => `${settings.currency}${(v / 100000).toFixed(1)}L`} />
                      <Tooltip contentStyle={chartStyle} formatter={v => formatVal(v)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {projectionData.map((d, i) => {
                          const pct = goal?.currentNetWorth > 0 ? (goal.currentNetWorth / d.value) * 100 : 0;
                          return <Cell key={i} fill={pct >= 100 ? '#10B981' : pct >= 50 ? '#7C3AED' : '#475569'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {goal && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Target Timeline</h3>
                <div className="space-y-3">
                  {goal.targets.map(t => {
                    const pct = Math.min(100, (goal.currentNetWorth / t.value) * 100);
                    return (
                      <div key={t.label} className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3">
                        <div className="flex justify-between text-[10px] mb-2">
                          <span className="font-bold text-white">{t.label}</span>
                          <span className={`font-bold ${t.years <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {t.years <= 0 ? 'ACHIEVED' : `${t.years} years`}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-600 mt-1">
                          <span>{formatVal(goal.currentNetWorth)} now</span>
                          <span>{formatVal(t.value)} target</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {goal && (
              <>
                <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-violet-400" /> Path to Wealth
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: DollarSign, text: `Current net worth: ${formatVal(goal.currentNetWorth)}`, color: 'text-violet-400' },
                      { icon: Wallet, text: `Estimated monthly savings: ${formatVal(goal.monthlySavingsEstimate)}`, color: 'text-emerald-400' },
                      { icon: TrendingUp, text: `₹1 Cr target: ${goal.targets[0]?.years || '—'} years away`, color: 'text-amber-400' },
                      { icon: Target, text: `₹10 Cr target: ${goal.targets[2]?.years || '—'} years away`, color: 'text-cyan-400' },
                    ].map(({ icon: Icon, text, color }, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2.5">
                        <Icon className={`h-3 w-3 ${color} flex-shrink-0 mt-0.5`} />
                        <span className="text-slate-300">{text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Wealth Tips</h3>
                  <div className="space-y-2">
                    {[
                      'Increase savings rate to 30%+ to accelerate wealth building',
                      'Diversify across real estate, equities, and fixed income',
                      'Keep 6 months of expenses in liquid assets for emergencies',
                      'Review asset allocation quarterly and rebalance annually',
                      'Maximize tax-advantaged investments (PPF, ELSS, NPS)',
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-[9px] text-slate-400 bg-slate-900/30 rounded-lg px-3 py-2">
                        <Sparkles className="h-2.5 w-2.5 text-violet-400 flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Add Asset Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowAddModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">Add Asset</h3>
              <p className="text-xs text-slate-400 mb-6">Track what you own.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Name</label>
                    <input type="text" placeholder="Apartment, Car, etc." value={newAsset.name} onChange={e => setNewAsset(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Type</label>
                    <select value={newAsset.type} onChange={e => setNewAsset(f => ({ ...f, type: e.target.value, liquid: ASSET_CONFIG[e.target.value]?.liquid || false }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      {Object.entries(ASSET_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Current Value ({settings.currency})</label>
                    <input type="number" min="0" placeholder="5000000" value={newAsset.value} onChange={e => setNewAsset(f => ({ ...f, value: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Acquisition Value</label>
                    <input type="number" min="0" placeholder="Same as current" value={newAsset.acquisitionValue} onChange={e => setNewAsset(f => ({ ...f, acquisitionValue: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Acquisition Date</label>
                  <input type="date" value={newAsset.acquisitionDate} onChange={e => setNewAsset(f => ({ ...f, acquisitionDate: e.target.value }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Notes (optional)</label>
                  <input type="text" placeholder="Any details..." value={newAsset.notes} onChange={e => setNewAsset(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" />
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:opacity-90">Add Asset</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Liabilities Modal ─── */}
      <AnimatePresence>
        {showLiabModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLiabModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-sm glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowLiabModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1"><TrendingDown className="h-4 w-4 text-red-400 inline mr-2" />Update Liabilities</h3>
              <p className="text-xs text-slate-400 mb-6">Total outstanding debt across all loans, credit cards, mortgages.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Total Liabilities ({settings.currency})</label>
                  <input type="number" min="0" placeholder="2500000" value={liabAmount} onChange={e => setLiabAmount(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" autoFocus />
                </div>
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl px-3 py-2 text-[9px] text-amber-300">
                  Current net worth: {formatVal(netWorth?.netWorth)}. After update: {formatVal((netWorth?.totalAssets || 0) - (parseFloat(liabAmount) || 0))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowLiabModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl">Cancel</button>
                  <button onClick={handleLiabilities} className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold rounded-xl hover:opacity-90">Save</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
