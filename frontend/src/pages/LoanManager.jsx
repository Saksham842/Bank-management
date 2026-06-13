import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import {
  Landmark, Plus, X, ChevronRight, TrendingUp, Calculator,
  FileText, BarChart3, PiggyBank
} from 'lucide-react';
import {
  getLoans, createLoan, updateLoan, deleteLoan,
  calculateEMI, generateSchedule, getLoanSummary, compareLoans
} from '../api/loan.api';

const TAB_KEYS = ['dashboard', 'loans', 'calculator', 'amortization'];
const TAB_LABELS = ['Dashboard', 'My Loans', 'EMI Calculator', 'Amortization'];
const TAB_ICONS = [BarChart3, Landmark, Calculator, FileText];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + 'L';
  return '₹' + Number(val).toLocaleString('en-IN');
};

const LOAN_COLORS = { Home: '#7C3AED', Car: '#0EA5E9', Personal: '#F59E0B', Education: '#10B981', Business: '#EC4899', 'Credit Card': '#EF4444', Other: '#6B7280' };
const COLORS = ['#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#EC4899', '#EF4444', '#6B7280'];
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const LoanManagerPage = () => {
  const { showToast } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [emiResult, setEmiResult] = useState(null);
  const [scheduleResult, setScheduleResult] = useState(null);

  const [loanForm, setLoanForm] = useState({
    name: '', type: 'Personal', principal: '', interestRate: '', tenureMonths: '',
    startDate: '', emiAmount: '', prepaymentAmount: '0', prepaymentFrequency: 'none',
    lender: '', notes: ''
  });

  const [emiForm, setEmiForm] = useState({ principal: 1000000, interestRate: 9, tenureMonths: 60 });
  const [schedForm, setSchedForm] = useState({ principal: 1000000, interestRate: 9, tenureMonths: 60, prepaymentAmount: 0, prepaymentStartMonth: 1 });

  const loadLoans = useCallback(async () => {
    try { const d = await getLoans(); setLoans(d); } catch { showToast('Failed to load loans', 'error'); }
  }, [showToast]);

  const loadSummary = useCallback(async () => {
    try { const d = await getLoanSummary(); setSummary(d); } catch { }
  }, []);

  useEffect(() => { loadLoans(); loadSummary(); }, [loadLoans, loadSummary]);

  const handleSaveLoan = async () => {
    try {
      const data = { ...loanForm, principal: parseFloat(loanForm.principal), interestRate: parseFloat(loanForm.interestRate), tenureMonths: parseFloat(loanForm.tenureMonths), emiAmount: parseFloat(loanForm.emiAmount), prepaymentAmount: parseFloat(loanForm.prepaymentAmount) };
      if (editingLoan) { await updateLoan(editingLoan._id, data); showToast('Loan updated', 'success'); }
      else { await createLoan(data); showToast('Loan created', 'success'); }
      setShowLoanModal(false); setEditingLoan(null); loadLoans(); loadSummary();
    } catch (e) { showToast(e?.response?.data?.message || 'Error', 'error'); }
  };

  const handleDeleteLoan = async (id) => {
    if (!window.confirm('Delete this loan?')) return;
    try { await deleteLoan(id); loadLoans(); loadSummary(); showToast('Loan deleted', 'success'); } catch { showToast('Error', 'error'); }
  };

  const runEMI = async () => {
    try { const r = await calculateEMI(emiForm); setEmiResult(r); } catch { showToast('Calculation failed', 'error'); }
  };

  const runSchedule = async () => {
    try { const r = await generateSchedule(schedForm); setScheduleResult(r); } catch { showToast('Schedule generation failed', 'error'); }
  };

  const openEditLoan = (loan) => {
    setEditingLoan(loan);
    setLoanForm({
      name: loan.name, type: loan.type, principal: loan.principal.toString(),
      interestRate: loan.interestRate.toString(), tenureMonths: loan.tenureMonths.toString(),
      startDate: new Date(loan.startDate).toISOString().split('T')[0],
      emiAmount: loan.emiAmount.toString(),
      prepaymentAmount: (loan.prepaymentAmount || 0).toString(),
      prepaymentFrequency: loan.prepaymentFrequency || 'none',
      lender: loan.lender || '', notes: loan.notes || ''
    });
    setShowLoanModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
        <motion.div variants={item} className="flex items-center gap-3 mb-6">
          <Landmark className="w-7 h-7 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold">Loan & EMI Manager</h1>
            <p className="text-gray-400 text-sm">Track loans, calculate EMIs, and plan prepayments</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="flex flex-wrap gap-1 mb-6 p-1 bg-gray-800 rounded-xl w-fit">
          {TAB_KEYS.map((key, i) => {
            const Icon = TAB_ICONS[i];
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                <Icon size={16} /> {TAB_LABELS[i]}
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-gray-400 text-xs mb-1">Active Loans</div>
                  <div className="text-2xl font-bold text-blue-400">{summary?.activeLoans || 0}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-gray-400 text-xs mb-1">Total Principal</div>
                  <div className="text-lg font-bold text-amber-400">{formatCurrency(summary?.totalPrincipal)}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-gray-400 text-xs mb-1">Monthly EMI</div>
                  <div className="text-lg font-bold text-emerald-400">{formatCurrency(summary?.totalEmi)}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-gray-400 text-xs mb-1">Avg. Rate</div>
                  <div className="text-2xl font-bold text-purple-400">{summary?.avgRate || 0}%</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-gray-400 text-xs mb-1">Total Loans</div>
                  <div className="text-2xl font-bold text-pink-400">{summary?.totalLoans || 0}</div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {summary?.typeBreakdown && (
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="font-semibold mb-4">Loans by Type</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={Object.entries(summary.typeBreakdown).map(([k, v]) => ({ name: k, value: v.totalPrincipal }))}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {Object.keys(summary.typeBreakdown).map((k, i) => <Cell key={k} fill={LOAN_COLORS[k] || COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="font-semibold mb-4">Loan Repayment Timeline</h3>
                  {summary?.monthsUntilPaid?.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {summary.monthsUntilPaid.map((l, i) => {
                        const years = Math.floor(l.months / 12);
                        const months = l.months % 12;
                        return (
                          <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                            <div>
                              <div className="text-sm font-medium">{l.name}</div>
                              <div className="text-xs text-gray-400">{formatCurrency(l.principal)} @ {years}y {months}m</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-emerald-400">{formatCurrency(l.emi)}/mo</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No active loans</p>
                  )}
                </motion.div>
              </div>

              {summary?.typeBreakdown && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="font-semibold mb-4">Principal by Type</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={Object.entries(summary.typeBreakdown).map(([k, v]) => ({ name: k, principal: v.totalPrincipal, emi: v.totalEmi }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis tickFormatter={v => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v)} stroke="#9CA3AF" />
                      <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                      <Bar dataKey="principal" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Principal" />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'loans' && (
            <motion.div key="loans" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">My Loans</h3>
                <button onClick={() => { setEditingLoan(null); setLoanForm({ name: '', type: 'Personal', principal: '', interestRate: '', tenureMonths: '', startDate: '', emiAmount: '', prepaymentAmount: '0', prepaymentFrequency: 'none', lender: '', notes: '' }); setShowLoanModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"><Plus size={16} /> Add Loan</button>
              </motion.div>

              {loans.length === 0 ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Landmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Loans Yet</h3>
                  <p className="text-gray-400">Add your loans to track EMIs and repayment progress.</p>
                </motion.div>
              ) : (
                loans.map((loan, i) => {
                  const r = loan.interestRate / 100 / 12;
                  let bal = loan.principal, paidMonths = 0;
                  const elapsedMonths = Math.floor((new Date() - new Date(loan.startDate)) / (30.44 * 24 * 60 * 60 * 1000));
                  const progress = Math.min(100, Math.round((elapsedMonths / loan.tenureMonths) * 100));
                  return (
                    <motion.div key={loan._id} variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: (LOAN_COLORS[loan.type] || '#6B7280') + '33' }}>
                            <Landmark size={18} style={{ color: LOAN_COLORS[loan.type] || '#6B7280' }} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{loan.name}</h3>
                            <div className="text-xs text-gray-400">{loan.type} · {loan.lender || 'N/A'} · {loan.status}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditLoan(loan)} className="p-1.5 hover:bg-gray-700 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
                          <button onClick={() => handleDeleteLoan(loan._id)} className="p-1.5 hover:bg-red-900/50 rounded"><X size={16} className="text-red-400" /></button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div><span className="text-gray-400 text-xs">Principal</span><div className="font-semibold">{formatCurrency(loan.principal)}</div></div>
                        <div><span className="text-gray-400 text-xs">Rate</span><div className="font-semibold">{loan.interestRate}%</div></div>
                        <div><span className="text-gray-400 text-xs">Tenure</span><div className="font-semibold">{loan.tenureMonths}m</div></div>
                        <div><span className="text-gray-400 text-xs">EMI</span><div className="font-semibold">{formatCurrency(loan.emiAmount)}/mo</div></div>
                        <div><span className="text-gray-400 text-xs">Status</span><div className={`font-semibold ${loan.status === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>{loan.status}</div></div>
                      </div>
                      <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-600" style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-gray-500">
                        <span>{elapsedMonths}m elapsed</span>
                        <span>{loan.tenureMonths - Math.min(elapsedMonths, loan.tenureMonths)}m remaining</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'calculator' && (
            <motion.div key="calculator" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">EMI Calculator</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Loan Amount (₹)</label>
                    <input type="number" value={emiForm.principal} onChange={e => setEmiForm(p => ({ ...p, principal: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Interest Rate (%)</label>
                    <input type="number" step="0.1" value={emiForm.interestRate} onChange={e => setEmiForm(p => ({ ...p, interestRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Tenure (Months)</label>
                    <input type="number" value={emiForm.tenureMonths} onChange={e => setEmiForm(p => ({ ...p, tenureMonths: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button onClick={runEMI} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Calculate EMI</button>
              </motion.div>

              {emiResult && (
                <>
                  <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Monthly EMI</div>
                      <div className="text-2xl font-bold text-blue-400">{formatCurrency(emiResult.emi)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Total Interest</div>
                      <div className="text-2xl font-bold text-amber-400">{formatCurrency(emiResult.totalInterest)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Total Payment</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatCurrency(emiResult.totalPayment)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Interest Ratio</div>
                      <div className="text-2xl font-bold text-purple-400">{emiForm.principal > 0 ? ((emiResult.totalInterest / emiForm.principal) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </motion.div>

                  {emiResult?.schedule?.length > 0 && (
                    <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h4 className="font-semibold mb-4">Payment Breakdown by Year</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={emiResult.schedule}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="year" stroke="#9CA3AF" label={{ value: 'Year', fill: '#9CA3AF', position: 'insideBottom', offset: -5 }} />
                          <YAxis tickFormatter={v => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v)} stroke="#9CA3AF" />
                          <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                          <Bar dataKey="interest" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" name="Interest" />
                          <Bar dataKey="principal" fill="#7C3AED" radius={[4, 4, 0, 0]} stackId="a" name="Principal" />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}

                  {emiResult?.schedule?.length > 0 && (
                    <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h4 className="font-semibold mb-4">Balance Over Time</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={emiResult.schedule}>
                          <defs><linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="year" stroke="#9CA3AF" />
                          <YAxis tickFormatter={v => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v)} stroke="#9CA3AF" />
                          <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                          <Area type="monotone" dataKey="balance" stroke="#7C3AED" fill="url(#balGrad)" strokeWidth={2} name="Balance" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'amortization' && (
            <motion.div key="amortization" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Amortization Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Loan Amount (₹)</label>
                    <input type="number" value={schedForm.principal} onChange={e => setSchedForm(p => ({ ...p, principal: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Rate (%)</label>
                    <input type="number" step="0.1" value={schedForm.interestRate} onChange={e => setSchedForm(p => ({ ...p, interestRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Tenure (Months)</label>
                    <input type="number" value={schedForm.tenureMonths} onChange={e => setSchedForm(p => ({ ...p, tenureMonths: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Monthly Prepayment (₹)</label>
                    <input type="number" value={schedForm.prepaymentAmount} onChange={e => setSchedForm(p => ({ ...p, prepaymentAmount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button onClick={runSchedule} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Generate Schedule</button>
              </motion.div>

              {scheduleResult && (
                <>
                  <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Savings with Prepayment</div>
                      <div className="text-xl font-bold text-emerald-400">{formatCurrency(scheduleResult.savings)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Months Saved</div>
                      <div className="text-xl font-bold text-blue-400">{scheduleResult.monthsSaved} months</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Original vs Reduced Tenure</div>
                      <div className="text-xl font-bold text-purple-400">{scheduleResult.withoutPrepayment?.totalMonths || '-'} → {scheduleResult.withPrepayment?.totalMonths || '-'} months</div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h4 className="font-semibold mb-4">Interest Comparison: With vs Without Prepayment</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { name: 'Without Prepayment', interest: scheduleResult.withoutPrepayment?.totalInterest || 0 },
                        { name: 'With Prepayment', interest: scheduleResult.withPrepayment?.totalInterest || 0 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" />
                        <YAxis tickFormatter={v => formatCurrency(v)} stroke="#9CA3AF" />
                        <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                        <Bar dataKey="interest" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Total Interest" />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {scheduleResult.withPrepayment?.schedule?.length > 0 && (
                    <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h4 className="font-semibold mb-4">Monthly Amortization Schedule</h4>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-700">
                              <th className="text-left p-2">Month</th>
                              <th className="text-right p-2">EMI</th>
                              <th className="text-right p-2">Principal</th>
                              <th className="text-right p-2">Interest</th>
                              <th className="text-right p-2">Prepayment</th>
                              <th className="text-right p-2">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scheduleResult.withPrepayment.schedule.map((row, i) => (
                              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                <td className="p-2 text-gray-400">{row.month}</td>
                                <td className="p-2 text-right">{formatCurrency(row.emi)}</td>
                                <td className="p-2 text-right text-blue-400">{formatCurrency(row.principalPaid)}</td>
                                <td className="p-2 text-right text-amber-400">{formatCurrency(row.interest)}</td>
                                <td className="p-2 text-right text-purple-400">{row.prepayment > 0 ? formatCurrency(row.prepayment) : '-'}</td>
                                <td className="p-2 text-right text-emerald-400">{formatCurrency(row.balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showLoanModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowLoanModal(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingLoan ? 'Edit Loan' : 'Add Loan'}</h3>
                <button onClick={() => setShowLoanModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={loanForm.name} onChange={e => setLoanForm(f => ({ ...f, name: e.target.value }))}
                  className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Loan Name" />
                <select value={loanForm.type} onChange={e => setLoanForm(f => ({ ...f, type: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                  <option value="Home">Home</option><option value="Car">Car</option><option value="Personal">Personal</option>
                  <option value="Education">Education</option><option value="Business">Business</option><option value="Credit Card">Credit Card</option><option value="Other">Other</option>
                </select>
                <input value={loanForm.lender} onChange={e => setLoanForm(f => ({ ...f, lender: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Lender" />
                <input type="number" value={loanForm.principal} onChange={e => setLoanForm(f => ({ ...f, principal: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Principal" />
                <input type="number" step="0.1" value={loanForm.interestRate} onChange={e => setLoanForm(f => ({ ...f, interestRate: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Interest Rate %" />
                <input type="number" value={loanForm.tenureMonths} onChange={e => setLoanForm(f => ({ ...f, tenureMonths: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Tenure (Months)" />
                <input type="date" value={loanForm.startDate} onChange={e => setLoanForm(f => ({ ...f, startDate: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" value={loanForm.emiAmount} onChange={e => setLoanForm(f => ({ ...f, emiAmount: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="EMI Amount" />
                <input type="number" value={loanForm.prepaymentAmount} onChange={e => setLoanForm(f => ({ ...f, prepaymentAmount: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Prepayment Amount" />
                <select value={loanForm.prepaymentFrequency} onChange={e => setLoanForm(f => ({ ...f, prepaymentFrequency: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                  <option value="none">No Prepayment</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                </select>
                <textarea value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))}
                  className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} placeholder="Notes" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowLoanModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSaveLoan} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">{editingLoan ? 'Update' : 'Add Loan'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
