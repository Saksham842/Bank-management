import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Target, RefreshCw } from "lucide-react";

// ─── SIP Compound Growth Calculator ──────────────────────────────────────────
const calculateSIPCorpus = (monthlyAmount, annualReturn, years) => {
  const r = annualReturn / 100 / 12; // monthly rate
  const n = years * 12;
  if (r === 0) return monthlyAmount * n;
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
};

const formatCrore = (val) => {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)} L`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
};

const PRESET_GOALS = [
  { label: "Dream Home", emoji: "🏡", target: 5000000 },
  { label: "Child Education", emoji: "🎓", target: 2000000 },
  { label: "Retirement", emoji: "🌴", target: 30000000 },
  { label: "World Tour", emoji: "✈️", target: 500000 },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-violet-500/20 rounded-xl p-3 text-xs shadow-2xl">
      <p className="text-slate-400 mb-1.5 font-semibold">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">{formatCrore(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const InvestmentPredictor = ({ monthlyIncome = 45000, settings }) => {
  const [monthlyInvest, setMonthlyInvest] = useState(
    Math.round(monthlyIncome * 0.2)
  );
  const [cagr, setCagr] = useState(12);
  const [horizon, setHorizon] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const chartData = useMemo(() => {
    const data = [];
    for (let y = 0; y <= horizon; y++) {
      const base = calculateSIPCorpus(monthlyInvest, cagr, y);
      const bull = calculateSIPCorpus(monthlyInvest, cagr + 4, y); // +4% bull
      const bear = calculateSIPCorpus(monthlyInvest, Math.max(cagr - 5, 1), y); // -5% bear
      data.push({
        year: y === 0 ? "Now" : `Y${y}`,
        "Bull Case": Math.round(bull),
        "Expected": Math.round(base),
        "Bear Case": Math.round(bear),
      });
    }
    return data;
  }, [monthlyInvest, cagr, horizon]);

  const finalBase = calculateSIPCorpus(monthlyInvest, cagr, horizon);
  const finalBull = calculateSIPCorpus(monthlyInvest, cagr + 4, horizon);
  const finalBear = calculateSIPCorpus(monthlyInvest, Math.max(cagr - 5, 1), horizon);
  const totalInvested = monthlyInvest * horizon * 12;
  const wealthCreated = finalBase - totalInvested;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-panel rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Investment Predictor
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5">
              SIP growth with Monte Carlo bands
            </p>
          </div>
        </div>
        <span className="text-2xl font-heading font-black text-emerald-400 tracking-tight">
          {formatCrore(finalBase)}
        </span>
      </div>

      {/* Preset Goals */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_GOALS.map((g) => (
          <button
            key={g.label}
            onClick={() => setSelectedPreset(selectedPreset?.label === g.label ? null : g)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              selectedPreset?.label === g.label
                ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <span>{g.emoji}</span>
            {g.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-52 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="year"
              stroke="#475569"
              fontSize={8}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#475569"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCrore(v)}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            {selectedPreset && (
              <ReferenceLine
                y={selectedPreset.target}
                stroke="#06B6D4"
                strokeDasharray="4 4"
                label={{
                  value: `🎯 ${selectedPreset.emoji}`,
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#06B6D4",
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="Bull Case"
              stroke="#10B981"
              strokeWidth={1.5}
              fill="url(#bullGrad)"
              strokeDasharray="4 2"
            />
            <Area
              type="monotone"
              dataKey="Expected"
              stroke="#7C3AED"
              strokeWidth={2.5}
              fill="url(#baseGrad)"
            />
            <Area
              type="monotone"
              dataKey="Bear Case"
              stroke="#F59E0B"
              strokeWidth={1.5}
              fill="url(#bearGrad)"
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
            Monthly SIP
          </label>
          <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-2">
            <span className="text-slate-400 text-xs mr-1">₹</span>
            <input
              type="number"
              value={monthlyInvest}
              onChange={(e) => setMonthlyInvest(Math.max(500, Number(e.target.value)))}
              className="flex-1 bg-transparent text-white text-xs font-bold outline-none w-full"
              step={500}
              min={500}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
            CAGR %
          </label>
          <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-2">
            <input
              type="number"
              value={cagr}
              onChange={(e) => setCagr(Math.min(30, Math.max(1, Number(e.target.value))))}
              className="flex-1 bg-transparent text-white text-xs font-bold outline-none w-full"
              step={1}
              min={1}
              max={30}
            />
            <span className="text-slate-400 text-xs ml-1">%</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
            Horizon
          </label>
          <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-2">
            <input
              type="number"
              value={horizon}
              onChange={(e) => setHorizon(Math.min(40, Math.max(1, Number(e.target.value))))}
              className="flex-1 bg-transparent text-white text-xs font-bold outline-none w-full"
              step={1}
              min={1}
              max={40}
            />
            <span className="text-slate-400 text-xs ml-1">yr</span>
          </div>
        </div>
      </div>

      {/* Outcome cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-[9px] text-emerald-400/70 uppercase font-bold tracking-wider mb-1">
            🐂 Best
          </p>
          <p className="font-heading font-bold text-emerald-400 text-sm">
            {formatCrore(finalBull)}
          </p>
        </div>
        <div className="bg-violet-950/30 border border-violet-500/20 rounded-xl p-3 text-center">
          <p className="text-[9px] text-violet-400/70 uppercase font-bold tracking-wider mb-1">
            📈 Expected
          </p>
          <p className="font-heading font-bold text-violet-300 text-sm">
            {formatCrore(finalBase)}
          </p>
        </div>
        <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-[9px] text-amber-400/70 uppercase font-bold tracking-wider mb-1">
            🐻 Worst
          </p>
          <p className="font-heading font-bold text-amber-400 text-sm">
            {formatCrore(finalBear)}
          </p>
        </div>
      </div>

      {/* Wealth created footer */}
      <div className="mt-3 flex items-center justify-between bg-slate-950/40 border border-slate-800/60 rounded-xl p-3">
        <div>
          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">
            Total Invested
          </p>
          <p className="text-xs text-slate-300 font-bold mt-0.5">
            {formatCrore(totalInvested)}
          </p>
        </div>
        <div className="h-8 w-px bg-slate-800" />
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">
            Wealth Created
          </p>
          <p className="text-xs font-bold mt-0.5 text-emerald-400">
            +{formatCrore(wealthCreated)}
          </p>
        </div>
        <div className="h-8 w-px bg-slate-800" />
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">
            Returns
          </p>
          <p className="text-xs font-bold mt-0.5 text-cyan-400">
            {((wealthCreated / totalInvested) * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </motion.div>
  );
};
