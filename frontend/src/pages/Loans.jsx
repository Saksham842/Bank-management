import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInMonths } from 'date-fns';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  Plus, X, RefreshCw, TrendingUp, TrendingDown, DollarSign,
  Calendar, AlertTriangle, Home, Car, GraduationCap, Briefcase,
  Building, Banknote, Sparkles, ChevronRight
} from 'lucide-react';
import {
  getLoans, getLoanSummary, createLoan, updateLoan, deleteLoan,
  getAmortization, payEmi, simulatePrepayment
} from '../api/loans.api';

const LOAN_ICONS = { home: Home, car: Car, personal: Banknote, education: GraduationCap, business: Briefcase, other: Building };
const LOAN_COLORS = { home: '#7C3AED', car: '#0EA5E9', personal: '#10B981', education: '#F59E0B', business: '#EC4899', other: '#64748B' };
const LOAN_LABELS = { home: 'Home', car: 'Car', personal: 'Personal', education: 'Education', business: 'Business', other: 'Other' };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const LoansPage = () => {
  const { settings, showToast } = useContext(AppContext);

  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState({ activeCount: 0, totalPrincipal: 0, totalEmi: 0, totalRemaining: 0, totalPaid: 0, totalInterest: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAmortModal, setShowAmortModal] = useState(null);
  const [showPrepayModal, setShowPrepayModal] = useState(null);
  const [amortData, setAmortData] = useState(null);
  const [prepayResult, setPrepayResult] = useState(null);
  const [prepayAmount, setPrepayAmount] = useState('');

  const [newLoan, setNewLoan] = useState({
    name: '', type: 'personal', lender: 'Bank', principal: '',
    annualRate: '', tenureMonths: '', startDate: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        getLoans(statusFilter),
        getLoanSummary().catch(() => ({ activeCount: 0, totalPrincipal: 0, totalEmi: 0, totalRemaining: 0, totalPaid: 0, totalInterest: 0 }))
      ]);
      setLoans(l);
      setSummary(s);
    } catch { showToast('error', 'Could not load loans'); }
    setLoading(false);
  }, [statusFilter, showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newLoan.name || !newLoan.principal || !newLoan.annualRate || !newLoan.tenureMonths) {
      showToast('error', 'All fields required'); return;
    }
    try {
      await createLoan({
        ...newLoan,
        principal: parseFloat(newLoan.principal),
        annualRate: parseFloat(newLoan.annualRate),
        tenureMonths: parseInt(newLoan.tenureMonths)
      });
      setShowAddModal(false);
      setNewLoan({ name: '', type: 'personal', lender: 'Bank', principal: '', annualRate: '', tenureMonths: '', startDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      await loadAll();
      showToast('success', 'Loan added');
    } catch { showToast('error', 'Failed to create loan'); }
  };

  const handlePayEmi = async (loan) => {
    try {
      await payEmi(loan._id);
      await loadAll();
      showToast('success', `EMI recorded for ${loan.name}`);
    } catch { showToast('error', 'Failed to record EMI'); }
  };

  const handleDelete = async (id, name) => {
    try {
      await deleteLoan(id);
      await loadAll();
      showToast('warning', `Deleted ${name}`);
    } catch { showToast('error', 'Failed to delete'); }
  };

  const loadAmortization = async (loan) => {
    setShowAmortModal(loan);
    try {
      const data = await getAmortization(loan._id);
      setAmortData(data);
    } catch { showToast('error', 'Could not load schedule'); }
  };

  const handlePrepaySim = async (loan) => {
    if (!prepayAmount || parseFloat(prepayAmount) <= 0) {
      showToast('error', 'Enter a valid prepayment amount'); return;
    }
    try {
      const result = await simulatePrepayment(loan._id, parseFloat(prepayAmount));
      setPrepayResult(result);
    } catch { showToast('error', 'Simulation failed'); }
  };

  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const totalEmiMonth = loans.reduce((s, l) => s + (l.emi || 0), 0);
  const totalRemainingBal = loans.reduce((s, l) => s + (l.remainingBalance || 0), 0);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 w-full pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Loan Tracker</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/30 transition-all">
            <Plus className="h-3 w-3" /> Add Loan
          </button>
          <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white transition-all">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Loans', val: summary.activeCount.toString(), color: 'text-violet-400', icon: Banknote },
          { label: 'Total Principal', val: `${settings.currency}${summary.totalPrincipal.toLocaleString()}`, color: 'text-blue-400', icon: DollarSign },
          { label: 'Monthly EMI', val: `${settings.currency}${summary.totalEmi.toLocaleString()}`, color: 'text-amber-400', icon: TrendingDown },
          { label: 'Remaining', val: `${settings.currency}${summary.totalRemaining.toLocaleString()}`, color: 'text-emerald-400', icon: Calendar },
        ].map(({ label, val, color, icon: Icon }) => (
          <motion.div key={label} variants={item} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><Icon className={`h-4 w-4 ${color}`} /></div>
            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`font-extrabold text-lg leading-tight ${color}`}>{val}</p></div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'active', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[9px] text-slate-500">{summary.totalInterest.toLocaleString()} total interest payable</span>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading loans...</p>
            </div>
          ) : loans.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <Banknote className="h-10 w-10 text-slate-700 mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-400">No loans tracked</p>
              <p className="text-xs text-slate-600 mt-1">Add your home, car, or personal loan to track EMI payments and amortization.</p>
            </div>
          ) : (
            loans.map(loan => {
              const Icon = LOAN_ICONS[loan.type] || Building;
              const color = LOAN_COLORS[loan.type] || '#64748B';
              return (
                <motion.div key={loan._id} layout variants={item}
                  className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-violet-500/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0" style={{ color }}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{loan.name}</h4>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${loan.status === 'active' ? 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20' : 'text-slate-500 bg-slate-900 border-slate-800'}`}>
                            {loan.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500">
                          <span>{LOAN_LABELS[loan.type]}</span>
                          <span>·</span>
                          <span>{loan.lender}</span>
                          <span>·</span>
                          <span>{loan.annualRate}% p.a.</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-base font-extrabold text-white">{settings.currency}{(loan.emi || 0).toLocaleString()}<span className="text-[9px] text-slate-500 font-normal">/mo</span></p>
                      <p className="text-[9px] text-slate-500">of {settings.currency}{loan.principal.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-white font-bold">{loan.paidEmis} / {loan.tenureMonths} EMIs ({loan.progress}%)</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${loan.progress}%` }}
                        style={{ backgroundColor: color }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900 text-[9px]">
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Remaining: <strong className="text-white">{settings.currency}{(loan.remainingBalance || 0).toLocaleString()}</strong></span>
                      <span>{loan.remainingMonths} months left</span>
                      <span>Interest: <strong className="text-amber-400">{settings.currency}{loan.totalInterest.toLocaleString()}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      {loan.status === 'active' && (
                        <button onClick={() => handlePayEmi(loan)}
                          className="px-2 py-1 bg-emerald-600 text-white text-[8px] font-bold rounded-lg hover:opacity-90 transition-all">
                          Pay EMI
                        </button>
                      )}
                      <button onClick={() => loadAmortization(loan)}
                        className="px-2 py-1 bg-violet-600/80 text-white text-[8px] font-bold rounded-lg hover:opacity-90 transition-all">
                        Schedule
                      </button>
                      <button onClick={() => { setShowPrepayModal(loan); setPrepayAmount(''); setPrepayResult(null); }}
                        className="px-2 py-1 bg-amber-600/80 text-white text-[8px] font-bold rounded-lg hover:opacity-90 transition-all">
                        Prepay
                      </button>
                      <button onClick={() => handleDelete(loan._id, loan.name)}
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

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Loan Summary</h3>
            <div className="space-y-2 text-[10px]">
              {[
                { label: 'Active Loans', val: summary.activeCount.toString() },
                { label: 'Total Principal', val: `${settings.currency}${summary.totalPrincipal.toLocaleString()}` },
                { label: 'Monthly EMI Burden', val: `${settings.currency}${summary.totalEmi.toLocaleString()}` },
                { label: 'Total Paid', val: `${settings.currency}${summary.totalPaid.toLocaleString()}` },
                { label: 'Remaining Balance', val: `${settings.currency}${summary.totalRemaining.toLocaleString()}` },
                { label: 'Total Interest Payable', val: `${settings.currency}${summary.totalInterest.toLocaleString()}` },
                { label: 'Total Payment', val: `${settings.currency}${summary.totalPayment.toLocaleString()}` },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-bold text-white">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loan type pie */}
          {loans.length > 0 && (
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">By Type</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={loans.map(l => ({ name: LOAN_LABELS[l.type] || l.type, value: l.remainingBalance || l.principal, type: l.type }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2}>
                      {loans.map((l, i) => <Cell key={i} fill={LOAN_COLORS[l.type] || '#64748B'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {[...new Set(loans.map(l => l.type))].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-[9px]">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: LOAN_COLORS[t] || '#64748B' }} />
                    <span className="text-slate-400">{LOAN_LABELS[t]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add Loan Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowAddModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">Add Loan</h3>
              <p className="text-xs text-slate-400 mb-6">Track a new loan or financing.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Loan Name</label>
                    <input type="text" placeholder="Home Loan" value={newLoan.name} onChange={e => setNewLoan(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Type</label>
                    <select value={newLoan.type} onChange={e => setNewLoan(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      {Object.entries(LOAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Principal ({settings.currency})</label>
                    <input type="number" min="0" placeholder="5000000" value={newLoan.principal} onChange={e => setNewLoan(f => ({ ...f, principal: e.target.value }))} required
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Annual Rate (%)</label>
                    <input type="number" min="0" step="0.1" placeholder="8.5" value={newLoan.annualRate} onChange={e => setNewLoan(f => ({ ...f, annualRate: e.target.value }))} required
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Tenure (months)</label>
                    <input type="number" min="1" placeholder="240" value={newLoan.tenureMonths} onChange={e => setNewLoan(f => ({ ...f, tenureMonths: e.target.value }))} required
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Lender</label>
                    <input type="text" placeholder="SBI" value={newLoan.lender} onChange={e => setNewLoan(f => ({ ...f, lender: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Start Date</label>
                  <input type="date" value={newLoan.startDate} onChange={e => setNewLoan(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" required />
                </div>
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90">Add Loan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Amortization Schedule Modal ─── */}
      <AnimatePresence>
        {showAmortModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAmortModal(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-2xl glass-panel rounded-2xl p-7 z-10 max-h-[80vh] overflow-y-auto">
              <button onClick={() => setShowAmortModal(null)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">{showAmortModal.name} — Amortization</h3>
              <p className="text-xs text-slate-400 mb-4">EMI: {settings.currency}{(amortData?.summary?.emi || 0).toLocaleString()} | Total Interest: {settings.currency}{(amortData?.summary?.totalInterest || 0).toLocaleString()}</p>

              {amortData && (
                <>
                  {/* Chart */}
                  <div className="h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={amortData.schedule.filter((_, i) => i % Math.max(1, Math.floor(amortData.schedule.length / 24)) === 0 || i === amortData.schedule.length - 1)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} tickFormatter={v => `${settings.currency}${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="balance" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="interest" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
                        <Area type="monotone" dataKey="principal" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Table */}
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    <div className="flex text-[8px] text-slate-500 font-bold uppercase px-3 py-1.5 bg-slate-900 rounded-lg sticky top-0">
                      <span className="w-10">Mo.</span>
                      <span className="w-14">Date</span>
                      <span className="w-20 text-right">EMI</span>
                      <span className="w-20 text-right">Principal</span>
                      <span className="w-20 text-right">Interest</span>
                      <span className="w-24 text-right">Balance</span>
                    </div>
                    {amortData.schedule.slice(0, 120).map(row => (
                      <div key={row.month} className={`flex text-[9px] px-3 py-1.5 rounded-lg ${row.paid ? 'bg-emerald-950/10 text-slate-400' : 'text-slate-300'}`}>
                        <span className="w-10">{row.month}</span>
                        <span className="w-14">{row.date}</span>
                        <span className="w-20 text-right">{settings.currency}{row.emi}</span>
                        <span className="w-20 text-right text-emerald-400">{settings.currency}{row.principal}</span>
                        <span className="w-20 text-right text-red-400">{settings.currency}{row.interest}</span>
                        <span className="w-24 text-right font-bold">{settings.currency}{row.balance}</span>
                      </div>
                    ))}
                    {amortData.schedule.length > 120 && (
                      <p className="text-[8px] text-slate-600 text-center py-2">Showing first 120 of {amortData.schedule.length} months</p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Prepayment Simulator Modal ─── */}
      <AnimatePresence>
        {showPrepayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPrepayModal(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowPrepayModal(null)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-extrabold text-white mb-1">Prepayment Simulator</h3>
              <p className="text-xs text-slate-400 mb-6">{showPrepayModal.name}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Prepayment Amount ({settings.currency})</label>
                  <input type="number" min="0" placeholder="100000" value={prepayAmount} onChange={e => setPrepayAmount(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                </div>
                <button onClick={() => handlePrepaySim(showPrepayModal)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">
                  Simulate Prepayment
                </button>

                {prepayResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Remaining Balance</span>
                      <span className="font-bold text-white">{settings.currency}{prepayResult.originalRemaining.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prepayment</span>
                      <span className="font-bold text-red-400">-{settings.currency}{prepayResult.prepayAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-500">New Balance</span>
                      <span className="font-bold text-emerald-400">{settings.currency}{prepayResult.newBalance.toLocaleString()}</span>
                    </div>
                    {prepayResult.loanCleared ? (
                      <div className="text-center py-2">
                        <span className="text-emerald-400 font-bold text-xs">Loan Cleared! 🎉</span>
                        <p className="text-slate-500 mt-1">Interest saved: {settings.currency}{prepayResult.interestSaved.toLocaleString()}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Months Saved</span>
                          <span className="font-bold text-amber-400">{prepayResult.monthsSaved} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">New Tenure</span>
                          <span className="font-bold text-white">{prepayResult.newRemainingMonths} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Interest Saved</span>
                          <span className="font-bold text-emerald-400">{settings.currency}{prepayResult.interestSaved.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
