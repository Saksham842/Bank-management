import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import {
  CreditCard, Plus, X, TrendingDown, Calendar, DollarSign,
  AlertTriangle, ChevronRight, Activity, FileText, Gauge
} from 'lucide-react';
import {
  getDebts, createDebt, updateDebt, deleteDebt,
  getDebtSummary, getPayoffPlan
} from '../api/debt.api';

const DEBT_TYPES = ['Credit Card', 'Personal Loan', 'Home Loan', 'Car Loan', 'Education Loan', 'Medical Debt', 'Student Loan', 'Business Loan', 'Other'];
const TYPE_ICONS = {
  'Credit Card': '💳', 'Personal Loan': '🏦', 'Home Loan': '🏠', 'Car Loan': '🚗',
  'Education Loan': '🎓', 'Medical Debt': '🏥', 'Student Loan': '📚', 'Business Loan': '💼', 'Other': '📄'
};
const TYPE_COLORS = {
  'Credit Card': '#EF4444', 'Personal Loan': '#F59E0B', 'Home Loan': '#3B82F6',
  'Car Loan': '#10B981', 'Education Loan': '#8B5CF6', 'Medical Debt': '#EC4899',
  'Student Loan': '#06B6D4', 'Business Loan': '#7C3AED', 'Other': '#6B7280'
};

const TAB_KEYS = ['overview', 'debts', 'strategies', 'payoff'];
const TAB_LABELS = ['Overview', 'Debts', 'Strategies', 'Payoff Calendar'];
const TAB_ICONS = [Activity, CreditCard, TrendingDown, Calendar];
const CHART_COLORS = Object.values(TYPE_COLORS);

const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + 'L';
  return '₹' + val.toLocaleString('en-IN');
};

const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

