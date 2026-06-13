import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  markBillingPaid, detectRecurring, getUpcomingPayments, getRecurringStats
} from '../api/subscriptions.api';
import {
  RefreshCw, Plus, X, Bell, BellOff, Trash2, Check, AlertTriangle,
  CreditCard, Calendar, TrendingUp, Repeat, Search, Filter,
  ArrowUpRight, ChevronRight, Sparkles
} from 'lucide-react';

const CYCLE_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', 'semi-annual': 'Semi-Annual', annual: 'Annual' };
const CYCLE_COLORS = { weekly: '#8B5CF6', monthly: '#3B82F6', quarterly: '#10B981', 'semi-annual': '#F59E0B', annual: '#EC4899' };

const STATUS_COLORS = { active: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20', paused: 'text-amber-400 bg-amber-950/30 border-amber-500/20', cancelled: 'text-red-400 bg-red-950/30 border-red-500/20', expired: 'text-slate-500 bg-slate-900 border-slate-800' };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const SubscriptionsPage = () => {
  const { settings, showToast } = useContext(AppContext);

  const [subscriptions, setSubscriptions] = useState([]);
  const [upcoming, setUpcoming] = useState({ upcoming: [], totalDue: 0, count: 0 });
  const [stats, setStats] = useState({ totalActive: 0, monthlyTotal: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetectModal, setShowDetectModal] = useState(false);
  const [detected, setDetected] = useState([]);
  const [detecting, setDetecting] = useState(false);

  const [newSub, setNewSub] = useState({
    name: '', category: 'Entertainment', amount: '', billingCycle: 'monthly',
    nextBillingDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), paymentMethod: 'auto-debit', reminderDays: 3
  });
  const [editingId, setEditingId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, up, st] = await Promise.all([
        getSubscriptions(statusFilter),
        getUpcomingPayments().catch(() => ({ upcoming: [], totalDue: 0, count: 0 })),
        getRecurringStats().catch(() => ({ totalActive: 0, monthlyTotal: 0, byCategory: {} }))
      ]);
      setSubscriptions(subs);
      setUpcoming(up);
      setStats(st);
    } catch { showToast('error', 'Could not load subscriptions'); }
    setLoading(false);
  }, [statusFilter, showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newSub.name || !newSub.amount || parseFloat(newSub.amount) <= 0) {
      showToast('error', 'Enter a valid name and amount'); return;
    }
    try {
      await createSubscription({ ...newSub, amount: parseFloat(newSub.amount) });
      setShowAddModal(false);
      setNewSub({ name: '', category: 'Entertainment', amount: '', billingCycle: 'monthly', nextBillingDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), paymentMethod: 'auto-debit', reminderDays: 3 });
      await loadAll();
      showToast('success', 'Subscription created');
    } catch { showToast('error', 'Failed to create subscription'); }
  };

  const handleDetect = async () => {
    setDetecting(true);
    setShowDetectModal(true);
    try {
      const recs = await detectRecurring();
      setDetected(recs);
    } catch {
      // Fallback: detect from local transactions
      const local = JSON.parse(localStorage.getItem('ledger_transactions') || '[]');
      const groups = {};
      const ninetyAgo = new Date(Date.now() - 90 * 86400000);
      local.filter(t => t.type === 'expense').forEach(t => {
        const key = (t.merchant || t.category || '').toLowerCase().trim().slice(0, 30);
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      const localRecs = [];
      for (const [key, group] of Object.entries(groups)) {
        if (group.length < 2) continue;
        const dates = group.map(t => new Date(t.date));
        dates.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < dates.length; i++) intervals.push((dates[i] - dates[i - 1]) / 86400000);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const std = Math.sqrt(intervals.map(i => (i - avg) ** 2).reduce((a, b) => a + b, 0) / intervals.length);
        if (std / (avg || 1) < 0.3 && avg <= 35) {
          const avgAmt = group.reduce((s, t) => s + t.amount, 0) / group.length;
          const last = dates[dates.length - 1];
          const next = new Date(last); next.setMonth(next.getMonth() + 1);
          localRecs.push({ merchant: group[0].merchant || key, category: group[0].category, avg_amount: Math.round(avgAmt), confidence: Math.round((1 - std / avg) * 100) / 100, occurrences: group.length, suggested_cycle: 'monthly', next_billing: format(next, 'yyyy-MM-dd') });
        }
      }
      setDetected(localRecs.sort((a, b) => b.confidence - a.confidence));
    }
    setDetecting(false);
  };

  const applyDetected = async (rec) => {
    try {
      await createSubscription({
        name: rec.merchant, category: rec.category, amount: rec.avg_amount,
        billingCycle: rec.suggested_cycle || 'monthly',
        nextBillingDate: rec.next_billing || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        paymentMethod: 'auto-debit', reminderDays: 3, autoDetected: true, confidence: rec.confidence
      });
      setDetected(prev => prev.filter(d => d !== rec));
      showToast('success', `Added ${rec.merchant}`);
    } catch { showToast('error', 'Failed to add subscription'); }
  };

  const toggleStatus = async (sub) => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    try {
      await updateSubscription(sub._id, { status: newStatus });
      await loadAll();
      showToast('info', `${sub.name} ${newStatus === 'active' ? 'resumed' : 'paused'}`);
    } catch { showToast('error', 'Failed to update status'); }
  };

  const handleDelete = async (id, name) => {
    try {
      await deleteSubscription(id);
      await loadAll();
      showToast('warning', `Deleted ${name}`);
    } catch { showToast('error', 'Failed to delete'); }
  };

  const handleMarkPaid = async (sub) => {
    try {
      await markBillingPaid(sub._id);
      await loadAll();
      showToast('success', `Marked ${sub.name} as paid`);
    } catch { showToast('error', 'Failed to mark paid'); }
  };

  const daysUntil = (date) => differenceInDays(parseISO(date), new Date());

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 w-full pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Subscriptions & Recurring</h2>
        <div className="flex gap-2">
          <button onClick={handleDetect}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-violet-400 bg-violet-950/30 border border-violet-500/20 rounded-xl hover:bg-violet-900/30 transition-all">
            <Sparkles className="h-3 w-3" /> Auto-Detect
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/30 transition-all">
            <Plus className="h-3 w-3" /> Add
          </button>
          <button onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white transition-all">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Subs', val: stats.totalActive.toString(), color: 'text-violet-400', icon: Repeat },
          { label: 'Monthly Spend', val: `${settings.currency}${stats.monthlyTotal.toLocaleString()}`, color: 'text-blue-400', icon: TrendingUp },
          { label: 'Due This Month', val: upcoming.count.toString(), color: upcoming.count > 0 ? 'text-amber-400' : 'text-emerald-400', icon: Calendar },
          { label: 'Total Due', val: `${settings.currency}${upcoming.totalDue.toLocaleString()}`, color: upcoming.totalDue > 0 ? 'text-red-400' : 'text-emerald-400', icon: CreditCard }
        ].map(({ label, val, color, icon: Icon }) => (
          <motion.div key={label} variants={item} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><Icon className={`h-4 w-4 ${color}`} /></div>
            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`font-extrabold text-lg leading-tight ${color}`}>{val}</p></div>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Payments Bar */}
      {upcoming.upcoming.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Upcoming Payments (30 days)</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcoming.upcoming.map(sub => {
              const days = daysUntil(sub.nextBillingDate);
              return (
                <div key={sub._id} className="flex-shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-[10px] min-w-[140px]">
                  <p className="font-bold text-white truncate">{sub.name}</p>
                  <p className="text-slate-400 mt-0.5">{settings.currency}{sub.amount} — {days <= 0 ? 'Due today!' : `${days}d left`}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-slate-500" />
        {['all', 'active', 'paused', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Subscription List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading subscriptions...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <Repeat className="h-10 w-10 text-slate-700 mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-400">No subscriptions found</p>
              <p className="text-xs text-slate-600 mt-1">Click Auto-Detect to find recurring transactions, or add one manually.</p>
            </div>
          ) : (
            subscriptions.map(sub => {
              const days = daysUntil(sub.nextBillingDate);
              return (
                <motion.div key={sub._id} layout variants={item}
                  className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-violet-500/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">{sub.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[sub.status] || STATUS_COLORS.active}`}>{sub.status}</span>
                          <span className="text-[9px] text-slate-500">{CYCLE_LABELS[sub.billingCycle] || sub.billingCycle}</span>
                          {sub.autoDetected && <span className="text-[9px] text-violet-400 bg-violet-950/30 px-1.5 py-0.5 rounded-full border border-violet-500/20">ML Detected ({Math.round(sub.confidence * 100)}%)</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-base font-extrabold text-white">{settings.currency}{sub.amount.toLocaleString()}</p>
                      <p className={`text-[9px] font-semibold mt-0.5 ${days <= 0 ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {days <= 0 ? 'Due!' : `${days}d until billing`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-900">
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>Next: {format(parseISO(sub.nextBillingDate), 'dd MMM yyyy')}</span>
                      {sub.lastBillingDate && <><span className="text-slate-800">|</span><span>Last: {format(parseISO(sub.lastBillingDate), 'dd MMM')}</span></>}
                      {sub.totalPaid > 0 && <><span className="text-slate-800">|</span><span>Paid: {settings.currency}{sub.totalPaid.toLocaleString()}</span></>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleMarkPaid(sub)} disabled={days > 1}
                        className="p-1.5 text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Mark as paid">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleStatus(sub)}
                        className="p-1.5 text-amber-400 hover:bg-amber-950/30 rounded-lg transition-all" title={sub.status === 'active' ? 'Pause' : 'Resume'}>
                        {sub.status === 'active' ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                      </button>
                      {editingId === sub._id ? (
                        <div className="flex gap-1">
                          <input type="number" defaultValue={sub.amount}
                            className="w-20 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-violet-500"
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                try {
                                  await updateSubscription(sub._id, { amount: parseFloat(e.target.value) });
                                  await loadAll(); setEditingId(null);
                                  showToast('success', 'Updated amount');
                                } catch { showToast('error', 'Failed to update'); }
                              }
                            }} />
                          <button onClick={() => setEditingId(null)} className="p-1 text-slate-500 hover:text-white"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingId(sub._id)} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(sub._id, sub.name)}
                        className="p-1.5 text-red-400 hover:bg-red-950/30 rounded-lg transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {sub.billingHistory && sub.billingHistory.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {sub.billingHistory.slice(-5).map((h, i) => (
                        <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-full">
                          {settings.currency}{h.amount} {h.date ? format(parseISO(h.date), 'dd/MM') : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Panel: Category Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {Object.keys(stats.byCategory).length > 0 && (
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Spend by Category</h3>
              <div className="space-y-2.5">
                {Object.entries(stats.byCategory).sort(([, a], [, b]) => b.monthly - a.monthly).map(([cat, data]) => {
                  const pct = stats.monthlyTotal > 0 ? (data.monthly / stats.monthlyTotal * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">{cat}</span>
                        <span className="text-slate-300 font-bold">{settings.currency}{Math.round(data.monthly).toLocaleString()} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[8px] text-slate-600 mt-0.5">{data.count} subscription{data.count > 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {upcoming.upcoming.length > 0 && (
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-amber-400" /> Payment Schedule
              </h3>
              <div className="space-y-2">
                {upcoming.upcoming.map(sub => {
                  const days = daysUntil(sub.nextBillingDate);
                  return (
                    <div key={sub._id} className="flex justify-between items-center text-[10px] bg-slate-900/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-bold text-white">{sub.name}</p>
                        <p className="text-slate-500">{format(parseISO(sub.nextBillingDate), 'dd MMM')} ({days <= 0 ? 'Today' : `${days}d`})</p>
                      </div>
                      <span className="font-bold text-slate-300">{settings.currency}{sub.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Quick Summary</h3>
            <div className="space-y-2 text-[10px]">
              {[
                { label: 'Active Subscriptions', val: stats.totalActive.toString() },
                { label: 'Monthly Recurring', val: `${settings.currency}${stats.monthlyTotal.toLocaleString()}` },
                { label: 'Avg. per Subscription', val: stats.totalActive > 0 ? `${settings.currency}${Math.round(stats.monthlyTotal / stats.totalActive).toLocaleString()}` : '—' },
                { label: 'Annual Projection', val: `${settings.currency}${(stats.monthlyTotal * 12).toLocaleString()}` },
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

      {/* ─── Add Subscription Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowAddModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">Add Subscription</h3>
              <p className="text-xs text-slate-400 mb-6">Track a recurring payment or subscription.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Name</label>
                  <input type="text" placeholder="Netflix, Spotify, etc." value={newSub.name} onChange={e => setNewSub(s => ({ ...s, name: e.target.value }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Amount ({settings.currency})</label>
                    <input type="number" min="0" step="0.01" placeholder="649" value={newSub.amount} onChange={e => setNewSub(s => ({ ...s, amount: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Billing Cycle</label>
                    <select value={newSub.billingCycle} onChange={e => setNewSub(s => ({ ...s, billingCycle: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Next Billing</label>
                    <input type="date" value={newSub.nextBillingDate} onChange={e => setNewSub(s => ({ ...s, nextBillingDate: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Category</label>
                    <select value={newSub.category} onChange={e => setNewSub(s => ({ ...s, category: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      {['Entertainment','Bills','Shopping','Food','Health','Education','Transport','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Reminder (days before)</label>
                    <input type="number" min="0" max="30" value={newSub.reminderDays} onChange={e => setNewSub(s => ({ ...s, reminderDays: parseInt(e.target.value) || 3 }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Payment Method</label>
                    <select value={newSub.paymentMethod} onChange={e => setNewSub(s => ({ ...s, paymentMethod: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      <option value="auto-debit">Auto-Debit</option><option value="card">Card</option><option value="upi">UPI</option><option value="netbanking">Net Banking</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Auto-Detect Modal ─── */}
      <AnimatePresence>
        {showDetectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDetectModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-lg glass-panel rounded-2xl p-7 z-10 max-h-[80vh] overflow-y-auto">
              <button onClick={() => setShowDetectModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <div className="flex items-center gap-3 mb-1">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <h3 className="text-lg font-extrabold text-white">Recurring Detection</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">ML-powered analysis of your last 90 days of transactions.</p>

              {detecting ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-xs text-slate-500">Analyzing patterns...</p>
                </div>
              ) : detected.length === 0 ? (
                <div className="text-center py-8">
                  <Repeat className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No recurring patterns found</p>
                  <p className="text-xs text-slate-600 mt-1">Add more transactions over time for better detection.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500">Found <strong className="text-white">{detected.length}</strong> potential recurring pattern{detected.length > 1 ? 's' : ''}</p>
                  {detected.map((rec, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="bg-slate-900/50 border border-slate-800 hover:border-violet-500/20 rounded-xl p-4 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">{rec.merchant || rec.name}</h4>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-500">{rec.category}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${rec.confidence > 0.8 ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' : 'bg-amber-950/30 text-amber-400 border-amber-500/20'}`}>
                              {Math.round(rec.confidence * 100)}% match
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-extrabold text-white">{settings.currency}{rec.avg_amount.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-500 mb-3">
                        <span>{rec.occurrences} occurrences</span>
                        <span>{CYCLE_LABELS[rec.suggested_cycle] || rec.suggested_cycle}</span>
                        <span>Next: {rec.next_billing}</span>
                      </div>
                      <button onClick={() => applyDetected(rec)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-[9px] font-bold rounded-lg hover:opacity-90 transition-all">
                        <Plus className="h-3 w-3" /> Add as Subscription
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
