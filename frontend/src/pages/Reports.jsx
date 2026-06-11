import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays, subDays, addDays } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Line, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Target, Sparkles } from 'lucide-react';

const CATEGORY_COLORS = {
  Food: '#F59E0B', Transport: '#3B82F6', Shopping: '#EC4899',
  Bills: '#10B981', Health: '#EF4444', Entertainment: '#8B5CF6'
};

export const Reports = () => {
  const { transactions, goals, user, settings, showToast } = useContext(AppContext);

  const [dateRange] = useState('30');
  const [modelTraining, setModelTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [forecastData, setForecastData] = useState([]);
  const [forecastEstimate, setForecastEstimate] = useState(0);
  const [forecastTrend, setForecastTrend] = useState('stable');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [monteCarloProb, setMonteCarloProb] = useState(0);
  const [mcDistribution, setMcDistribution] = useState([]);

  useEffect(() => {
    if (goals.length > 0 && !selectedGoal) setSelectedGoal(goals[0]);
  }, [goals]);

  // ── Heatmap Data ────────────────────────────────────────
  const getHeatmapGrid = () => {
    const today = new Date();
    const dailySpend = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      dailySpend[t.date] = (dailySpend[t.date] || 0) + t.amount;
    });
    const maxSpend = Math.max(...Object.values(dailySpend), 1000);
    const grid = [];
    for (let i = 364; i >= 0; i--) {
      const date = subDays(today, i);
      const ds = format(date, 'yyyy-MM-dd');
      const spend = dailySpend[ds] || 0;
      grid.push({ date: ds, spend, intensity: spend === 0 ? 0 : Math.min(4, Math.ceil((spend / maxSpend) * 4)) });
    }
    return grid;
  };

  // ── Stacked Area for category trends ──────────────────
  const getStackedAreaData = () => {
    const today = new Date();
    const cats = Object.keys(CATEGORY_COLORS);
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const mo = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = format(mo, 'yyyy-MM');
      const row = { name: format(mo, 'MMM') };
      cats.forEach(c => row[c] = 0);
      transactions.filter(t => t.type === 'expense' && t.date.startsWith(key)).forEach(t => {
        if (row[t.category] !== undefined) row[t.category] += t.amount;
      });
      result.push(row);
    }
    return result;
  };

  // ── Radar chart ────────────────────────────────────────
  const getRadarData = () => {
    const sums = {};
    Object.keys(CATEGORY_COLORS).forEach(c => sums[c] = 0);
    transactions.filter(t => t.type === 'expense').forEach(t => { if (sums[t.category] !== undefined) sums[t.category] += t.amount; });
    const max = Math.max(...Object.values(sums), 1000);
    return Object.entries(sums).map(([subject, A]) => ({ subject, A, fullMark: max }));
  };

  // ── LSTM Forecast ──────────────────────────────────────
  const trainForecaster = () => {
    if (transactions.length < 15) { showToast('warning', 'Need at least 15 transactions.'); return; }
    if (!window.brain) { showToast('error', 'brain.js not loaded.'); return; }
    setModelTraining(true);
    setTrainingProgress(0);

    setTimeout(() => {
      try {
        const today = new Date();
        const dailyExp = {};
        for (let i = 89; i >= 0; i--) dailyExp[format(subDays(today, i), 'yyyy-MM-dd')] = 0;
        transactions.filter(t => t.type === 'expense').forEach(t => { if (dailyExp[t.date] !== undefined) dailyExp[t.date] += t.amount; });
        const seq = Object.values(dailyExp);
        const maxVal = Math.max(...seq, 1000);
        const trainData = [];
        for (let i = 0; i < seq.length - 8; i++) {
          trainData.push({ input: seq.slice(i, i + 7).map(v => v / maxVal), output: [seq[i + 7] / maxVal] });
        }
        const net = new window.brain.NeuralNetwork({ hiddenLayers: [8, 8] });
        let cur = 0;
        const interval = setInterval(() => {
          cur += 20; setTrainingProgress(Math.min(cur, 100));
          if (cur >= 200) {
            clearInterval(interval);
            net.train(trainData, { iterations: 80 });
            const last7 = seq.slice(-7).map(v => v / maxVal);
            const tempSeq = [...last7];
            const preds = [];
            for (let i = 0; i < 30; i++) {
              const out = net.run(tempSeq);
              const nv = out[0] || 0.1;
              preds.push(nv * maxVal);
              tempSeq.shift(); tempSeq.push(nv);
            }
            const chartData = [];
            Object.keys(dailyExp).slice(-15).forEach(d => chartData.push({ day: format(parseISO(d), 'MMM dd'), Actual: dailyExp[d], Forecast: null }));
            let fd = new Date();
            preds.forEach((p, idx) => {
              fd = addDays(fd, 1);
              chartData.push({ day: format(fd, 'MMM dd'), Actual: null, Forecast: Math.round(Math.max(0, p)), ConfidenceUpper: Math.round(p + 400), ConfidenceLower: Math.round(Math.max(0, p - 400)) });
            });
            const sumPred = preds.reduce((a, b) => a + b, 0);
            const last30Sum = seq.slice(-30).reduce((a, b) => a + b, 0);
            setForecastData(chartData);
            setForecastEstimate(Math.round(sumPred));
            setForecastTrend(sumPred > last30Sum ? 'up' : 'down');
            setModelTraining(false);
            showToast('success', 'LSTM model trained successfully.');
          }
        }, 100);
      } catch {
        setModelTraining(false); showToast('error', 'Model training failed.');
      }
    }, 100);
  };

  // ── Monte Carlo ────────────────────────────────────────
  const runMonteCarlo = () => {
    if (!selectedGoal) return;
    const expenses = transactions.filter(t => t.type === 'expense').map(t => t.amount);
    if (expenses.length < 10) { showToast('warning', 'Need 10+ expenses.'); return; }

    const dailyMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { dailyMap[t.date] = (dailyMap[t.date] || 0) + t.amount; });
    const dailyTotals = Object.values(dailyMap);
    const mean = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
    const variance = dailyTotals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyTotals.length;
    const std = Math.sqrt(variance) || 100;
    const income = user?.income || 45000;
    const daysLeft = Math.max(7, differenceInDays(parseISO(selectedGoal.targetDate), new Date()));

    const normal = (m, s) => {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * s + m;
    };

    let successes = 0;
    const finals = [];
    for (let r = 0; r < 500; r++) {
      let sim = 0;
      for (let d = 0; d < daysLeft; d++) sim += (income / 30) - Math.max(0, normal(mean, std));
      const total = selectedGoal.savedAmount + sim;
      finals.push(total);
      if (total >= selectedGoal.targetAmount) successes++;
    }
    setMonteCarloProb(Math.round((successes / 500) * 100));

    const min = Math.min(...finals), max = Math.max(...finals);
    const step = (max - min) / 20 || 1;
    const buckets = Array(20).fill(0).map((_, i) => ({ rMin: min + i * step, rMax: min + (i + 1) * step, count: 0 }));
    finals.forEach(v => { let bi = Math.floor((v - min) / step); if (bi >= 20) bi = 19; if (bi < 0) bi = 0; buckets[bi].count++; });
    setMcDistribution(buckets.map(b => ({ name: `${Math.round(b.rMin / 1000)}k`, frequency: b.count, isSuccess: b.rMax >= selectedGoal.targetAmount })));
    showToast('info', `Monte Carlo: ${Math.round((successes / 500) * 100)}% probability.`);
  };

  useEffect(() => { if (transactions.length >= 15) trainForecaster(); }, []);
  useEffect(() => { if (selectedGoal && transactions.length >= 10) runMonteCarlo(); }, [selectedGoal]);

  const heatmap = getHeatmapGrid();
  const weeks = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 w-full">

      {/* Heatmap */}
      <div className="glass-panel rounded-2xl p-5">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-5">Spending Heatmap (Last 365 Days)</p>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 min-w-[700px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div key={di} title={`${day.date}: ${settings.currency}${day.spend.toLocaleString()}`}
                    className={`h-2.5 w-2.5 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/30 ${day.intensity === 0 ? 'bg-slate-900' : day.intensity === 1 ? 'bg-indigo-900/60' : day.intensity === 2 ? 'bg-indigo-700' : day.intensity === 3 ? 'bg-violet-600' : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
          <span>Less</span>
          {['bg-slate-900', 'bg-indigo-900/60', 'bg-indigo-700', 'bg-violet-600', 'bg-cyan-400'].map((c, i) => (
            <div key={i} className={`h-2.5 w-2.5 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Stacked Area + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-5">Category Spend Trends (6 Months)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getStackedAreaData()}>
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${settings.currency}${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px' }} itemStyle={{ fontSize: '10px' }} formatter={(v, n) => [`${settings.currency}${v.toLocaleString()}`, n]} />
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={color} fill={color} fillOpacity={0.15} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-5">Category Radar Comparison</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData()}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#475569" fontSize={8} />
                <Radar name="Spending" dataKey="A" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LSTM Forecast + Monte Carlo */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LSTM */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-3">
          <div className="flex justify-between items-center mb-5">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">ML Expense Forecast (brain.js LSTM)</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Trains in-browser on your transaction history</p>
            </div>
            <button onClick={trainForecaster} disabled={modelTraining}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold disabled:opacity-40 transition-all">
              <RefreshCw className={`h-3 w-3 ${modelTraining ? 'animate-spin' : ''}`} /> Retrain
            </button>
          </div>

          {modelTraining ? (
            <div className="h-56 flex flex-col items-center justify-center gap-4">
              <Sparkles className="h-8 w-8 text-violet-400 animate-pulse" />
              <p className="text-xs text-slate-400 font-semibold tracking-widest animate-pulse">TRAINING NEURAL LAYERS...</p>
              <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${trainingProgress}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{trainingProgress}% Complete</span>
            </div>
          ) : forecastData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData}>
                    <XAxis dataKey="day" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px' }} itemStyle={{ fontSize: '10px' }} />
                    <Area dataKey="ConfidenceUpper" fill="#06B6D4" fillOpacity={0.06} stroke="none" />
                    <Area dataKey="ConfidenceLower" fill="#06B6D4" fillOpacity={0.06} stroke="none" />
                    <Line type="monotone" dataKey="Actual" stroke="#7C3AED" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Forecast" stroke="#06B6D4" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800 rounded-xl p-3.5">
                <span className="text-xs text-slate-400">Forecast next 30 days:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{settings.currency}{forecastEstimate.toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 border ${forecastTrend === 'down' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20' : 'bg-red-950 text-red-400 border-red-500/20'}`}>
                    {forecastTrend === 'down' ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
                    {forecastTrend === 'down' ? 'Saving trend' : 'Spending up'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <Sparkles className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-xs text-slate-500 max-w-xs">Add 15+ expense transactions to enable neural forecasting.</p>
            </div>
          )}
        </div>

        {/* Monte Carlo */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Monte Carlo Goal Solver</p>
              <p className="text-[9px] text-slate-500 mt-0.5">500 stochastic projection trials</p>
            </div>
            {goals.length > 1 && (
              <select value={selectedGoal?.id || ''} onChange={e => setSelectedGoal(goals.find(g => g.id === e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-400 focus:outline-none">
                {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>

          {selectedGoal ? (
            <div className="space-y-4">
              <div className="flex items-center justify-around bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="text-center">
                  <span className={`font-bold text-3xl ${monteCarloProb > 70 ? 'text-emerald-400' : monteCarloProb > 40 ? 'text-amber-400' : 'text-red-500'}`}>
                    {monteCarloProb}%
                  </span>
                  <p className="text-[9px] text-slate-500 uppercase mt-1 font-semibold">Likelihood</p>
                </div>
                <div className="h-10 w-px bg-slate-800" />
                <div className="text-left space-y-1 text-[10px] text-slate-400">
                  <p>Target: <strong className="text-white">{settings.currency}{selectedGoal.targetAmount?.toLocaleString()}</strong></p>
                  <p>Saved: <strong className="text-emerald-400">{settings.currency}{selectedGoal.savedAmount?.toLocaleString()}</strong></p>
                  <p>Deadline: <strong className="text-white">{selectedGoal.targetDate}</strong></p>
                </div>
              </div>

              {mcDistribution.length > 0 && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider mb-2">Probability Distribution</p>
                  <div className="h-28 flex items-end justify-between gap-0.5 border-b border-slate-800">
                    {mcDistribution.map((b, i) => (
                      <div key={i} title={`${b.name}: ${b.frequency} runs`}
                        className="flex-1 rounded-t-sm transition-all"
                        style={{ height: `${(b.frequency / 60) * 100}%`, backgroundColor: b.isSuccess ? '#10B981' : '#F59E0B', opacity: b.isSuccess ? 0.7 : 0.35 }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                    <span>Min</span>
                    <span className="text-emerald-400">→ Goal target</span>
                    <span>Max</span>
                  </div>
                </div>
              )}

              <button onClick={runMonteCarlo}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                <Target className="h-3.5 w-3.5" /> Re-run 500 Simulations
              </button>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Target className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-xs text-slate-500">Create a goal to enable Monte Carlo simulations.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
