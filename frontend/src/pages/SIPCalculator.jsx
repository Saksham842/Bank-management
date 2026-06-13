import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { addYears, differenceInMonths } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  Calculator, TrendingUp, Target, PiggyBank, Plus, X,
  ChevronRight, DollarSign, Calendar
} from 'lucide-react';
import {
  getGoals, createGoal, updateGoal, deleteGoal,
  calculateSIP, calculateLumpsum, calculateGoal, projectGoal
} from '../api/sip.api';

const TAB_KEYS = ['sip', 'lumpsum', 'stepup', 'goals'];
const TAB_LABELS = ['SIP', 'Lumpsum', 'Step-Up SIP', 'Goals'];
const TAB_ICONS = [TrendingUp, Calculator, PiggyBank, Target];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + 'L';
  return '₹' + val.toLocaleString('en-IN');
};

const COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'];
const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

export const SIPCalculatorPage = () => {
  const { showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('sip');
  const [goals, setGoals] = useState([]);
  const [sipResult, setSipResult] = useState(null);
  const [lumpResult, setLumpResult] = useState(null);
  const [goalResult, setGoalResult] = useState(null);
  const [projections, setProjections] = useState({});

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: '', category: 'Wealth', targetAmount: '', targetDate: '', currentSavings: '0', monthlySIP: '0', expectedReturnRate: '12', riskProfile: 'moderate', inflationRate: '6', stepUpPercentage: '0', notes: '' });

  const [sipParams, setSipParams] = useState({ monthlyInvestment: 5000, expectedReturnRate: 12, tenureYears: 10 });
  const [lumpParams, setLumpParams] = useState({ investment: 100000, expectedReturnRate: 12, tenureYears: 10 });
  const [stepParams, setStepParams] = useState({ monthlyInvestment: 5000, expectedReturnRate: 12, tenureYears: 15, stepUpPercentage: 10 });
  const [goalCalcParams, setGoalCalcParams] = useState({ targetAmount: 10000000, targetDate: addYears(new Date(), 10).toISOString().split('T')[0], currentSavings: 0, expectedReturnRate: 12, inflationRate: 6 });

  const loadGoals = useCallback(async () => {
    try { const g = await getGoals(); setGoals(g); } catch {}
  }, []);

  useEffect(() => { loadGoals(); }, []);

  const runSIP = async () => {
    try {
      const r = await calculateSIP(sipParams); setSipResult(r);
    } catch { showToast('Calculation failed', 'error'); }
  };

  const runLumpsum = async () => {
    try {
      const r = await calculateLumpsum(lumpParams); setLumpResult(r);
    } catch { showToast('Calculation failed', 'error'); }
  };

  const runGoalCalc = async () => {
    try {
      const r = await calculateGoal(goalCalcParams); setGoalResult(r);
    } catch { showToast('Calculation failed', 'error'); }
  };

  const handleSaveGoal = async () => {
    try {
      const data = {
        ...goalForm,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentSavings: parseFloat(goalForm.currentSavings),
        monthlySIP: parseFloat(goalForm.monthlySIP),
        expectedReturnRate: parseFloat(goalForm.expectedReturnRate),
        inflationRate: parseFloat(goalForm.inflationRate),
        stepUpPercentage: parseFloat(goalForm.stepUpPercentage)
      };
      if (editingGoal) { await updateGoal(editingGoal._id, data); showToast('Goal updated', 'success'); }
      else { await createGoal(data); showToast('Goal created', 'success'); }
      setShowGoalModal(false); setEditingGoal(null); loadGoals();
    } catch (e) { showToast(e?.response?.data?.message || 'Error', 'error'); }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try { await deleteGoal(id); loadGoals(); showToast('Goal deleted', 'success'); } catch { showToast('Error', 'error'); }
  };

  const runProjection = async (id) => {
    try {
      const r = await projectGoal(id);
      setProjections(p => ({ ...p, [id]: r }));
    } catch { showToast('Projection failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
        <motion.div variants={item} className="flex items-center gap-3 mb-6">
          <Calculator className="w-7 h-7 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold">SIP & Investment Calculator</h1>
            <p className="text-gray-400 text-sm">Plan your investments with SIP, lumpsum, step-up, and goal-based calculators</p>
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
          {activeTab === 'sip' && (
            <motion.div key="sip" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">SIP Calculator</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Monthly Investment (₹)</label>
                    <input type="number" value={sipParams.monthlyInvestment} onChange={e => setSipParams(p => ({ ...p, monthlyInvestment: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Expected Return (%)</label>
                    <input type="number" step="0.5" value={sipParams.expectedReturnRate} onChange={e => setSipParams(p => ({ ...p, expectedReturnRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Tenure (Years)</label>
                    <input type="number" value={sipParams.tenureYears} onChange={e => setSipParams(p => ({ ...p, tenureYears: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button onClick={runSIP} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Calculate</button>
              </motion.div>

              {sipResult && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Total Investment</div>
                    <div className="text-2xl font-bold text-blue-400">{formatCurrency(sipResult.totalInvestment)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Expected Returns</div>
                    <div className="text-2xl font-bold text-amber-400">{formatCurrency(sipResult.expectedReturns)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Final Corpus</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(sipResult.finalCorpus)}</div>
                  </div>
                </motion.div>
              )}

              {sipResult?.yearlyBreakdown?.length > 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Yearly Growth</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sipResult.yearlyBreakdown}>
                        <defs>
                          <linearGradient id="sipGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="year" stroke="#4B5563" label={{ value: 'Year', fill: '#9CA3AF', position: 'insideBottom', offset: -5 }} />
                        <YAxis tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Area type="monotone" dataKey="corpus" stroke="#7C3AED" fill="url(#sipGrad)" strokeWidth={2} name="Corpus" />
                        <Area type="monotone" dataKey="invested" stroke="#0EA5E9" fill="none" strokeWidth={2} strokeDasharray="5 5" name="Invested" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'lumpsum' && (
            <motion.div key="lumpsum" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Lumpsum Calculator</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">One-Time Investment (₹)</label>
                    <input type="number" value={lumpParams.investment} onChange={e => setLumpParams(p => ({ ...p, investment: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Expected Return (%)</label>
                    <input type="number" step="0.5" value={lumpParams.expectedReturnRate} onChange={e => setLumpParams(p => ({ ...p, expectedReturnRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Tenure (Years)</label>
                    <input type="number" value={lumpParams.tenureYears} onChange={e => setLumpParams(p => ({ ...p, tenureYears: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button onClick={runLumpsum} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Calculate</button>
              </motion.div>

              {lumpResult && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Investment</div>
                    <div className="text-2xl font-bold text-blue-400">{formatCurrency(lumpResult.investment)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Total Returns</div>
                    <div className="text-2xl font-bold text-amber-400">{formatCurrency(lumpResult.totalReturns)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Final Value</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(lumpResult.finalValue)}</div>
                  </div>
                </motion.div>
              )}

              {lumpResult?.yearlyBreakdown?.length > 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Yearly Growth</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={lumpResult.yearlyBreakdown}>
                        <defs><linearGradient id="lumpGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="year" stroke="#4B5563" />
                        <YAxis tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Area type="monotone" dataKey="value" stroke="#10B981" fill="url(#lumpGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'stepup' && (
            <motion.div key="stepup" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Step-Up SIP Calculator</h3>
                <p className="text-gray-400 text-sm mb-4">Increase your SIP amount by a fixed percentage every year</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Starting SIP (₹)</label>
                    <input type="number" value={stepParams.monthlyInvestment} onChange={e => setStepParams(p => ({ ...p, monthlyInvestment: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Annual Step-Up (%)</label>
                    <input type="number" step="1" value={stepParams.stepUpPercentage} onChange={e => setStepParams(p => ({ ...p, stepUpPercentage: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Return (%)</label>
                    <input type="number" step="0.5" value={stepParams.expectedReturnRate} onChange={e => setStepParams(p => ({ ...p, expectedReturnRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Tenure (Years)</label>
                    <input type="number" value={stepParams.tenureYears} onChange={e => setStepParams(p => ({ ...p, tenureYears: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button onClick={async () => {
                  try { const r = await calculateSIP({ ...stepParams }); setSipResult(r); } catch { showToast('Error', 'error'); }
                }} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Calculate</button>
              </motion.div>

              {sipResult?.stepUpPercentage > 0 && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Total Investment</div>
                    <div className="text-2xl font-bold text-blue-400">{formatCurrency(sipResult.totalInvestment)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Expected Returns</div>
                    <div className="text-2xl font-bold text-amber-400">{formatCurrency(sipResult.expectedReturns)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Final Corpus</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(sipResult.finalCorpus)}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div key="goals" variants={container} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Goal-Based Planning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Target Amount (₹)</label>
                    <input type="number" value={goalCalcParams.targetAmount} onChange={e => setGoalCalcParams(p => ({ ...p, targetAmount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Target Date</label>
                    <input type="date" value={goalCalcParams.targetDate} onChange={e => setGoalCalcParams(p => ({ ...p, targetDate: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Current Savings (₹)</label>
                    <input type="number" value={goalCalcParams.currentSavings} onChange={e => setGoalCalcParams(p => ({ ...p, currentSavings: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Return (%)</label>
                    <input type="number" step="0.5" value={goalCalcParams.expectedReturnRate} onChange={e => setGoalCalcParams(p => ({ ...p, expectedReturnRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Inflation (%)</label>
                    <input type="number" step="0.5" value={goalCalcParams.inflationRate} onChange={e => setGoalCalcParams(p => ({ ...p, inflationRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button onClick={runGoalCalc} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">Calculate Required SIP</button>
              </motion.div>

              {goalResult && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Target Amount</div>
                    <div className="text-xl font-bold">{formatCurrency(goalResult.targetAmount)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Inflation Adjusted</div>
                    <div className="text-xl font-bold text-amber-400">{formatCurrency(goalResult.inflatedTarget)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Required Monthly SIP</div>
                    <div className="text-xl font-bold text-emerald-400">{formatCurrency(goalResult.requiredMonthlySIP)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                    <div className="text-gray-400 text-xs mb-1">Time Remaining</div>
                    <div className="text-xl font-bold text-purple-400">{goalResult.yearsRemaining}y</div>
                  </div>
                </motion.div>
              )}

              <motion.div variants={item} className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Saved Goals</h3>
                <button onClick={() => { setEditingGoal(null); setGoalForm({ name: '', category: 'Wealth', targetAmount: '', targetDate: '', currentSavings: '0', monthlySIP: '0', expectedReturnRate: '12', riskProfile: 'moderate', inflationRate: '6', stepUpPercentage: '0', notes: '' }); setShowGoalModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"><Plus size={16} /> New Goal</button>
              </motion.div>

              {goals.length === 0 ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Investment Goals</h3>
                  <p className="text-gray-400">Create goals to track your progress and see projections.</p>
                </motion.div>
              ) : (
                goals.map(g => {
                  const monthsLeft = differenceInMonths(new Date(g.targetDate), new Date());
                  const prog = projections[g._id];
                  return (
                    <motion.div key={g._id} variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-lg"><Target size={18} className="text-purple-400" /></div>
                          <div>
                            <h3 className="font-semibold">{g.name}</h3>
                            <div className="text-xs text-gray-400">{g.category} · {monthsLeft > 0 ? `${monthsLeft} months left` : 'Past due'}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => runProjection(g._id)} className="p-1.5 hover:bg-gray-700 rounded" title="Project"><TrendingUp size={16} className="text-gray-400" /></button>
                          <button onClick={() => { setEditingGoal(g); setGoalForm({ name: g.name, category: g.category, targetAmount: g.targetAmount.toString(), targetDate: g.targetDate.split('T')[0], currentSavings: g.currentSavings.toString(), monthlySIP: g.monthlySIP.toString(), expectedReturnRate: g.expectedReturnRate.toString(), riskProfile: g.riskProfile, inflationRate: g.inflationRate.toString(), stepUpPercentage: (g.stepUpPercentage || 0).toString(), notes: g.notes || '' }); setShowGoalModal(true); }} className="p-1.5 hover:bg-gray-700 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
                          <button onClick={() => handleDeleteGoal(g._id)} className="p-1.5 hover:bg-red-900/50 rounded"><X size={16} className="text-red-400" /></button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-400 text-xs">Target</span><div className="font-semibold">{formatCurrency(g.targetAmount)}</div></div>
                        <div><span className="text-gray-400 text-xs">Current SIP</span><div className="font-semibold">{formatCurrency(g.monthlySIP)}/mo</div></div>
                        <div><span className="text-gray-400 text-xs">Savings</span><div className="font-semibold">{formatCurrency(g.currentSavings)}</div></div>
                        <div><span className="text-gray-400 text-xs">Rate</span><div className="font-semibold">{g.expectedReturnRate}%</div></div>
                      </div>
                      <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${g.monthlySIP > 0 ? 'bg-purple-600' : 'bg-gray-600'}`}
                          style={{ width: `${prog ? prog.progress : g.monthlySIP > 0 ? 15 : 0}%` }}></div>
                      </div>
                      {prog && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs bg-gray-700/50 rounded-lg p-2">
                          <span>Projected: <strong className="text-emerald-400">{formatCurrency(prog.projectedCorpus)}</strong></span>
                          <span>Progress: <strong>{prog.progress}%</strong></span>
                          <span className={prog.onTrack ? 'text-emerald-400' : 'text-red-400'}>{prog.onTrack ? '✅ On Track' : '⚠️ Behind'}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showGoalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowGoalModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingGoal ? 'Edit Goal' : 'New Investment Goal'}</h3>
                <button onClick={() => setShowGoalModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <input value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Goal name" />
                </div>
                <select value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                  {['Retirement', 'Education', 'Home', 'Marriage', 'Travel', 'Emergency', 'Wealth', 'Vehicle', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={goalForm.riskProfile} onChange={e => setGoalForm(f => ({ ...f, riskProfile: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                  <option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option>
                </select>
                <input type="number" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Target Amount" />
                <input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" value={goalForm.currentSavings} onChange={e => setGoalForm(f => ({ ...f, currentSavings: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Current Savings" />
                <input type="number" value={goalForm.monthlySIP} onChange={e => setGoalForm(f => ({ ...f, monthlySIP: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Monthly SIP" />
                <input type="number" step="0.5" value={goalForm.expectedReturnRate} onChange={e => setGoalForm(f => ({ ...f, expectedReturnRate: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Expected Return %" />
                <input type="number" step="0.5" value={goalForm.inflationRate} onChange={e => setGoalForm(f => ({ ...f, inflationRate: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Inflation %" />
                <input type="number" step="1" value={goalForm.stepUpPercentage} onChange={e => setGoalForm(f => ({ ...f, stepUpPercentage: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Annual Step-Up %" />
                <div className="col-span-2">
                  <textarea value={goalForm.notes} onChange={e => setGoalForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} placeholder="Notes" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowGoalModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSaveGoal} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">{editingGoal ? 'Update' : 'Create Goal'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
