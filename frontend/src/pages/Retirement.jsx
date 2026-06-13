import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Line, ComposedChart,
  CartesianGrid
} from 'recharts';
import {
  Target, Plus, X, TrendingUp, TrendingDown, Calendar, Clock,
  AlertTriangle, Shield, PiggyBank, Briefcase, Banknote,
  RefreshCw, BarChart3, ChevronRight, Gauge, Activity,
  DollarSign, Percent
} from 'lucide-react';
import {
  getPlans, createPlan, deletePlan, updatePlan,
  getProjection, getReadiness, getMonteCarlo, getOptimize,
  getPensionAccounts, createPensionAccount, updatePensionAccount, deletePensionAccount
} from '../api/retirement.api';

const RISK_PROFILES = [
  { value: 'conservative', label: 'Conservative', returnRate: 7, color: '#10B981' },
  { value: 'moderate', label: 'Moderate', returnRate: 10, color: '#F59E0B' },
  { value: 'aggressive', label: 'Aggressive', returnRate: 14, color: '#EF4444' }
];

const ACCOUNT_TYPES = ['EPF', 'PPF', 'NPS', 'Superannuation', '401k', 'IRA', 'Pension', 'Annuity', 'Other'];
const ACCOUNT_ICONS = { EPF: '🏛️', PPF: '📒', NPS: '📊', Superannuation: '💼', '401k': '🇺🇸', IRA: '📈', Pension: '🏦', Annuity: '🔄', Other: '💰' };
const ACCOUNT_COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6', '#6B7280'];

const TAB_KEYS = ['overview', 'plans', 'accounts', 'simulator'];
const TAB_LABELS = ['Overview', 'Plans', 'Accounts', 'Simulator'];
const TAB_ICONS = [Activity, Target, PiggyBank, BarChart3];

const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

const CHART_COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6'];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  return '₹' + val.toLocaleString('en-IN');
};

const GaugeChart = ({ value, label, max = 100, color }) => {
  const angle = (value / max) * 180;
  const radians = (angle * Math.PI) / 180;
  const x = 50 - 40 * Math.cos(radians);
  const y = 50 - 40 * Math.sin(radians);
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="80" viewBox="0 0 100 60">
        <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
        <path d={`M10 55 A40 40 0 0 1 ${x} ${y}`} fill="none" stroke={color || '#7C3AED'} strokeWidth="8" strokeLinecap="round" />
        <circle cx={x} cy={y} r="4" fill={color || '#7C3AED'} />
        <text x="50" y="50" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{value}{max === 100 ? '%' : ''}</text>
      </svg>
      {label && <span className="text-gray-400 text-xs mt-1">{label}</span>}
    </div>
  );
};

