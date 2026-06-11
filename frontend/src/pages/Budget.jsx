import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import {
  Target, Plus, X, Wallet, Sparkles, Trophy, ChevronRight,
  AlertTriangle, TrendingUp, Settings, RefreshCw, Shield,
  PiggyBank, BarChart3, Calendar, Download, Lightbulb
} from 'lucide-react';
import {
  getBudgets, setBudget as apiSetBudget,
  getBudgetVsActual, getBudgetRecommendations,
  getBudgetHistory, recalculateSpent, saveMonthlySnapshot
} from '../api/budgets.api';

const GOAL_ICONS = { 'Emergency Fund': '🛡️', 'Travel Fund': '✈️', 'Home Purchase': '🏠', 'Education': '🎓', 'Retirement': '💼', 'Car': '🚗', 'Investment': '📈', 'Other': '🎯' };
const GOAL_COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

export const BudgetPage = () => {
  const { goals, saveGoal, addGoalContribution, settings, transactions, showToast } = useContext(AppContext);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showContribModal, setShowContribModal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [newGoal, setNewGoal] = useState({ name: 'Emergency Fund', targetAmount: '', targetDate: '', icon: '🛡️', description: '' });

  const [budgets, setBudgets] = useState([]);
  const [activeTab, setActiveTab] = useState('budgets');
  const [editingBudget, setEditingBudget] = useState(null);
  const [editLimit, setEditLimit] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configCategory, setConfigCategory] = useState('');
  const [configLimit, setConfigLimit] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const getFromAPI = useCallback(async () => {
    setLoading(true);
    try {
      const [apiBudgets, apiHistory] = await Promise.all([
        getBudgetVsActual(currentMonth),
        getBudgetHistory().catch(() => [])
      ]);
      setBudgets(apiBudgets);
      setBudgetHistory(apiHistory);
    } catch {
      // Fallback: compute budgets from hardcoded defaults
      const CATEGORY_LIMITS = {
        Food: 8000, Transport: 4000, Entertainment: 3000,
        Shopping: 6000, Bills: 5000, Health: 3000
      };
      const catSpend = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
      });
      setBudgets(Object.entries(CATEGORY_LIMITS).map(([cat, limit]) => ({
        category: cat, limit, spent: catSpend[cat] || 0,
        remaining: Math.max(0, limit - (catSpend[cat] || 0)),
        overBudget: (catSpend[cat] || 0) > limit,
        pctUsed: Math.min(100, Math.round(((catSpend[cat] || 0) / limit) * 100))
      })));
    }
    setLoading(false);
  }, [currentMonth, transactions]);

  useEffect(() => { getFromAPI(); }, [getFromAPI]);

  const handleRecalculate = async () => {
    setRefreshing(true);
    try {
      await recalculateSpent(currentMonth);
      await getFromAPI();
      showToast('success', 'Budget spent amounts recalculated from transactions');
    } catch {
      showToast('error', 'Could not recalculate. Try again.');
    }
    setRefreshing(false);
  };

  const handleSetBudget = async () => {
    if (!configCategory || !configLimit || parseFloat(configLimit) <= 0) {
      showToast('error', 'Enter a valid category and limit');
      return;
    }
    try {
      await apiSetBudget({ category: configCategory, limit: parseFloat(configLimit), month: currentMonth });
      await getFromAPI();
      await saveMonthlySnapshot().catch(() => {});
      setShowConfigModal(false);
      setConfigCategory('');
      setConfigLimit('');
      showToast('success', `Budget set for ${configCategory}`);
    } catch {
      showToast('error', 'Failed to save budget');
    }
  };

  const loadRecommendations = async () => {
    setShowRecommendations(true);
    try {
      const recs = await getBudgetRecommendations();
      setRecommendations(recs);
    } catch {
      // Fallback: generate from local transactions
      const catSpend = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
      });
      const total = Object.values(catSpend).reduce((a, b) => a + b, 0);
      const weights = { Food: 0.25, Transport: 0.10, Shopping: 0.15, Bills: 0.12, Health: 0.08, Entertainment: 0.05 };
      setRecommendations(Object.entries(catSpend).map(([cat, avg]) => ({
        category: cat,
        suggested_limit: Math.max(avg * 1.1, total * (weights[cat] || 0.08)),
        historical_avg: avg,
        rationale: `Based on your ${cat.toLowerCase()} spending history`,
        confidence: 'medium'
      })));
    }
  };

  const applyRecommendation = async (rec) => {
    try {
      await apiSetBudget({ category: rec.category, limit: Math.round(rec.suggested_limit), month: currentMonth });
      await getFromAPI();
      showToast('success', `Budget set for ${rec.category}: ${settings.currency}${Math.round(rec.suggested_limit)}`);
    } catch {
      showToast('error', 'Failed to apply recommendation');
    }
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.targetAmount || !newGoal.targetDate) { showToast('error', 'Set a target amount and date.'); return; }
    saveGoal({ ...newGoal, targetAmount: parseFloat(newGoal.targetAmount) });
    setNewGoal({ name: 'Emergency Fund', targetAmount: '', targetDate: '', icon: '🛡️', description: '' });
    setShowAddModal(false);
  };

  const handleContrib = (e) => {
    e.preventDefault();
    if (!contribAmount || parseFloat(contribAmount) <= 0) { showToast('error', 'Enter a valid amount.'); return; }
    addGoalContribution(showContribModal.id, parseFloat(contribAmount));
    setContribAmount('');
    setShowContribModal(null);
  };

  const getDaysLeft = (targetDate) => Math.max(0, differenceInDays(parseISO(targetDate), new Date()));
  const totalGoalTarget = goals.reduce((a, g) => a + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((a, g) => a + (g.savedAmount || 0), 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const overBudgetCount = budgets.filter(b => b.overBudget).length;
  const totalBudgeted = budgets.reduce((s, b) => s + (b.limit || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
  const totalRemaining = budgets.reduce((s, b) => s + (b.remaining || 0), 0);

  const historyChartData = budgetHistory.length > 0
    ? budgetHistory.map(h => ({
        month: h.month ? MONTHS[parseInt(h.month.split('-')[1]) - 1] : '',
        budgeted: h.totalBudgeted || 0,
        spent: h.totalSpent || 0
      })).reverse()
    : [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 w-full pb-10">

      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          {[
            { key: 'budgets', icon: Wallet, label: 'Budgets' },
            { key: 'goals', icon: Target, label: 'Goals' },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === key ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-slate-400 hover:text-white'}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeTab === 'budgets' && (
            <>
              <button onClick={loadRecommendations}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 rounded-xl hover:bg-amber-900/30 transition-all">
                <Lightbulb className="h-3 w-3" /> AI Recommend
              </button>
              <button onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/30 transition-all">
                <Settings className="h-3 w-3" /> Configure
              </button>
            </>
          )}
          {activeTab === 'goals' && (
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-900/30">
              <Plus className="h-3.5 w-3.5" /> New Goal
            </button>
          )}
        </div>
      </div>

      {activeTab === 'budgets' && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Budget', val: `${settings.currency}${totalBudgeted.toLocaleString()}`, color: 'text-violet-400', icon: Wallet },
              { label: 'Spent', val: `${settings.currency}${totalSpent.toLocaleString()}`, color: totalSpent > totalBudgeted ? 'text-red-400' : 'text-emerald-400', icon: TrendingUp },
              { label: 'Remaining', val: `${settings.currency}${totalRemaining.toLocaleString()}`, color: totalRemaining < 0 ? 'text-red-400' : 'text-emerald-400', icon: PiggyBank },
              { label: 'Over Budget', val: overBudgetCount > 0 ? `${overBudgetCount} category${overBudgetCount > 1 ? 's' : ''}` : 'None', color: overBudgetCount > 0 ? 'text-red-400' : 'text-emerald-400', icon: AlertTriangle }
            ].map(({ label, val, color, icon: Icon }) => (
              <motion.div key={label} variants={item} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800`}><Icon className={`h-4 w-4 ${color}`} /></div>
                <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`font-extrabold text-lg leading-tight ${color}`}>{val}</p></div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Budget Bars */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-white">Category Budgets</h2>
                <button onClick={handleRecalculate} disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white transition-all">
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /> Recalc
                </button>
              </div>

              {loading ? (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-xs text-slate-500">Loading budgets...</p>
                </div>
              ) : budgets.length === 0 ? (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <Wallet className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-slate-400">No budgets configured</p>
                  <p className="text-xs text-slate-600 mt-1">Click Configure to set your first category budget.</p>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-5">
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgets} layout="vertical" barGap={4}>
                        <XAxis type="number" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${settings.currency}${v}`} />
                        <YAxis type="category" dataKey="category" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} width={76} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px' }} itemStyle={{ fontSize: '10px' }} formatter={v => `${settings.currency}${v.toLocaleString()}`} />
                        <Bar dataKey="spent" name="Spent" radius={[0, 4, 4, 0]}>
                          {budgets.map((b, i) => (
                            <Cell key={i} fill={b.pctUsed > 90 ? '#EF4444' : b.pctUsed > 70 ? '#F59E0B' : '#7C3AED'} fillOpacity={0.8} />
                          ))}
                        </Bar>
                        <Bar dataKey="limit" name="Limit" fill="#1e293b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5 mt-4">
                    {budgets.map(b => (
                      <motion.div key={b.category} layout className="group">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium w-20 truncate">{b.category}</span>
                            {b.overBudget && <AlertTriangle className="h-3 w-3 text-red-400" />}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">{settings.currency}{(b.spent || 0).toLocaleString()} / {settings.currency}{(b.limit || 0).toLocaleString()}</span>
                            <span className={`font-bold w-8 text-right ${b.pctUsed > 90 ? 'text-red-400' : b.pctUsed > 70 ? 'text-amber-400' : 'text-slate-300'}`}>
                              {b.pctUsed}%
                            </span>
                            <button onClick={() => { setEditingBudget(editingBudget === b.category ? null : b.category); setEditLimit(b.limit?.toString() || ''); }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition-all">
                              <Settings className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full transition-all"
                            initial={{ width: 0 }} animate={{ width: `${b.pctUsed}%` }}
                            style={{ backgroundColor: b.pctUsed > 90 ? '#EF4444' : b.pctUsed > 70 ? '#F59E0B' : '#7C3AED' }} />
                        </div>
                        {editingBudget === b.category && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="flex gap-2 mt-2 mb-1">
                            <input type="number" value={editLimit} onChange={e => setEditLimit(e.target.value)}
                              className="w-28 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-violet-500" />
                            <button onClick={async () => {
                              try {
                                await apiSetBudget({ category: b.category, limit: parseFloat(editLimit), month: currentMonth });
                                await getFromAPI();
                                setEditingBudget(null);
                                showToast('success', `Updated ${b.category} budget`);
                              } catch { showToast('error', 'Failed to update'); }
                            }} className="px-2.5 py-1 bg-violet-600 text-white text-[9px] font-bold rounded-lg">Save</button>
                            <button onClick={() => setEditingBudget(null)} className="px-2.5 py-1 bg-slate-900 text-slate-400 text-[9px] font-bold rounded-lg">Cancel</button>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar: History + Alerts */}
            <div className="lg:col-span-2 space-y-4">
              {overBudgetCount > 0 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-bold text-red-400">Budget Alert</span>
                  </div>
                  <p className="text-[10px] text-red-300/80 mb-3">
                    {overBudgetCount} categor{overBudgetCount > 1 ? 'ies have' : 'y has'} exceeded the monthly limit.
                  </p>
                  <div className="space-y-2">
                    {budgets.filter(b => b.overBudget).map(b => (
                      <div key={b.category} className="flex justify-between text-[10px] bg-red-950/30 rounded-lg px-3 py-2">
                        <span className="text-red-300">{b.category}</span>
                        <span className="text-red-400 font-bold">{settings.currency}{(b.spent - b.limit).toLocaleString()} over</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {historyChartData.length > 0 && (
                <div className="glass-panel rounded-2xl p-4">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                    <BarChart3 className="h-3 w-3" /> Budget History
                  </h3>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${settings.currency}${v}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="budgeted" stroke="#7C3AED" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="spent" stroke="#EF4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Budget Summary</h3>
                <div className="space-y-2 text-[10px]">
                  {[
                    { label: 'Total Budgeted', val: `${settings.currency}${totalBudgeted.toLocaleString()}`, color: 'text-violet-400' },
                    { label: 'Total Spent', val: `${settings.currency}${totalSpent.toLocaleString()}`, color: totalSpent > totalBudgeted ? 'text-red-400' : 'text-emerald-400' },
                    { label: 'Remaining', val: `${settings.currency}${totalRemaining.toLocaleString()}`, color: totalRemaining > 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Savings Rate', val: totalIncome > 0 ? `${Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)}%` : 'N/A', color: 'text-cyan-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-bold ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Saved', val: `${settings.currency}${totalSaved.toLocaleString()}`, color: 'text-emerald-400', icon: Trophy },
                { label: 'Net Balance', val: `${settings.currency}${netBalance.toLocaleString()}`, color: netBalance >= 0 ? 'text-emerald-400' : 'text-red-400', icon: Wallet },
                { label: 'Goal Target', val: `${settings.currency}${totalGoalTarget.toLocaleString()}`, color: 'text-violet-400', icon: Target },
                { label: 'Goals Active', val: goals.length.toString(), color: 'text-indigo-400', icon: Sparkles }
              ].map(({ label, val, color, icon: Icon }) => (
                <div key={label} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800`}><Icon className={`h-4 w-4 ${color}`} /></div>
                  <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`font-extrabold text-lg leading-tight ${color}`}>{val}</p></div>
                </div>
              ))}
            </div>

            {/* Goals Cards */}
            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <Target className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-slate-400">No goals yet</p>
                  <p className="text-xs text-slate-600 mt-1">Create your first financial goal to start tracking.</p>
                </div>
              ) : (
                goals.map((goal, idx) => {
                  const pct = Math.min(100, Math.round(((goal.savedAmount || 0) / (goal.targetAmount || 1)) * 100));
                  const daysLeft = getDaysLeft(goal.targetDate);
                  const color = GOAL_COLORS[idx % GOAL_COLORS.length];
                  return (
                    <motion.div key={goal.id} layout whileHover={{ y: -2 }}
                      className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{goal.icon || '🎯'}</div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{goal.name}</h3>
                            {goal.description && <p className="text-[10px] text-slate-500">{goal.description}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${daysLeft > 60 ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' : daysLeft > 14 ? 'bg-amber-950/30 text-amber-400 border-amber-500/20' : 'bg-red-950/30 text-red-400 border-red-500/20'}`}>
                            {daysLeft}d left
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span>Saved: <strong className="text-white">{settings.currency}{(goal.savedAmount || 0).toLocaleString()}</strong></span>
                        <span><strong className="text-white">{pct}%</strong> of {settings.currency}{(goal.targetAmount || 0).toLocaleString()}</span>
                      </div>

                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden mb-4">
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }} />
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex gap-1 flex-wrap">
                          {(goal.contributions || []).slice(-3).map((c, ci) => (
                            <span key={ci} className="text-[9px] font-mono px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-full">
                              +{settings.currency}{c.amount}
                            </span>
                          ))}
                        </div>
                        <button onClick={() => setShowContribModal(goal)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-violet-400 bg-violet-950/30 border border-violet-500/20 rounded-xl hover:bg-violet-900/30 transition-all">
                          Add Savings <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {totalGoalTarget > 0 && (
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Overall Progress</h3>
                <div className="text-center mb-4">
                  <p className="text-3xl font-extrabold text-white">{Math.round((totalSaved / totalGoalTarget) * 100)}%</p>
                  <p className="text-[10px] text-slate-500 mt-1">of total goal target</p>
                </div>
                <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.round((totalSaved / totalGoalTarget) * 100))}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }} />
                </div>
              </div>
            )}

            {goals.length > 0 && (
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Quick Stats</h3>
                <div className="space-y-2 text-[10px]">
                  {[
                    { label: 'Monthly Income', val: `${settings.currency}${totalIncome.toLocaleString()}` },
                    { label: 'Monthly Expenses', val: `${settings.currency}${totalExpenses.toLocaleString()}` },
                    { label: 'Net Savings Potential', val: `${settings.currency}${netBalance.toLocaleString()}` },
                    { label: 'Goals', val: `${goals.filter(g => (g.savedAmount || 0) >= (g.targetAmount || 0)).length}/${goals.length} completed` },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-bold text-white">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Configure Budget Modal ─── */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowConfigModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">Configure Budget</h3>
              <p className="text-xs text-slate-400 mb-6">Set a monthly spending limit per category.</p>
              <form onSubmit={(e) => { e.preventDefault(); handleSetBudget(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Category</label>
                  <select value={configCategory} onChange={e => setConfigCategory(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                    <option value="">Select category...</option>
                    {['Food','Transport','Shopping','Bills','Health','Entertainment','Education','Groceries','Dining','Rent','Insurance','Utilities','Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Monthly Limit ({settings.currency})</label>
                  <input type="number" min="0" step="100" placeholder="e.g. 8000" value={configLimit} onChange={e => setConfigLimit(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" required />
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowConfigModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">Set Budget</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── AI Recommendations Modal ─── */}
      <AnimatePresence>
        {showRecommendations && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRecommendations(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-lg glass-panel rounded-2xl p-7 z-10 max-h-[80vh] overflow-y-auto">
              <button onClick={() => setShowRecommendations(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <div className="flex items-center gap-3 mb-1">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-extrabold text-white">AI Budget Recommendations</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">Based on your recent spending patterns.</p>

              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-xs text-slate-500">Analyzing your spending...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <motion.div key={rec.category} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="bg-slate-900/50 border border-slate-800 hover:border-violet-500/20 rounded-xl p-4 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">{rec.category}</h4>
                          <p className="text-[9px] text-slate-500 mt-0.5">{rec.rationale}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${rec.confidence === 'high' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' : rec.confidence === 'medium' ? 'bg-amber-950/30 text-amber-400 border border-amber-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                          {rec.confidence}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-3 text-[10px]">
                          <span className="text-slate-500">Avg: <strong className="text-slate-300">{settings.currency}{Math.round(rec.historical_avg).toLocaleString()}</strong></span>
                          <span className="text-violet-400">Suggested: <strong>{settings.currency}{Math.round(rec.suggested_limit).toLocaleString()}</strong></span>
                        </div>
                        <button onClick={() => applyRecommendation(rec)}
                          className="px-3 py-1.5 bg-violet-600 text-white text-[9px] font-bold rounded-lg hover:opacity-90 transition-all">
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Add Goal Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-lg glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowAddModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">Create New Goal</h3>
              <p className="text-xs text-slate-400 mb-6">Define a financial target to work toward.</p>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Goal Type</label>
                  <select value={newGoal.name} onChange={e => setNewGoal(g => ({ ...g, name: e.target.value, icon: GOAL_ICONS[e.target.value] || '🎯' }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                    {Object.keys(GOAL_ICONS).map(n => <option key={n} value={n}>{GOAL_ICONS[n]} {n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Target ({settings.currency})</label>
                    <input type="number" placeholder="100000" value={newGoal.targetAmount} onChange={e => setNewGoal(g => ({ ...g, targetAmount: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Target Date</label>
                    <input type="date" value={newGoal.targetDate} onChange={e => setNewGoal(g => ({ ...g, targetDate: e.target.value }))}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Description (optional)</label>
                  <input type="text" placeholder="Why this goal matters..." value={newGoal.description} onChange={e => setNewGoal(g => ({ ...g, description: e.target.value }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" />
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">Create Goal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Add Contribution Modal ─── */}
      <AnimatePresence>
        {showContribModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowContribModal(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-sm glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowContribModal(null)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <div className="text-3xl mb-2">{showContribModal.icon || '🎯'}</div>
              <h3 className="text-base font-extrabold text-white mb-1">Add Savings</h3>
              <p className="text-xs text-slate-400 mb-6">{showContribModal.name}</p>
              <form onSubmit={handleContrib} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Amount ({settings.currency})</label>
                  <input type="number" step="any" min="1" placeholder="e.g. 5000" value={contribAmount} onChange={e => setContribAmount(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" required autoFocus />
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowContribModal(null)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">Save +{settings.currency}{contribAmount || '0'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