export const DebtPlannerPage = () => {
  const { showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('overview');
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payoff, setPayoff] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    creditor: '', type: 'Credit Card', totalBalance: '', interestRate: '',
    minimumPayment: '', monthlyPayment: '', originalAmount: '',
    startDate: '', dueDay: '', notes: ''
  });

  const [extraPayment, setExtraPayment] = useState(0);
  const [strategy, setStrategy] = useState('avalanche');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        getDebts().catch(() => []),
        getDebtSummary().catch(() => null)
      ]);
      setDebts(d);
      setSummary(s);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadPayoff = useCallback(async () => {
    if (debts.length === 0) return;
    try {
      const p = await getPayoffPlan(extraPayment, strategy);
      setPayoff(p);
    } catch {}
  }, [extraPayment, strategy, debts.length]);

  useEffect(() => { loadPayoff(); }, [extraPayment, strategy, debts]);

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        totalBalance: parseFloat(form.totalBalance) || 0,
        interestRate: parseFloat(form.interestRate) || 0,
        minimumPayment: parseFloat(form.minimumPayment) || 0,
        monthlyPayment: parseFloat(form.monthlyPayment) || 0,
        originalAmount: parseFloat(form.originalAmount) || 0,
        dueDay: parseInt(form.dueDay) || undefined
      };
      if (!data.creditor || !data.type) {
        showToast('Creditor and type are required', 'error'); return;
      }
      if (editing) {
        await updateDebt(editing._id, data);
        showToast('Debt updated', 'success');
      } else {
        await createDebt(data);
        showToast('Debt added', 'success');
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Error saving debt', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this debt?')) return;
    try {
      await deleteDebt(id);
      showToast('Debt deleted', 'success');
      loadData();
    } catch { showToast('Error deleting', 'error'); }
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      creditor: d.creditor, type: d.type, totalBalance: d.totalBalance.toString(),
      interestRate: d.interestRate.toString(), minimumPayment: (d.minimumPayment || 0).toString(),
      monthlyPayment: (d.monthlyPayment || 0).toString(),
      originalAmount: (d.originalAmount || '').toString(),
      startDate: d.startDate ? format(new Date(d.startDate), 'yyyy-MM-dd') : '',
      dueDay: d.dueDay || '', notes: d.notes || ''
    });
    setShowModal(true);
  };

  const totalBalance = summary?.totalBalance || 0;
  const totalMinPayment = summary?.totalMinPayment || 0;

  const chartData = payoff?.timeline?.filter((_, i) => i % Math.max(1, Math.floor(payoff.timeline.length / 24)) === 0 || i === 0 || i === payoff.timeline.length - 1) || [];

  const snowballData = payoff?.comparison ? [
    { name: 'Months to Pay Off', avalanche: payoff.comparison.avalancheMonths, snowball: payoff.comparison.snowballMonths },
    { name: 'Total Interest', avalanche: payoff.comparison.avalancheInterest, snowball: payoff.comparison.snowballInterest }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingDown className="w-7 h-7 text-red-400" /> Debt Snowball & Avalanche Planner
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track debts, compare payoff strategies, become debt-free faster</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ creditor: '', type: 'Credit Card', totalBalance: '', interestRate: '', minimumPayment: '', monthlyPayment: '', originalAmount: '', startDate: '', dueDay: '', notes: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors mt-3 md:mt-0">
            <Plus size={18} /> Add Debt
          </button>
        </motion.div>

        <motion.div variants={item} className="flex flex-wrap gap-1 mb-6 p-1 bg-gray-800 rounded-xl w-fit">
          {TAB_KEYS.map((key, i) => {
            const Icon = TAB_ICONS[i];
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                <Icon size={16} /> {TAB_LABELS[i]}
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              {debts.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Debts Tracked</h3>
                  <p className="text-gray-400 mb-4">Add your credit cards, loans, and other debts to plan your payoff strategy.</p>
                  <button onClick={() => { setEditing(null); setForm({ creditor: '', type: 'Credit Card', totalBalance: '', interestRate: '', minimumPayment: '', monthlyPayment: '', originalAmount: '', startDate: '', dueDay: '', notes: '' }); setShowModal(true); }}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg">Add Your First Debt</button>
                </motion.div>
              )}

              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Total Debt</div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(totalBalance)}</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Monthly Minimum</div>
                    <div className="text-2xl font-bold text-amber-400">{formatCurrency(totalMinPayment)}</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Weighted Interest</div>
                    <div className="text-2xl font-bold text-purple-400">{summary.weightedInterestRate}%</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Highest Rate</div>
                    <div className="text-2xl font-bold text-red-400">{summary.highestInterest}%</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Active Debts</div>
                    <div className="text-2xl font-bold text-blue-400">{summary.totalDebts}</div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {summary?.byType && (
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Debt Breakdown by Type</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={Object.entries(summary.byType).map(([k, v]) => ({ name: k, value: v.balance }))}
                            cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {Object.keys(summary.byType).map((k, i) => (
                              <Cell key={k} fill={TYPE_COLORS[k] || CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {Object.entries(summary.byType).map(([type, data]) => (
                        <span key={type} className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#6B7280' }}></span>
                          {type} ({data.count}) — {formatCurrency(data.balance)}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {payoff?.comparison && (
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Strategy Comparison</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Months', Avalanche: payoff.comparison.avalancheMonths, Snowball: payoff.comparison.snowballMonths },
                          { name: 'Interest (₹L)', Avalanche: Math.round(payoff.comparison.avalancheInterest / 100000), Snowball: Math.round(payoff.comparison.snowballInterest / 100000) }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="name" stroke="#4B5563" />
                          <YAxis stroke="#4B5563" />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Avalanche" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Snowball" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-purple-900/30 border border-purple-800 rounded-lg p-3 text-center">
                        <div className="text-purple-300 text-xs">Avalanche</div>
                        <div className="text-lg font-bold text-purple-400">{payoff.comparison.avalancheMonths} months</div>
                        <div className="text-xs text-gray-400">{formatCurrency(payoff.comparison.avalancheInterest)} interest</div>
                      </div>
                      <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-3 text-center">
                        <div className="text-emerald-300 text-xs">Snowball</div>
                        <div className="text-lg font-bold text-emerald-400">{payoff.comparison.snowballMonths} months</div>
                        <div className="text-xs text-gray-400">{formatCurrency(payoff.comparison.snowballInterest)} interest</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'debts' && (
            <motion.div key="debts" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4">
              {debts.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Debts</h3>
                  <p className="text-gray-400">Tap "Add Debt" to get started.</p>
                </motion.div>
              )}
              {debts.map(d => (
                <motion.div key={d._id} variants={item}
                  className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">{TYPE_ICONS[d.type] || '📄'}</div>
                      <div>
                        <h3 className="font-semibold">{d.creditor}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{d.type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${d.isActive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>{d.isActive ? 'Active' : 'Closed'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-gray-700 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
                      <button onClick={() => handleDelete(d._id)} className="p-1.5 hover:bg-red-900/50 rounded"><X size={16} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Balance</span><div className="font-semibold text-red-400">{formatCurrency(d.totalBalance)}</div></div>
                    <div><span className="text-gray-400 text-xs">Interest Rate</span><div className="font-semibold text-amber-400">{d.interestRate}%</div></div>
                    <div><span className="text-gray-400 text-xs">Min Payment</span><div className="font-semibold">{formatCurrency(d.minimumPayment)}</div></div>
                    <div><span className="text-gray-400 text-xs">Monthly</span><div className="font-semibold">{formatCurrency(d.monthlyPayment || d.minimumPayment)}</div></div>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${d.originalAmount > 0 ? Math.min(100, (d.totalBalance / d.originalAmount) * 100) : 100}%`,
                      backgroundColor: d.interestRate > 24 ? '#EF4444' : d.interestRate > 12 ? '#F59E0B' : '#10B981'
                    }}></div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'strategies' && (
            <motion.div key="strategies" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Payoff Strategy Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Extra Monthly Payment (₹)</label>
                    <input type="number" value={extraPayment} onChange={e => setExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Strategy</label>
                    <div className="flex gap-2">
                      <button onClick={() => setStrategy('avalanche')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${strategy === 'avalanche' ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                        Avalanche
                      </button>
                      <button onClick={() => setStrategy('snowball')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${strategy === 'snowball' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                        Snowball
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full p-3 bg-gray-700/50 rounded-lg text-sm">
                      <span className="text-gray-400">{strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} method: </span>
                      {strategy === 'avalanche' ? 'Pay highest interest first — saves most money' : 'Pay smallest balance first — quick psychological wins'}
                    </div>
                  </div>
                </div>
              </motion.div>

              {payoff && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Time to Debt Free</div>
                    <div className="text-3xl font-bold text-emerald-400">{payoff.totalMonths} months</div>
                    <div className="text-xs text-gray-500">({Math.floor(payoff.totalMonths / 12)}y {payoff.totalMonths % 12}m)</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Total Interest Paid</div>
                    <div className="text-3xl font-bold text-red-400">{formatCurrency(payoff.totalInterest)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Total to Pay</div>
                    <div className="text-3xl font-bold text-amber-400">{formatCurrency(payoff.totalPayments)}</div>
                    <div className="text-xs text-gray-500">Principal: {formatCurrency(payoff.principalTotal)}</div>
                  </div>
                </motion.div>
              )}

              {payoff?.comparison && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Method Comparison</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`rounded-xl p-5 border ${strategy === 'avalanche' ? 'border-purple-700 bg-purple-900/20' : 'border-gray-700'}`}>
                      <div className="flex items-center gap-2 mb-3"><Gauge className="w-5 h-5 text-purple-400" /><span className="font-semibold text-purple-300">Avalanche</span></div>
                      <div className="flex justify-between py-1"><span className="text-gray-400">Months</span><span className="font-bold">{payoff.comparison.avalancheMonths}</span></div>
                      <div className="flex justify-between py-1"><span className="text-gray-400">Total Interest</span><span className="font-bold text-red-400">{formatCurrency(payoff.comparison.avalancheInterest)}</span></div>
                      <div className="flex justify-between py-1"><span className="text-gray-400">Savings vs Snowball</span><span className="font-bold text-emerald-400">{formatCurrency(Math.max(0, payoff.comparison.snowballInterest - payoff.comparison.avalancheInterest))}</span></div>
                    </div>
                    <div className={`rounded-xl p-5 border ${strategy === 'snowball' ? 'border-emerald-700 bg-emerald-900/20' : 'border-gray-700'}`}>
                      <div className="flex items-center gap-2 mb-3"><Gauge className="w-5 h-5 text-emerald-400" /><span className="font-semibold text-emerald-300">Snowball</span></div>
                      <div className="flex justify-between py-1"><span className="text-gray-400">Months</span><span className="font-bold">{payoff.comparison.snowballMonths}</span></div>
                      <div className="flex justify-between py-1"><span className="text-gray-400">Total Interest</span><span className="font-bold text-red-400">{formatCurrency(payoff.comparison.snowballInterest)}</span></div>
                      <div className="flex justify-between py-1"><span className="text-gray-400">Savings vs Avalanche</span><span className="font-bold text-emerald-400">{formatCurrency(Math.max(0, payoff.comparison.avalancheInterest - payoff.comparison.snowballInterest))}</span></div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-sm">
                    <strong>Recommendation:</strong> {payoff.comparison.avalancheMonths <= payoff.comparison.snowballMonths
                      ? 'Avalanche method saves you time AND money. Pay highest interest rate debts first.'
                      : 'Snowball method gets you debt-free faster in months. Pay smallest balances first for momentum.'}
                  </div>
                </motion.div>
              )}

              {payoff?.timeline?.length > 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Balance Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={payoff.timeline.filter((_, i) => i % 3 === 0).map(t => ({
                        month: t.month,
                        remaining: t.payments.reduce((s, p) => s + p.remaining, 0),
                        paid: t.totalPaid
                      }))}>
                        <defs>
                          <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#4B5563" label={{ value: 'Month', position: 'insideBottom', fill: '#9CA3AF' }} />
                        <YAxis tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Area type="monotone" dataKey="remaining" stroke="#EF4444" fill="url(#debtGrad)" strokeWidth={2} name="Remaining Balance" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'payoff' && (
            <motion.div key="payoff" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4">
              {payoff?.timeline?.length > 0 ? (
                <>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-red-400" /> Payoff Timeline</h3>
                    <div className="max-h-96 overflow-y-auto space-y-1">
                      {payoff.timeline.map(t => (
                        <div key={t.month} className="flex items-center gap-3 bg-gray-700/30 rounded px-3 py-1.5 text-sm">
                          <span className="text-gray-500 w-8 text-right font-mono">{t.month}</span>
                          <div className="flex-1 flex gap-3 overflow-x-auto">
                            {t.payments.filter(p => p.payment > 0).map(p => (
                              <span key={p.debtId} className="whitespace-nowrap text-xs">
                                <span className="text-gray-400">{p.creditor.substring(0, 8)}:</span>
                                <span className="text-amber-400">{formatCurrency(p.payment)}</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-green-400">{formatCurrency(p.remaining)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Payment Distribution</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={payoff.timeline.filter((_, i) => i % 6 === 0).map(t => ({
                          month: `M${t.month}`,
                          ...Object.fromEntries(t.payments.map(p => [p.creditor.substring(0, 10), p.payment]))
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="month" stroke="#4B5563" fontSize={10} />
                          <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'K'} stroke="#4B5563" />
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                          <Bar dataKey={payoff.timeline[0]?.payments[0]?.creditor?.substring(0, 10) || 'Debt'} fill="#EF4444" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </>
              ) : (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Payoff Data</h3>
                  <p className="text-gray-400">Add debts and visit the Strategies tab to generate a payoff plan.</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editing ? 'Edit Debt' : 'Add Debt'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Creditor</label>
                  <input value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. HDFC Credit Card" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {DEBT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Total Balance (₹)</label>
                  <input type="number" value={form.totalBalance} onChange={e => setForm(f => ({ ...f, totalBalance: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.1" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. 24" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Minimum Payment (₹)</label>
                  <input type="number" value={form.minimumPayment} onChange={e => setForm(f => ({ ...f, minimumPayment: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Actual Monthly (₹)</label>
                  <input type="number" value={form.monthlyPayment} onChange={e => setForm(f => ({ ...f, monthlyPayment: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Original Amount (₹)</label>
                  <input type="number" value={form.originalAmount} onChange={e => setForm(f => ({ ...f, originalAmount: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Due Day</label>
                  <input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. 15" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">
                  {editing ? 'Update' : 'Add Debt'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