export const RetirementPage = () => {
  const { user, showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('overview');
  const [plans, setPlans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projection, setProjection] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [monteCarlo, setMonteCarlo] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '', targetCorpus: '', currentAge: 30, retirementAge: 60,
    lifeExpectancy: 85, currentSavings: 0, monthlyContribution: 0,
    riskProfile: 'moderate', expectedReturnRate: 10, inflationRate: 6,
    drawdownRate: 4, notes: ''
  });
  const [accountForm, setAccountForm] = useState({
    accountType: 'EPF', accountNumber: '', provider: '', balance: 0,
    interestRate: 7.0, monthlyContribution: 0, employerContribution: 0,
    startDate: '', maturityDate: '', notes: ''
  });

  const [simParams, setSimParams] = useState({ monthlyContrib: 0, returnRate: 10, inflation: 6, drawdown: 4, retireAge: 60 });
  const [simData, setSimData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        getPlans().catch(() => []),
        getPensionAccounts().catch(() => [])
      ]);
      setPlans(p);
      setAccounts(a);
      if (p.length > 0 && !selectedPlanId) setSelectedPlanId(p[0]._id);
    } catch { }
    setLoading(false);
  }, [selectedPlanId]);

  const loadPlanDetails = useCallback(async (planId) => {
    if (!planId) return;
    try {
      const [proj, ready, mc] = await Promise.all([
        getProjection(planId).catch(() => null),
        getReadiness(planId).catch(() => null),
        getMonteCarlo(planId).catch(() => null)
      ]);
      setProjection(proj);
      setReadiness(ready);
      setMonteCarlo(mc);
    } catch {
      setProjection(null); setReadiness(null); setMonteCarlo(null);
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedPlanId) loadPlanDetails(selectedPlanId); }, [selectedPlanId, plans]);

  const handleCreatePlan = async () => {
    try {
      const data = {
        ...planForm,
        targetCorpus: parseFloat(planForm.targetCorpus) || 0,
        currentSavings: parseFloat(planForm.currentSavings) || 0,
        monthlyContribution: parseFloat(planForm.monthlyContribution) || 0,
        expectedReturnRate: parseFloat(planForm.expectedReturnRate) || 10,
        inflationRate: parseFloat(planForm.inflationRate) || 6,
        drawdownRate: parseFloat(planForm.drawdownRate) || 4
      };
      if (editingPlan) {
        await updatePlan(editingPlan._id, data);
        showToast('Plan updated', 'success');
      } else {
        await createPlan(data);
        showToast('Plan created', 'success');
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Error saving plan', 'error');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Delete this retirement plan?')) return;
    try {
      await deletePlan(id);
      showToast('Plan deleted', 'success');
      if (selectedPlanId === id) setSelectedPlanId(null);
      loadData();
    } catch (e) {
      showToast('Error deleting plan', 'error');
    }
  };

  const handleCreateAccount = async () => {
    try {
      const data = {
        ...accountForm,
        balance: parseFloat(accountForm.balance) || 0,
        interestRate: parseFloat(accountForm.interestRate) || 7,
        monthlyContribution: parseFloat(accountForm.monthlyContribution) || 0,
        employerContribution: parseFloat(accountForm.employerContribution) || 0
      };
      if (editingAccount) {
        await updatePensionAccount(editingAccount._id, data);
        showToast('Account updated', 'success');
      } else {
        await createPensionAccount(data);
        showToast('Account created', 'success');
      }
      setShowAccountModal(false);
      setEditingAccount(null);
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Error saving account', 'error');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Delete this pension account?')) return;
    try {
      await deletePensionAccount(id);
      showToast('Account deleted', 'success');
      loadData();
    } catch { showToast('Error deleting account', 'error'); }
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name, targetCorpus: plan.targetCorpus.toString(),
      currentAge: plan.currentAge, retirementAge: plan.retirementAge,
      lifeExpectancy: plan.lifeExpectancy, currentSavings: plan.currentSavings,
      monthlyContribution: plan.monthlyContribution,
      riskProfile: plan.riskProfile, expectedReturnRate: plan.expectedReturnRate,
      inflationRate: plan.inflationRate, drawdownRate: plan.drawdownRate,
      notes: plan.notes || ''
    });
    setShowPlanModal(true);
  };

  const openEditAccount = (acc) => {
    setEditingAccount(acc);
    setAccountForm({
      accountType: acc.accountType, accountNumber: acc.accountNumber || '',
      provider: acc.provider || '', balance: acc.balance,
      interestRate: acc.interestRate, monthlyContribution: acc.monthlyContribution,
      employerContribution: acc.employerContribution,
      startDate: acc.startDate ? format(new Date(acc.startDate), 'yyyy-MM-dd') : '',
      maturityDate: acc.maturityDate ? format(new Date(acc.maturityDate), 'yyyy-MM-dd') : '',
      notes: acc.notes || ''
    });
    setShowAccountModal(true);
  };

  const runSimulator = () => {
    const monthsToRetirement = (simParams.retireAge - (plans.find(p => p._id === selectedPlanId)?.currentAge || 30)) * 12;
    const monthlyRate = simParams.returnRate / 100 / 12;
    let corpus = plans.find(p => p._id === selectedPlanId)?.currentSavings || 0;
    const accumData = [];
    for (let m = 0; m <= monthsToRetirement; m++) {
      if (m % 12 === 0) {
        accumData.push({
          age: (plans.find(p => p._id === selectedPlanId)?.currentAge || 30) + Math.floor(m / 12),
          corpus: Math.round(corpus)
        });
      }
      corpus = corpus * (1 + monthlyRate) + simParams.monthlyContrib;
    }
    setSimData(accumData);
  };

  const selectedPlan = plans.find(p => p._id === selectedPlanId);
  const totalPension = accounts.reduce((s, a) => s + a.balance, 0);
  const totalMonthlyPensionContrib = accounts.reduce((s, a) => s + a.monthlyContribution + a.employerContribution, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">

        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PiggyBank className="w-7 h-7 text-purple-400" /> Retirement Planning & Pension Manager
            </h1>
            <p className="text-gray-400 text-sm mt-1">Plan, track, and optimize your retirement corpus</p>
          </div>
          <div className="flex items-center gap-2 mt-3 md:mt-0">
            {activeTab === 'plans' && (
              <button onClick={() => { setEditingPlan(null); setPlanForm({ name: '', targetCorpus: '', currentAge: 30, retirementAge: 60, lifeExpectancy: 85, currentSavings: 0, monthlyContribution: 0, riskProfile: 'moderate', expectedReturnRate: 10, inflationRate: 6, drawdownRate: 4, notes: '' }); setShowPlanModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                <Plus size={18} /> New Plan
              </button>
            )}
            {activeTab === 'accounts' && (
              <button onClick={() => { setEditingAccount(null); setAccountForm({ accountType: 'EPF', accountNumber: '', provider: '', balance: 0, interestRate: 7.0, monthlyContribution: 0, employerContribution: 0, startDate: '', maturityDate: '', notes: '' }); setShowAccountModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                <Plus size={18} /> Add Account
              </button>
            )}
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
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              {plans.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <PiggyBank className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Retirement Plans Yet</h3>
                  <p className="text-gray-400 mb-4">Create a retirement plan to see projections, readiness score, and Monte Carlo simulations.</p>
                  <button onClick={() => { setActiveTab('plans'); }}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Create Your First Plan</button>
                </motion.div>
              )}

              {plans.length > 0 && (
                <>
                  <motion.div variants={item} className="flex flex-wrap gap-2 mb-4">
                    {plans.map(plan => (
                      <button key={plan._id} onClick={() => setSelectedPlanId(plan._id)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-all ${selectedPlanId === plan._id ? 'bg-purple-600 border-purple-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
                        {plan.name}
                      </button>
                    ))}
                  </motion.div>

                  {selectedPlan && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <motion.div variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Target size={16} /> Target Corpus</div>
                        <div className="text-2xl font-bold">{formatCurrency(selectedPlan.targetCorpus)}</div>
                        <div className="text-xs text-gray-500 mt-1">By age {selectedPlan.retirementAge}</div>
                      </motion.div>
                      <motion.div variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2"><TrendingUp size={16} /> Projected Corpus</div>
                        <div className="text-2xl font-bold text-emerald-400">{formatCurrency(projection?.corpusAtRetirement || 0)}</div>
                        <div className="text-xs text-gray-500 mt-1">{projection?.yearsToRetirement || 0} years to retirement</div>
                      </motion.div>
                      <motion.div variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2"><DollarSign size={16} /> Monthly Income</div>
                        <div className="text-2xl font-bold text-amber-400">{formatCurrency(projection?.monthlyIncomeAtRetirement || 0)}</div>
                        <div className="text-xs text-gray-500 mt-1">At retirement (drawdown)</div>
                      </motion.div>
                      <motion.div variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Shield size={16} /> Monthly Contribution</div>
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(selectedPlan.monthlyContribution)}</div>
                        <div className="text-xs text-gray-500 mt-1">Current monthly savings</div>
                      </motion.div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {readiness && (
                      <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Gauge className="w-5 h-5 text-purple-400" /> Readiness Assessment</h3>
                        <div className="flex items-center justify-around">
                          <GaugeChart value={readiness.readinessScore} label="Readiness Score" color={readiness.readinessScore >= 75 ? '#10B981' : readiness.readinessScore >= 50 ? '#F59E0B' : '#EF4444'} />
                          <div className="space-y-3">
                            <div><span className="text-gray-400 text-sm">Status:</span> <span className={`font-semibold capitalize ${readiness.status === 'on_track' ? 'text-emerald-400' : readiness.status === 'close' ? 'text-amber-400' : 'text-red-400'}`}>{readiness.status.replace('_', ' ')}</span></div>
                            <div><span className="text-gray-400 text-sm">Projected:</span> <span className="font-semibold">{formatCurrency(readiness.projectedCorpus)}</span></div>
                            <div><span className="text-gray-400 text-sm">Gap:</span> <span className="font-semibold text-red-400">{formatCurrency(readiness.gap)}</span></div>
                            <div><span className="text-gray-400 text-sm">Recommended Monthly:</span> <span className="font-semibold text-amber-400">{formatCurrency(readiness.recommendedMonthly)}</span></div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {monteCarlo && (
                      <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-400" /> Monte Carlo Simulation</h3>
                        <div className="flex items-center justify-around mb-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-emerald-400">{monteCarlo.successRate}%</div>
                            <div className="text-gray-400 text-sm">Success Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">{formatCurrency(monteCarlo.median)}</div>
                            <div className="text-gray-400 text-sm">Median Corpus</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-center text-xs">
                          <div className="bg-gray-700 rounded p-2"><div className="text-red-400 font-bold">{formatCurrency(monteCarlo.percentiles.p5)}</div>P5</div>
                          <div className="bg-gray-700 rounded p-2"><div className="text-amber-400 font-bold">{formatCurrency(monteCarlo.percentiles.p25)}</div>P25</div>
                          <div className="bg-gray-700 rounded p-2"><div className="text-blue-400 font-bold">{formatCurrency(monteCarlo.percentiles.p50)}</div>P50</div>
                          <div className="bg-gray-700 rounded p-2"><div className="text-emerald-400 font-bold">{formatCurrency(monteCarlo.percentiles.p75)}</div>P75</div>
                          <div className="bg-gray-700 rounded p-2"><div className="text-purple-400 font-bold">{formatCurrency(monteCarlo.percentiles.p95)}</div>P95</div>
                        </div>
                        {monteCarlo.histogram && (
                          <div className="mt-4 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={monteCarlo.histogram}>
                                <XAxis dataKey="corpus" tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" fontSize={10} />
                                <YAxis hide />
                                <Tooltip formatter={(v, n, p) => [v + ' simulations', 'Count']} labelFormatter={v => formatCurrency(v)} />
                                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                  {monteCarlo.histogram.map((entry, i) => (
                                    <Cell key={i} fill={entry.hitTarget ? '#10B981' : '#6B7280'} opacity={0.7} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">{monteCarlo.simulations} simulations, volatility {monteCarlo.volatility}%</div>
                      </motion.div>
                    )}
                  </div>

                  {projection && (
                    <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> Retirement Projection</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[...(projection.accumulation || []), ...(projection.drawdown || [])]}>
                            <defs>
                              <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }} stroke="#4B5563" />
                            <YAxis tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" />
                            <Tooltip formatter={(v) => [formatCurrency(v), 'Corpus']} labelFormatter={l => `Age ${l}`} />
                            <Area type="monotone" dataKey={projection.drawdown?.length ? 'corpus' : 'corpus'} stroke="#7C3AED" fill="url(#corpusGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500"></span> Corpus Growth</span>
                        {projection.drawdown?.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Drawdown Phase</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm justify-center">
                        <span>Target: <strong>{formatCurrency(projection.targetCorpus)}</strong></span>
                        <span>Inflation Adj.: <strong className="text-amber-400">{formatCurrency(projection.inflationAdjustedTarget)}</strong></span>
                        <span>Gap: <strong className="text-red-400">{formatCurrency(projection.gap)}</strong></span>
                        <span>Monthly Income: <strong className="text-emerald-400">{formatCurrency(projection.monthlyIncomeAtRetirement)}</strong></span>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'plans' && (
            <motion.div key="plans" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4">
              {plans.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Retirement Plans</h3>
                  <p className="text-gray-400 mb-4">Create your first retirement plan to start tracking your goals.</p>
                  <button onClick={() => { setEditingPlan(null); setPlanForm({ name: '', targetCorpus: '', currentAge: 30, retirementAge: 60, lifeExpectancy: 85, currentSavings: 0, monthlyContribution: 0, riskProfile: 'moderate', expectedReturnRate: 10, inflationRate: 6, drawdownRate: 4, notes: '' }); setShowPlanModal(true); }}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><Plus size={18} className="inline mr-1" /> Create Plan</button>
                </motion.div>
              )}
              {plans.map(plan => {
                const progress = plan.targetCorpus > 0 ? Math.min(100, (plan.currentSavings / plan.targetCorpus) * 100) : 0;
                const riskProfile = RISK_PROFILES.find(r => r.value === plan.riskProfile);
                return (
                  <motion.div key={plan._id} variants={item}
                    className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-lg"><PiggyBank /></div>
                        <div>
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>Age {plan.currentAge} → {plan.retirementAge}</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: riskProfile?.color }}></span>{plan.riskProfile}</span>
                            <span>{plan.expectedReturnRate}% return</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditPlan(plan)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><ChevronRight size={16} className="text-gray-400" /></button>
                        <button onClick={() => handleDeletePlan(plan._id)} className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"><X size={16} className="text-red-400" /></button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><div className="text-gray-400 text-xs">Target Corpus</div><div className="font-semibold">{formatCurrency(plan.targetCorpus)}</div></div>
                      <div><div className="text-gray-400 text-xs">Current Savings</div><div className="font-semibold">{formatCurrency(plan.currentSavings)}</div></div>
                      <div><div className="text-gray-400 text-xs">Monthly</div><div className="font-semibold">{formatCurrency(plan.monthlyContribution)}</div></div>
                      <div><div className="text-gray-400 text-xs">Life Expectancy</div><div className="font-semibold">{plan.lifeExpectancy}y</div></div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span><span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'accounts' && (
            <motion.div key="accounts" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {accounts.length > 0 && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm">Total Pension Balance</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPension)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm">Monthly Contributions</div>
                    <div className="text-2xl font-bold text-blue-400">{formatCurrency(totalMonthlyPensionContrib)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm">Active Accounts</div>
                    <div className="text-2xl font-bold text-purple-400">{accounts.length}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm">Avg Interest Rate</div>
                    <div className="text-2xl font-bold text-amber-400">{accounts.length > 0 ? (accounts.reduce((s, a) => s + a.interestRate, 0) / accounts.length).toFixed(1) : 0}%</div>
                  </div>
                </motion.div>
              )}

              {accounts.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Banknote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Pension Accounts</h3>
                  <p className="text-gray-400 mb-4">Add your EPF, PPF, NPS, or other retirement accounts.</p>
                  <button onClick={() => { setEditingAccount(null); setAccountForm({ accountType: 'EPF', accountNumber: '', provider: '', balance: 0, interestRate: 7.0, monthlyContribution: 0, employerContribution: 0, startDate: '', maturityDate: '', notes: '' }); setShowAccountModal(true); }}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"><Plus size={18} className="inline mr-1" /> Add Account</button>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map(acc => {
                  const totalMonthly = acc.monthlyContribution + acc.employerContribution;
                  const projectedYearly = acc.balance * Math.pow(1 + acc.interestRate / 100 / 12, 12) + totalMonthly * 12;
                  return (
                    <motion.div key={acc._id} variants={item}
                      className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">{ACCOUNT_ICONS[acc.accountType] || '💰'}</div>
                          <div>
                            <h3 className="font-semibold">{acc.accountType}</h3>
                            <div className="text-xs text-gray-400">{acc.provider || 'Self-managed'}{acc.accountNumber ? ` (${acc.accountNumber})` : ''}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditAccount(acc)} className="p-1.5 hover:bg-gray-700 rounded"><ChevronRight size={14} className="text-gray-400" /></button>
                          <button onClick={() => handleDeleteAccount(acc._id)} className="p-1.5 hover:bg-red-900/50 rounded"><X size={14} className="text-red-400" /></button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-400 text-xs">Balance</span><div className="font-semibold text-emerald-400">{formatCurrency(acc.balance)}</div></div>
                        <div><span className="text-gray-400 text-xs">Interest Rate</span><div className="font-semibold">{acc.interestRate}%</div></div>
                        <div><span className="text-gray-400 text-xs">Your Contrib</span><div className="font-semibold">{formatCurrency(acc.monthlyContribution)}/mo</div></div>
                        <div><span className="text-gray-400 text-xs">Employer</span><div className="font-semibold">{formatCurrency(acc.employerContribution)}/mo</div></div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Projected annual growth: <span className="text-emerald-400">+{formatCurrency(Math.round(projectedYearly - acc.balance))}</span></div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'simulator' && (
            <motion.div key="simulator" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-400" /> What-If Simulator</h3>
                <p className="text-gray-400 text-sm mb-4">Adjust parameters to see how changes affect your retirement corpus</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Monthly Contribution (₹)</label>
                    <input type="number" value={simParams.monthlyContrib}
                      onChange={e => setSimParams(p => ({ ...p, monthlyContrib: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Expected Return (%)</label>
                    <input type="number" step="0.5" value={simParams.returnRate}
                      onChange={e => setSimParams(p => ({ ...p, returnRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Inflation Rate (%)</label>
                    <input type="number" step="0.5" value={simParams.inflation}
                      onChange={e => setSimParams(p => ({ ...p, inflation: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Withdrawal Rate (%)</label>
                    <input type="number" step="0.5" value={simParams.drawdown}
                      onChange={e => setSimParams(p => ({ ...p, drawdown: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Retirement Age</label>
                    <input type="number" value={simParams.retireAge}
                      onChange={e => setSimParams(p => ({ ...p, retireAge: parseInt(e.target.value) || 60 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={runSimulator}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-2">
                      <BarChart3 size={18} /> Run Simulation
                    </button>
                  </div>
                </div>
              </motion.div>

              {simData && simData.length > 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Corpus Growth Projection</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simData}>
                        <defs>
                          <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="age" stroke="#4B5563" label={{ value: 'Age', position: 'insideBottom', fill: '#9CA3AF' }} />
                        <YAxis tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" />
                        <Tooltip formatter={(v) => [formatCurrency(v), 'Corpus']} labelFormatter={l => `Age ${l}`} />
                        <Area type="monotone" dataKey="corpus" stroke="#7C3AED" fill="url(#simGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-center text-sm text-gray-400">
                    Corpus at retirement: <strong className="text-emerald-400">{formatCurrency(simData[simData.length - 1]?.corpus || 0)}</strong>
                  </div>
                </motion.div>
              )}

              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-purple-400" /> Optimization Recommendations</h3>
                {optimization ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-gray-400 text-xs">Total Balance</div>
                        <div className="text-xl font-bold text-emerald-400">{formatCurrency(optimization.totalBalance)}</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-gray-400 text-xs">Monthly Investment</div>
                        <div className="text-xl font-bold text-blue-400">{formatCurrency(optimization.totalMonthlyContribution)}</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-gray-400 text-xs">Target Corpus</div>
                        <div className="text-xl font-bold text-purple-400">{formatCurrency(optimization.targetCorpus)}</div>
                      </div>
                    </div>
                    {optimization.topRecommendation && (
                      <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                        <div className="text-sm text-purple-300 mb-2">Top Recommended Account</div>
                        <div className="font-semibold">{optimization.topRecommendation.accountType}</div>
                        <div className="text-sm text-gray-400">Balance: {formatCurrency(optimization.topRecommendation.balance)} | Rate: {optimization.topRecommendation.interestRate}% | Efficiency: {optimization.topRecommendation.efficiency}</div>
                      </div>
                    )}
                    {optimization.accounts?.length > 0 && (
                      <div className="space-y-2">
                        {optimization.accounts.map(acc => (
                          <div key={acc.accountId} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{ACCOUNT_ICONS[acc.accountType] || '💰'}</span>
                              <span className="font-medium">{acc.accountType}</span>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className={acc.suggestion === 'maintain' ? 'text-emerald-400' : acc.suggestion === 'consider_increase' ? 'text-amber-400' : 'text-red-400'}>
                                {acc.suggestion === 'maintain' ? '✅ Maintain' : acc.suggestion === 'consider_increase' ? '⬆️ Increase' : '⚠️ Evaluate'}
                              </span>
                              <span className="text-gray-400">{acc.efficiency} efficiency</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p>Add pension accounts to see optimization recommendations</p>
                    <button onClick={() => setActiveTab('accounts')} className="mt-2 text-purple-400 hover:underline">Go to Accounts</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showPlanModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowPlanModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingPlan ? 'Edit Plan' : 'New Retirement Plan'}</h3>
                <button onClick={() => setShowPlanModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Plan Name</label>
                  <input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. Early Retirement" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Target Corpus (₹)</label>
                  <input type="number" value={planForm.targetCorpus} onChange={e => setPlanForm(p => ({ ...p, targetCorpus: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Risk Profile</label>
                  <select value={planForm.riskProfile} onChange={e => {
                    const rp = RISK_PROFILES.find(r => r.value === e.target.value);
                    setPlanForm(p => ({ ...p, riskProfile: e.target.value, expectedReturnRate: rp?.returnRate || 10 }));
                  }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {RISK_PROFILES.map(r => <option key={r.value} value={r.value}>{r.label} ({r.returnRate}%)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Current Age</label>
                  <input type="number" value={planForm.currentAge} onChange={e => setPlanForm(p => ({ ...p, currentAge: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Retirement Age</label>
                  <input type="number" value={planForm.retirementAge} onChange={e => setPlanForm(p => ({ ...p, retirementAge: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Life Expectancy</label>
                  <input type="number" value={planForm.lifeExpectancy} onChange={e => setPlanForm(p => ({ ...p, lifeExpectancy: parseInt(e.target.value) || 85 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Current Savings (₹)</label>
                  <input type="number" value={planForm.currentSavings} onChange={e => setPlanForm(p => ({ ...p, currentSavings: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Monthly Contribution (₹)</label>
                  <input type="number" value={planForm.monthlyContribution} onChange={e => setPlanForm(p => ({ ...p, monthlyContribution: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Expected Return (%)</label>
                  <input type="number" step="0.5" value={planForm.expectedReturnRate} onChange={e => setPlanForm(p => ({ ...p, expectedReturnRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Inflation Rate (%)</label>
                  <input type="number" step="0.5" value={planForm.inflationRate} onChange={e => setPlanForm(p => ({ ...p, inflationRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Safe Withdrawal Rate (%)</label>
                  <input type="number" step="0.5" value={planForm.drawdownRate} onChange={e => setPlanForm(p => ({ ...p, drawdownRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Notes</label>
                  <textarea value={planForm.notes} onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleCreatePlan} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAccountModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowAccountModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingAccount ? 'Edit Account' : 'Add Pension Account'}</h3>
                <button onClick={() => setShowAccountModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Account Type</label>
                  <select value={accountForm.accountType} onChange={e => setAccountForm(p => ({ ...p, accountType: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Provider</label>
                  <input value={accountForm.provider} onChange={e => setAccountForm(p => ({ ...p, provider: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. EPFO, SBI" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Account Number</label>
                  <input value={accountForm.accountNumber} onChange={e => setAccountForm(p => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Balance (₹)</label>
                  <input type="number" value={accountForm.balance} onChange={e => setAccountForm(p => ({ ...p, balance: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.1" value={accountForm.interestRate} onChange={e => setAccountForm(p => ({ ...p, interestRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Your Monthly Contribution (₹)</label>
                  <input type="number" value={accountForm.monthlyContribution} onChange={e => setAccountForm(p => ({ ...p, monthlyContribution: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Employer Contribution (₹)</label>
                  <input type="number" value={accountForm.employerContribution} onChange={e => setAccountForm(p => ({ ...p, employerContribution: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Start Date</label>
                  <input type="date" value={accountForm.startDate} onChange={e => setAccountForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Notes</label>
                  <textarea value={accountForm.notes} onChange={e => setAccountForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAccountModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleCreateAccount} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                  {editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
