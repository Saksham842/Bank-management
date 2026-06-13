import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, parseISO, differenceInMonths } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, BarChart, Bar, ComposedChart, Legend,
  ScatterChart, Scatter
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, X, RefreshCw, BarChart3,
  Activity, Target, DollarSign, AlertTriangle, Sparkles, Save,
  Sliders, PieChart, ChevronRight, Clock
} from 'lucide-react';
import {
  getForecast, runWhatIf, runMonteCarlo,
  getScenarios, saveScenario, deleteScenario, getFire
} from '../api/forecast.api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const ForecastPage = () => {
  const { settings, transactions, showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('forecast');
  const [loading, setLoading] = useState(true);

  // Forecast state
  const [forecast, setForecast] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(12);

  // What-If state
  const [whatIf, setWhatIf] = useState(null);
  const [whatIfParams, setWhatIfParams] = useState({
    incomeChange: 0, expenseChange: 0, oneTimeCost: 0,
    monthlySavingsChange: 0, months: 12
  });

  // Monte Carlo state
  const [mc, setMc] = useState(null);
  const [mcParams, setMcParams] = useState({
    targetAmount: 1000000, months: 60, simulations: 500,
    monthlyContribution: 10000, currentBalance: 50000,
    expectedReturn: 8, volatility: 15
  });

  // FIRE state
  const [fire, setFire] = useState(null);

  // Saved scenarios
  const [scenarios, setScenarios] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const loadForecast = useCallback(async (months) => {
    try {
      const data = await getForecast(months);
      setForecast(data);
    } catch { showToast('error', 'Could not load forecast'); }
  }, [showToast]);

  const loadFire = useCallback(async () => {
    try { setFire(await getFire()); } catch {}
  }, []);

  const loadScenarios = useCallback(async () => {
    try { setScenarios(await getScenarios()); } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadForecast(forecastMonths), loadFire(), loadScenarios()])
      .finally(() => setLoading(false));
  }, [loadForecast, loadFire, loadScenarios]);

  const handleRunWhatIf = async () => {
    try {
      const data = await runWhatIf(whatIfParams);
      setWhatIf(data);
    } catch { showToast('error', 'Scenario simulation failed'); }
  };

  const handleRunMC = async () => {
    try {
      const data = await runMonteCarlo(mcParams);
      setMc(data);
    } catch { showToast('error', 'Monte Carlo simulation failed'); }
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) { showToast('error', 'Enter a name'); return; }
    try {
      await saveScenario({
        name: scenarioName,
        type: whatIf ? 'custom' : 'savings_goal',
        assumptions: whatIf ? whatIfParams : mcParams,
        results: whatIf ? whatIf.summary : mc?.summary || {}
      });
      setShowSaveModal(false);
      setScenarioName('');
      await loadScenarios();
      showToast('success', 'Scenario saved');
    } catch { showToast('error', 'Failed to save'); }
  };

  const formatChartValue = (v) => `${settings.currency}${(v || 0).toLocaleString()}`;

  const chartContentStyle = { backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '10px' };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 w-full pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Cash Flow Forecasting</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-violet-400 bg-violet-950/30 border border-violet-500/20 rounded-xl hover:bg-violet-900/30 transition-all">
            <Save className="h-3 w-3" /> Save Scenario
          </button>
          <button onClick={() => { loadForecast(forecastMonths); loadFire(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white transition-all">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {[
          { key: 'forecast', icon: TrendingUp, label: 'Baseline' },
          { key: 'whatif', icon: Sliders, label: 'What-If' },
          { key: 'montecarlo', icon: Activity, label: 'Monte Carlo' },
          { key: 'fire', icon: Target, label: 'FIRE' },
          { key: 'scenarios', icon: Save, label: 'Saved' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === key ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ─── TAB: BASELINE FORECAST ─── */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Projection:</span>
            {[3, 6, 12, 24, 36].map(m => (
              <button key={m} onClick={() => { setForecastMonths(m); loadForecast(m); }}
                className={`px-3 py-1.5 text-[9px] font-bold rounded-lg transition-all ${forecastMonths === m ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                {m}mo
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {/* Main forecast chart */}
              <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Balance Projection</h3>
                <div className="h-72">
                  {forecast && forecast.balance ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.balance}>
                        <defs>
                          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                          tickFormatter={(v) => { const [y, m] = v.split('-'); return `${MONTH_NAMES[parseInt(m) - 1]} ${y.slice(2)}`; }} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                          tickFormatter={v => `${settings.currency}${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={chartContentStyle} formatter={v => formatChartValue(v)} labelFormatter={(v) => { const [y, m] = v.split('-'); return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`; }} />
                        <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} fill="url(#balanceGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-violet-400 border-t-transparent rounded-full" /></div>
                  )}
                </div>
              </motion.div>

              {/* Income vs Expense */}
              <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Income vs Expenses</h3>
                <div className="h-56">
                  {forecast && forecast.income ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecast.income.map((d, i) => ({ ...d, expense: forecast.expense[i]?.value || 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#475569" fontSize={8} tickLine={false} axisLine={false}
                          tickFormatter={(v) => { const [y, m] = v.split('-'); return `${MONTH_NAMES[parseInt(m) - 1]}`; }} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartContentStyle} formatter={v => formatChartValue(v)} />
                        <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} />
                        <Bar dataKey="value" name="Income" fill="#10B981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="expense" name="Expenses" fill="#EF4444" radius={[2, 2, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
              </motion.div>
            </div>

            {/* Right panel: summary + KPIs */}
            <div className="lg:col-span-2 space-y-4">
              {forecast?.summary && (
                <>
                  <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Projection Summary</h3>
                    <div className="space-y-2 text-[10px]">
                      {[
                        { label: 'Starting Balance', val: formatChartValue(forecast.summary.startingBalance) },
                        { label: 'Projected Balance', val: formatChartValue(forecast.summary.projectedBalance), color: forecast.summary.projectedBalance >= forecast.summary.startingBalance ? 'text-emerald-400' : 'text-red-400' },
                        { label: 'Avg Monthly Income', val: formatChartValue(forecast.summary.avgMonthlyIncome) },
                        { label: 'Avg Monthly Expense', val: formatChartValue(forecast.summary.avgMonthlyExpense) },
                        { label: 'Savings Rate', val: `${forecast.summary.savingsRate}%`, color: forecast.summary.savingsRate >= 20 ? 'text-emerald-400' : 'text-amber-400' },
                        { label: 'Period', val: `${forecast.summary.monthsAnalyzed} months` },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                          <span className="text-slate-500">{label}</span>
                          <span className={`font-bold ${color || 'text-white'}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Cash Flow Health</h3>
                    <div className="text-center py-3">
                      <div className={`text-3xl font-extrabold ${forecast.summary.savingsRate >= 20 ? 'text-emerald-400' : forecast.summary.savingsRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                        {forecast.summary.savingsRate}%
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1">Projected Savings Rate</p>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-2">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400"
                        initial={{ width: 0 }} animate={{ width: `${Math.min(100, forecast.summary.savingsRate * 2)}%` }} />
                    </div>
                    <p className="text-[9px] text-slate-600 mt-2 text-center">Target: 20%+ for healthy finances</p>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: WHAT-IF SIMULATOR ─── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <motion.div variants={item} className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                <Sliders className="h-3 w-3 text-violet-400" /> Scenario Parameters
              </h3>
              <div className="space-y-5">
                {[
                  { key: 'incomeChange', label: 'Income Change (%)', min: -50, max: 100, step: 1, color: 'emerald' },
                  { key: 'expenseChange', label: 'Expense Change (%)', min: -50, max: 100, step: 1, color: 'red' },
                  { key: 'oneTimeCost', label: 'One-Time Cost', min: 0, max: 500000, step: 1000, color: 'amber', fmt: (v) => `${settings.currency}${(v || 0).toLocaleString()}` },
                  { key: 'monthlySavingsChange', label: 'Monthly Savings Change', min: -50000, max: 50000, step: 500, color: 'violet', fmt: (v) => `${settings.currency}${(v || 0).toLocaleString()}` },
                  { key: 'months', label: 'Projection Months', min: 3, max: 60, step: 3, color: 'slate' },
                ].map(({ key, label, min, max, step, color, fmt }) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-slate-400">{label}</span>
                      <span className={`font-bold text-${color}-400`}>{fmt ? fmt(whatIfParams[key]) : `${whatIfParams[key] >= 0 ? '+' : ''}${whatIfParams[key]}${key.includes('Change') ? '%' : ''}`}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={whatIfParams[key]}
                      onChange={e => setWhatIfParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: '#1e293b', accentColor: color === 'emerald' ? '#10B981' : color === 'red' ? '#EF4444' : color === 'amber' ? '#F59E0B' : '#7C3AED' }} />
                  </div>
                ))}

                <button onClick={handleRunWhatIf}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">
                  Run Simulation
                </button>
              </div>
            </motion.div>

            {/* Saved scenarios quick list */}
            {scenarios.length > 0 && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Recent Scenarios</h3>
                <div className="space-y-1">
                  {scenarios.slice(0, 5).map(s => (
                    <div key={s._id} className="flex justify-between text-[9px] py-1.5 px-2 bg-slate-900/50 rounded-lg">
                      <span className="text-slate-300 truncate">{s.name}</span>
                      <span className="text-slate-500">{format(parseISO(s.createdAt), 'dd MMM')}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <motion.div variants={item} className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Scenario vs Baseline</h3>
              <div className="h-72">
                {whatIf ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={whatIf.balance.map((d, i) => ({
                      month: d.month,
                      scenario: d.value,
                      baseline: whatIf.baselineBalance?.[i]?.value || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                        tickFormatter={(v) => { const [y, m] = v.split('-'); return `${MONTH_NAMES[parseInt(m) - 1]}`; }} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                        tickFormatter={v => `${settings.currency}${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={chartContentStyle} />
                      <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} />
                      <Area type="monotone" dataKey="baseline" stroke="#475569" strokeWidth={1.5} fill="#475569" fillOpacity={0.1} name="Baseline" />
                      <Area type="monotone" dataKey="scenario" stroke="#7C3AED" strokeWidth={2} fill="#7C3AED" fillOpacity={0.15} name="Scenario" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Sliders className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Adjust parameters and run simulation</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {whatIf?.summary && (
              <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Starting', val: formatChartValue(whatIf.summary.startingBalance), color: 'text-slate-300' },
                  { label: 'Projected', val: formatChartValue(whatIf.summary.projectedBalance), color: whatIf.summary.projectedBalance >= whatIf.summary.startingBalance ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'vs Baseline', val: `${whatIf.summary.diffFromBaseline >= 0 ? '+' : ''}${settings.currency}${(whatIf.summary.diffFromBaseline || 0).toLocaleString()}`, color: whatIf.summary.diffFromBaseline >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Period', val: `${whatIf.summary.monthsAnalyzed}mo`, color: 'text-violet-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="glass-panel rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className={`text-sm font-extrabold ${color}`}>{val}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: MONTE CARLO ─── */}
      {activeTab === 'montecarlo' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <motion.div variants={item} className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                <Activity className="h-3 w-3 text-violet-400" /> Simulation Parameters
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'targetAmount', label: 'Target Amount', min: 1000, max: 10000000, step: 10000, fmt: (v) => `${settings.currency}${(v || 0).toLocaleString()}` },
                  { key: 'months', label: 'Time Horizon (months)', min: 6, max: 120, step: 6 },
                  { key: 'monthlyContribution', label: 'Monthly Contribution', min: 0, max: 200000, step: 1000, fmt: (v) => `${settings.currency}${(v || 0).toLocaleString()}` },
                  { key: 'currentBalance', label: 'Current Balance', min: 0, max: 5000000, step: 10000, fmt: (v) => `${settings.currency}${(v || 0).toLocaleString()}` },
                  { key: 'expectedReturn', label: 'Expected Return (%)', min: 1, max: 30, step: 0.5 },
                  { key: 'volatility', label: 'Volatility (%)', min: 5, max: 50, step: 1 },
                ].map(({ key, label, min, max, step, fmt }) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-bold text-white">{fmt ? fmt(mcParams[key]) : mcParams[key]}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={mcParams[key]}
                      onChange={e => setMcParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: '#1e293b', accentColor: '#7C3AED' }} />
                  </div>
                ))}

                <button onClick={handleRunMC}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">
                  Run {mcParams.simulations} Simulations
                </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <motion.div variants={item} className="glass-panel rounded-2xl p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Probability Cone</h3>
              <div className="h-72">
                {mc ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mc.bands}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                        tickFormatter={v => `${settings.currency}${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={chartContentStyle} formatter={v => formatChartValue(v)} />
                      <Legend wrapperStyle={{ fontSize: '8px', color: '#94a3b8' }} />
                      <defs>
                        <linearGradient id="p10p90" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="p25p75" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="p90" stroke="#7C3AED" strokeWidth={0.5} fill="url(#p10p90)" name="90th percentile" />
                      <Area type="monotone" dataKey="p75" stroke="#8B5CF6" strokeWidth={0.5} fill="url(#p25p75)" name="75th percentile" />
                      <Line type="monotone" dataKey="p50" stroke="#A78BFA" strokeWidth={2} dot={false} name="Median (50th)" />
                      <Area type="monotone" dataKey="p25" stroke="#8B5CF6" strokeWidth={0.5} fill="none" name="25th percentile" />
                      <Area type="monotone" dataKey="p10" stroke="#7C3AED" strokeWidth={0.5} fill="none" name="10th percentile" />
                      {mc.targetAmount > 0 && (
                        <Line type="monotone" data={[{ month: 1, value: mc.targetAmount }, { month: mc.bands.length, value: mc.targetAmount }]}
                          dataKey="value" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name={`Target: ${settings.currency}${(mc.targetAmount / 1000).toFixed(0)}k`} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Configure parameters and run simulation</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {mc && (
              <>
                <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Probability', val: `${mc.probability}%`, color: mc.probability >= 70 ? 'text-emerald-400' : mc.probability >= 40 ? 'text-amber-400' : 'text-red-400' },
                    { label: 'Median Final', val: formatChartValue(mc.medianFinal), color: mc.medianFinal >= mc.targetAmount ? 'text-emerald-400' : 'text-amber-400' },
                    { label: 'Target', val: formatChartValue(mc.targetAmount), color: 'text-violet-400' },
                    { label: 'Simulations', val: mc.simulationsRun.toLocaleString(), color: 'text-slate-300' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="glass-panel rounded-2xl p-4 text-center">
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className={`text-sm font-extrabold ${color}`}>{val}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Assessment</h3>
                  <div className="flex items-center gap-3">
                    <div className={`text-xl font-extrabold ${mc.summary?.onTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {mc.summary?.onTrack ? 'ON TRACK' : 'ADJUSTMENT NEEDED'}
                    </div>
                    <p className="text-[9px] text-slate-500 flex-1">
                      {mc.summary?.onTrack
                        ? `You have a ${mc.probability}% probability of reaching your target. Keep up the current savings plan.`
                        : `Only ${mc.probability}% probability. Try increasing contributions, extending timeline, or adjusting target.`}
                    </p>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: FIRE CALCULATOR ─── */}
      {activeTab === 'fire' && (
        <div className="space-y-6">
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Monthly Expense', val: fire ? formatChartValue(fire.monthlyExpense) : '—', color: 'text-slate-300', icon: TrendingDown },
              { label: 'FI Number', val: fire ? formatChartValue(fire.fiNumber) : '—', color: 'text-violet-400', icon: Target },
              { label: 'Years to FI', val: fire ? `${fire.yearsToFI} yrs` : '—', color: fire?.yearsToFI <= 10 ? 'text-emerald-400' : fire?.yearsToFI <= 20 ? 'text-amber-400' : 'text-red-400', icon: Clock },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} className="glass-panel rounded-2xl p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800"><Icon className={`h-5 w-5 ${color}`} /></div>
                <div><p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p><p className={`text-xl font-extrabold ${color}`}>{val}</p></div>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {fire && (
                <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Progress to Financial Independence</h3>
                  <div className="text-center mb-4">
                    <div className="text-5xl font-extrabold text-white">{fire.progress.pct}%</div>
                    <p className="text-[10px] text-slate-500 mt-1">of FI target</p>
                  </div>
                  <div className="h-4 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                      initial={{ width: 0 }} animate={{ width: `${fire.progress.pct}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>{formatChartValue(0)}</span>
                    <span>{formatChartValue(fire.progress.target)}</span>
                  </div>
                </motion.div>
              )}

              {fire && (
                <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Milestones</h3>
                  <div className="space-y-2">
                    {fire.milestones.map((m, i) => {
                      const pct = fire.fiNumber > 0 ? Math.min(100, (m.amount / fire.fiNumber) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-3">
                          <div className="h-8 w-8 rounded-full bg-violet-950/40 border border-violet-500/20 flex items-center justify-center text-[9px] font-bold text-violet-400">
                            {pct}%
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-white">{m.label}</p>
                            <p className="text-[9px] text-slate-400">{formatChartValue(m.amount)}</p>
                          </div>
                          <div className="h-1.5 w-24 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, (fire.progress.currentSavings / m.amount) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {fire && (
                <>
                  <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">FI Details</h3>
                    <div className="space-y-2 text-[10px]">
                      {[
                        { label: 'Current Savings Rate', val: `${fire.currentSavingsRate}%` },
                        { label: 'Monthly Expenses', val: formatChartValue(fire.monthlyExpense) },
                        { label: 'FI Number (25x Annual)', val: formatChartValue(fire.fiNumber) },
                        { label: 'Years to FI', val: `${fire.yearsToFI} years` },
                        { label: 'Monthly Savings Needed', val: formatChartValue(fire.monthlySavingsNeeded) },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between py-1.5 border-b border-slate-900 last:border-0">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-bold text-white">{val}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="glass-panel rounded-2xl p-5">
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Insights</h3>
                    <div className="space-y-2">
                      {[
                        fire.yearsToFI <= 10
                          ? 'You are on an accelerated path to financial independence. Consider Coast FIRE or Barista FIRE options.'
                          : fire.yearsToFI <= 20
                            ? 'Steady progress toward FI. Increasing savings rate by 5% could cut 5+ years off your timeline.'
                            : 'Early stages of the FI journey. Focus on boosting income and reducing discretionary expenses.',
                        fire.currentSavingsRate >= 30
                          ? 'Your savings rate is exceptional! You are building wealth rapidly.'
                          : fire.currentSavingsRate >= 20
                            ? 'Healthy savings rate. You are on track for a secure retirement.'
                            : 'Try to reach at least 20% savings rate. Small increases compound significantly over time.',
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-[9px] bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2.5">
                          <Sparkles className="h-3 w-3 text-violet-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-300">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: SAVED SCENARIOS ─── */}
      {activeTab === 'scenarios' && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Saved Scenarios</h3>
          {scenarios.length === 0 ? (
            <div className="text-center py-10">
              <Save className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No scenarios saved yet. Run a What-If or Monte Carlo simulation and save it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios.map(s => (
                <div key={s._id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-[10px]">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-violet-950/40 border border-violet-500/20 flex items-center justify-center">
                      <Save className="h-3 w-3 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-slate-500">{s.type.replace('_', ' ')} — {format(parseISO(s.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.results?.projectedBalance && (
                      <span className="text-slate-300 font-bold">{formatChartValue(s.results.projectedBalance)}</span>
                    )}
                    <button onClick={() => deleteScenario(s._id).then(loadScenarios)}
                      className="p-1 text-red-400 hover:bg-red-950/30 rounded-lg">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Save Scenario Modal ─── */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-sm glass-panel rounded-2xl p-7 z-10">
              <button onClick={() => setShowSaveModal(false)} className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"><X className="h-5 w-5" /></button>
              <div className="flex items-center gap-3 mb-1">
                <Save className="h-5 w-5 text-violet-400" />
                <h3 className="text-lg font-extrabold text-white">Save Scenario</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">Name this scenario for future reference.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Scenario Name</label>
                  <input type="text" placeholder="e.g. Buy a car in 2027" value={scenarioName} onChange={e => setScenarioName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" />
                </div>
                {whatIf?.summary && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-[9px] text-slate-400">
                    <p>Projected: {formatChartValue(whatIf.summary.projectedBalance)} | vs baseline: {whatIf.summary.diffFromBaseline >= 0 ? '+' : ''}{settings.currency}{(whatIf.summary.diffFromBaseline || 0).toLocaleString()}</p>
                  </div>
                )}
                {mc?.summary && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-[9px] text-slate-400">
                    <p>Probability: {mc.probability}% | Median: {formatChartValue(mc.medianFinal)}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl">Cancel</button>
                  <button onClick={handleSaveScenario} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90">Save</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
