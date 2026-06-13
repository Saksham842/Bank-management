import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Calculator, FileText, TrendingDown, PiggyBank, Plus, X,
  ChevronRight, AlertTriangle, CheckCircle, DollarSign
} from 'lucide-react';

const TAB_KEYS = ['calculator', 'comparison', 'deductions', 'summary'];
const TAB_LABELS = ['Calculator', 'Comparison', 'Deductions', 'Summary'];
const TAB_ICONS = [Calculator, FileText, PiggyBank, TrendingDown];

const CHART_COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444'];
const CESS_COLOR = '#EF4444';

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

const SECTION_LIMITS = {
  section80C: { label: '80C', max: 150000, desc: 'PPF, ELSS, EPF, NSC, Life Insurance, Tuition Fees' },
  section80D: { label: '80D', max: 25000, desc: 'Health Insurance Premium (self & family)' },
  section80E: { label: '80E', max: null, desc: 'Education Loan Interest (no upper limit)' },
  section80G: { label: '80G', max: null, desc: 'Donations to approved funds' },
  section80TTA: { label: '80TTA', max: 10000, desc: 'Savings Account Interest' },
  section80CCD: { label: '80CCD(1B)', max: 50000, desc: 'Additional NPS Contribution' },
};

const DEDUCTION_FIELDS = [
  { key: 'section80C', label: '80C', icon: '📈', color: '#7C3AED' },
  { key: 'section80D', label: '80D', icon: '🏥', color: '#0EA5E9' },
  { key: 'section80E', label: '80E', icon: '🎓', color: '#10B981' },
  { key: 'section80G', label: '80G', icon: '🤝', color: '#F59E0B' },
  { key: 'section80TTA', label: '80TTA', icon: '🏦', color: '#EC4899' },
  { key: 'section80CCD', label: '80CCD(1B)', icon: '💼', color: '#06B6D4' },
  { key: 'hra', label: 'HRA', icon: '🏠', color: '#8B5CF6' },
  { key: 'lta', label: 'LTA', icon: '✈️', color: '#14B8A6' },
  { key: 'homeLoanInterest', label: 'Home Loan Interest', icon: '🏘️', color: '#F97316' },
];

export const TaxPlannerPage = () => {
  const { showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('calculator');
  const [grossIncome, setGrossIncome] = useState(1200000);
  const [deductions, setDeductions] = useState({
    section80C: 0, section80D: 0, section80E: 0, section80G: 0,
    section80TTA: 0, section80CCD: 0, hra: 0, lta: 0, standardDeduction: 50000, homeLoanInterest: 0
  });
  const [result, setResult] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCalculation = useCallback(async () => {
    setLoading(true);
    try {
      const { calculateTax, getTaxSuggestions } = await import('../api/tax.api');
      const data = { grossIncome, deductions };
      const [res, sug] = await Promise.all([
        calculateTax(data),
        getTaxSuggestions(data).catch(() => null)
      ]);
      setResult(res);
      setSuggestions(sug);
    } catch {
      // Fallback local calculation
      const OLD = [{ min: 0, max: 250000, rate: 0 }, { min: 250000, max: 500000, rate: 0.05 }, { min: 500000, max: 1000000, rate: 0.20 }, { min: 1000000, max: Infinity, rate: 0.30 }];
      const NEW = [{ min: 0, max: 300000, rate: 0 }, { min: 300000, max: 700000, rate: 0.05 }, { min: 700000, max: 1000000, rate: 0.10 }, { min: 1000000, max: 1200000, rate: 0.15 }, { min: 1200000, max: 1500000, rate: 0.20 }, { min: 1500000, max: Infinity, rate: 0.30 }];
      const compute = (slabs, ti) => { let t = 0; for (const s of slabs) { if (ti > s.min) t += (Math.min(ti, s.max) - s.min) * s.rate; } return t; };
      const oldDed = Math.min(deductions.section80C, 150000) + Math.min(deductions.section80D, 25000) + (deductions.section80E || 0) + (deductions.section80G || 0) + Math.min(deductions.section80TTA, 10000) + (deductions.section80CCD || 0) + (deductions.hra || 0) + (deductions.lta || 0) + (deductions.standardDeduction || 50000) + (deductions.homeLoanInterest || 0);
      const oldTI = Math.max(0, grossIncome - oldDed);
      const newTI = Math.max(0, grossIncome - ((deductions.section80CCD || 0) + (deductions.standardDeduction || 50000)));
      const oldTax = compute(OLD, oldTI);
      const newTax = compute(NEW, newTI);
      const finalOld = grossIncome <= 500000 ? Math.max(0, oldTax - 12500) : oldTax;
      const finalNew = grossIncome <= 700000 ? Math.max(0, newTax - 25000) : newTax;
      setResult({
        grossIncome, oldRegime: { taxableIncome: oldTI, totalDeductions: oldDed, tax: Math.round(oldTax), totalLiability: Math.round(finalOld * 1.04) }, newRegime: { taxableIncome: newTI, allowedDeductions: (deductions.section80CCD || 0) + (deductions.standardDeduction || 50000), tax: Math.round(newTax), totalLiability: Math.round(finalNew * 1.04) }, recommendedRegime: finalOld > finalNew ? 'new' : 'old', savings: Math.abs(Math.round(finalOld - finalNew)), effectiveRateOld: Math.round((finalOld * 1.04 / grossIncome) * 10000) / 100, effectiveRateNew: Math.round((finalNew * 1.04 / grossIncome) * 10000) / 100
      });
    }
    setLoading(false);
  }, [grossIncome, deductions]);

  useEffect(() => { runCalculation(); }, [grossIncome]);

  const setDeduction = (key, val) => {
    setDeductions(d => ({ ...d, [key]: Math.max(0, parseFloat(val) || 0) }));
  };

  const incomeRange = Math.max(100000, Math.ceil(grossIncome / 500000) * 500000);

  const totalDeduction = Object.values(deductions).reduce((s, v) => s + (v || 0), 0);

  const pieData = result ? [
    { name: 'Old Regime Tax', value: result.oldRegime.totalLiability },
    { name: 'New Regime Tax', value: result.newRegime.totalLiability }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">

        <motion.div variants={item} className="flex items-center gap-3 mb-6">
          <Calculator className="w-7 h-7 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold">Tax Planner & Estimator</h1>
            <p className="text-gray-400 text-sm">Compare old vs new regime, optimize deductions, plan tax savings</p>
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
          {activeTab === 'calculator' && (
            <motion.div key="calculator" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Income & Deductions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Gross Annual Income (₹)</label>
                    <input type="number" value={grossIncome} onChange={e => setGrossIncome(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-lg font-semibold focus:outline-none focus:border-purple-500" />
                    <input type="range" min={0} max={5000000} step={100000} value={grossIncome}
                      onChange={e => setGrossIncome(parseInt(e.target.value))}
                      className="w-full mt-2 accent-purple-500" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>₹0</span><span>₹25L</span><span>₹50L+</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-gray-400 text-sm block mb-2">Deductions (₹)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {DEDUCTION_FIELDS.map(f => (
                        <div key={f.key} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                          <span className="text-lg">{f.icon}</span>
                          <input type="number" value={deductions[f.key]} onChange={e => setDeduction(f.key, e.target.value)}
                            className="w-full bg-transparent text-white text-sm focus:outline-none" placeholder={f.label} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-gray-400">
                      Total Deductions: <span className="text-emerald-400 font-semibold">{formatCurrency(totalDeduction)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {result && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Old Regime</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Gross Income</span><span>{formatCurrency(grossIncome)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Total Deductions</span><span className="text-emerald-400">{formatCurrency(result.oldRegime.totalDeductions)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Taxable Income</span><span className="text-amber-400">{formatCurrency(result.oldRegime.taxableIncome)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Income Tax</span><span>{formatCurrency(result.oldRegime.tax)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Health & Edu Cess (4%)</span><span className="text-red-400">{formatCurrency(result.oldRegime.cess || Math.round(result.oldRegime.tax * 0.04))}</span></div>
                      <div className="flex justify-between py-2 text-lg font-bold"><span>Total Liability</span><span className={result.oldRegime.totalLiability > result.newRegime.totalLiability ? 'text-red-400' : 'text-emerald-400'}>{formatCurrency(result.oldRegime.totalLiability)}</span></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Effective rate: {result.effectiveRateOld}%</div>
                  </div>

                  <div className={`bg-gray-800 rounded-xl p-6 border ${result.recommendedRegime === 'new' ? 'border-emerald-700' : 'border-purple-700'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">New Regime</h3>
                      {result.recommendedRegime === 'new' && <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded-full border border-emerald-700">Recommended</span>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Gross Income</span><span>{formatCurrency(grossIncome)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Allowed Deductions</span><span className="text-emerald-400">{formatCurrency(result.newRegime.allowedDeductions || 0)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Taxable Income</span><span className="text-amber-400">{formatCurrency(result.newRegime.taxableIncome)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Income Tax</span><span>{formatCurrency(result.newRegime.tax)}</span></div>
                      <div className="flex justify-between py-1 border-b border-gray-700"><span className="text-gray-400">Health & Edu Cess (4%)</span><span className="text-red-400">{formatCurrency(result.newRegime.cess || Math.round(result.newRegime.tax * 0.04))}</span></div>
                      <div className="flex justify-between py-2 text-lg font-bold"><span>Total Liability</span><span className={result.newRegime.totalLiability < result.oldRegime.totalLiability ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(result.newRegime.totalLiability)}</span></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Effective rate: {result.effectiveRateNew}%</div>
                  </div>

                </motion.div>
              )}

              {result && result.savings > 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-emerald-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-400">Potential Savings: {formatCurrency(result.savings)}</h3>
                      <p className="text-gray-400 text-sm">Choose the <strong className="text-white">{result.recommendedRegime === 'new' ? 'New' : 'Old'}</strong> tax regime to save {formatCurrency(result.savings)} in taxes.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'comparison' && (
            <motion.div key="comparison" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              {result && (
                <>
                  <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-sm mb-1">Old Regime</div>
                      <div className="text-3xl font-bold text-red-400">{formatCurrency(result.oldRegime.totalLiability)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-sm mb-1">New Regime</div>
                      <div className="text-3xl font-bold text-emerald-400">{formatCurrency(result.newRegime.totalLiability)}</div>
                      {result.recommendedRegime === 'new' && <div className="text-xs text-emerald-500 mt-1">✅ Recommended</div>}
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-sm mb-1">Difference</div>
                      <div className={`text-3xl font-bold ${result.savings > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>{formatCurrency(result.savings)}</div>
                      <div className="text-xs text-gray-500 mt-1">You save by choosing {result.recommendedRegime} regime</div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4">Tax Comparison Chart</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Gross Income', old: grossIncome, new: grossIncome },
                            { name: 'Deductions', old: result.oldRegime.totalDeductions, new: result.newRegime.allowedDeductions || 0 },
                            { name: 'Taxable', old: result.oldRegime.taxableIncome, new: result.newRegime.taxableIncome },
                            { name: 'Tax', old: result.oldRegime.totalLiability, new: result.newRegime.totalLiability }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#4B5563" fontSize={11} />
                            <YAxis tickFormatter={v => '₹' + (v / 100000).toFixed(0) + 'L'} stroke="#4B5563" />
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                            <Bar dataKey="old" name="Old Regime" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                            <Bar dataKey="new" name="New Regime" fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.8} />
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4">Slab-wise Tax Breakdown</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {result.breakdown?.map((b, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${b.regime === 'old' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                              <span className="text-gray-300">{b.regime === 'old' ? 'Old' : 'New'} — {b.slab}</span>
                            </div>
                            <div className="flex gap-3 text-xs">
                              <span className="text-gray-400">₹{(b.amount / 100000).toFixed(1)}L × {b.rate}%</span>
                              <span className="font-medium">{formatCurrency(b.tax)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Old Regime Slabs (FY 2025-26)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-gray-400 border-b border-gray-700"><th className="text-left py-2">Income Slab</th><th className="text-right py-2">Rate</th><th className="text-right py-2">Your Tax</th></tr></thead>
                        <tbody>
                          {[
                            { slab: 'Up to ₹2.5L', rate: '0%', tax: 0 },
                            { slab: '₹2.5L – ₹5L', rate: '5%', tax: Math.max(0, Math.min(result.oldRegime.taxableIncome, 500000) - 250000) * 0.05 },
                            { slab: '₹5L – ₹10L', rate: '20%', tax: Math.max(0, Math.min(result.oldRegime.taxableIncome, 1000000) - 500000) * 0.20 },
                            { slab: 'Above ₹10L', rate: '30%', tax: Math.max(0, result.oldRegime.taxableIncome - 1000000) * 0.30 },
                          ].map((r, i) => (
                            <tr key={i} className="border-b border-gray-700/50">
                              <td className="py-2">{r.slab}</td>
                              <td className="text-right py-2 text-gray-300">{r.rate}</td>
                              <td className="text-right py-2">{formatCurrency(Math.round(r.tax))}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold"><td className="py-2">Cess (4%)</td><td></td><td className="text-right text-red-400">{formatCurrency(result.oldRegime.cess || Math.round(result.oldRegime.tax * 0.04))}</td></tr>
                          <tr className="font-bold text-lg"><td className="py-2">Total</td><td></td><td className="text-right text-red-400">{formatCurrency(result.oldRegime.totalLiability)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <h3 className="text-lg font-semibold mb-4 mt-6">New Regime Slabs (FY 2025-26)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-gray-400 border-b border-gray-700"><th className="text-left py-2">Income Slab</th><th className="text-right py-2">Rate</th><th className="text-right py-2">Your Tax</th></tr></thead>
                        <tbody>
                          {[
                            { slab: 'Up to ₹3L', rate: '0%', tax: 0 },
                            { slab: '₹3L – ₹7L', rate: '5%', tax: Math.max(0, Math.min(result.newRegime.taxableIncome, 700000) - 300000) * 0.05 },
                            { slab: '₹7L – ₹10L', rate: '10%', tax: Math.max(0, Math.min(result.newRegime.taxableIncome, 1000000) - 700000) * 0.10 },
                            { slab: '₹10L – ₹12L', rate: '15%', tax: Math.max(0, Math.min(result.newRegime.taxableIncome, 1200000) - 1000000) * 0.15 },
                            { slab: '₹12L – ₹15L', rate: '20%', tax: Math.max(0, Math.min(result.newRegime.taxableIncome, 1500000) - 1200000) * 0.20 },
                            { slab: 'Above ₹15L', rate: '30%', tax: Math.max(0, result.newRegime.taxableIncome - 1500000) * 0.30 },
                          ].map((r, i) => (
                            <tr key={i} className="border-b border-gray-700/50">
                              <td className="py-2">{r.slab}</td>
                              <td className="text-right py-2 text-gray-300">{r.rate}</td>
                              <td className="text-right py-2">{formatCurrency(Math.round(r.tax))}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold"><td className="py-2">Cess (4%)</td><td></td><td className="text-right text-red-400">{formatCurrency(result.newRegime.cess || Math.round(result.newRegime.tax * 0.04))}</td></tr>
                          <tr className="font-bold text-lg"><td className="py-2">Total</td><td></td><td className="text-right text-emerald-400">{formatCurrency(result.newRegime.totalLiability)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'deductions' && (
            <motion.div key="deductions" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-xs">Total Deductions Claimed</div>
                  <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalDeduction)}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-xs">80C Used / Limit</div>
                  <div className="text-2xl font-bold text-purple-400">{formatCurrency(deductions.section80C)} <span className="text-base text-gray-500">/ {formatCurrency(150000)}</span></div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-xs">80D Used / Limit</div>
                  <div className="text-2xl font-bold text-blue-400">{formatCurrency(deductions.section80D)} <span className="text-base text-gray-500">/ {formatCurrency(25000)}</span></div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-xs">Potential Savings from Suggestions</div>
                  <div className="text-2xl font-bold text-amber-400">{formatCurrency(suggestions?.totalPotentialSaving || 0)}</div>
                </div>
              </motion.div>

              <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Section-wise Deduction Tracker</h3>
                <div className="space-y-4">
                  {DEDUCTION_FIELDS.map(f => {
                    const limit = SECTION_LIMITS[f.key]?.max;
                    const value = deductions[f.key] || 0;
                    const pct = limit ? Math.min(100, (value / limit) * 100) : value > 0 ? 100 : 0;
                    return (
                      <div key={f.key} className="flex items-center gap-4">
                        <span className="text-lg w-8">{f.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{f.label} <span className="text-gray-400 font-normal">({SECTION_LIMITS[f.key]?.desc})</span></span>
                            <span>{formatCurrency(value)}{limit ? ` / ${formatCurrency(limit)}` : ''}</span>
                          </div>
                          {limit && (
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: f.color }}></div>
                            </div>
                          )}
                        </div>
                        <input type="range" min={0} max={limit || 500000} step={1000} value={value}
                          onChange={e => setDeduction(f.key, parseInt(e.target.value))}
                          className="w-24 accent-purple-500" />
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {suggestions?.suggestions?.length > 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-amber-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> Optimization Suggestions</h3>
                  <div className="space-y-3">
                    {suggestions.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                        <div className="w-6 h-6 rounded-full bg-amber-900/50 flex items-center justify-center text-xs text-amber-400 font-bold">{i + 1}</div>
                        <div className="flex-1">
                          <div className="font-medium">Section {s.section}</div>
                          <div className="text-sm text-gray-400">{s.options}</div>
                          {s.remaining && <div className="text-sm mt-1">Remaining limit: <span className="text-amber-400 font-semibold">{formatCurrency(s.remaining)}</span></div>}
                          {s.potentialSaving && <div className="text-sm">Potential saving: <span className="text-emerald-400 font-semibold">{formatCurrency(s.potentialSaving)}</span></div>}
                        </div>
                      </div>
                    ))}
                    <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-3 text-sm">
                      Total potential saving by optimizing deductions: <strong className="text-emerald-400">{formatCurrency(suggestions.totalPotentialSaving)}</strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div key="summary" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {result ? (
                <>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Tax Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">Gross Income</span><span className="font-semibold">{formatCurrency(grossIncome)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">Total Deductions</span><span className="font-semibold text-emerald-400">{formatCurrency(totalDeduction)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">Old Regime Tax</span><span className="font-semibold text-red-400">{formatCurrency(result.oldRegime.totalLiability)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">New Regime Tax</span><span className="font-semibold text-emerald-400">{formatCurrency(result.newRegime.totalLiability)}</span></div>
                        <div className="flex justify-between py-2 text-lg font-bold">
                          <span>Recommended</span>
                          <span className={result.recommendedRegime === 'new' ? 'text-emerald-400' : 'text-purple-400'}>
                            {result.recommendedRegime === 'new' ? 'New Regime' : 'Old Regime'} — Save {formatCurrency(result.savings)}
                          </span>
                        </div>
                      </div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[
                              { name: 'Old Regime', value: Math.max(1, result.oldRegime.totalLiability) },
                              { name: 'New Regime', value: Math.max(1, result.newRegime.totalLiability) }
                            ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              <Cell fill="#EF4444" />
                              <Cell fill="#10B981" />
                            </Pie>
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Key Ratios</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">{result.effectiveRateOld}%</div>
                        <div className="text-xs text-gray-400">Old Regime Effective Rate</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{result.effectiveRateNew}%</div>
                        <div className="text-xs text-gray-400">New Regime Effective Rate</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-amber-400">{grossIncome > 0 ? Math.round((totalDeduction / grossIncome) * 100) : 0}%</div>
                        <div className="text-xs text-gray-400">Deduction Rate</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(result.savings)}</div>
                        <div className="text-xs text-gray-400">Potential Savings</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                    <ul className="space-y-2">
                      {result.recommendedRegime === 'new' ? (
                        <>
                          <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> New Regime is better for you by <strong>{formatCurrency(result.savings)}</strong>. You don't need to track deductions.</li>
                          <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> Still claim NPS (80CCD(1B)) up to ₹50K — allowed in new regime too.</li>
                          <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> Ensure standard deduction of ₹50K is applied.</li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> Old Regime is better. Maximize your 80C deductions to save more.</li>
                          <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> Consider additional NPS contribution under 80CCD(1B) for extra ₹50K deduction.</li>
                          <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> Track HRA, LTA, and home loan interest for maximum benefit.</li>
                        </>
                      )}
                      <li className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">•</span> Set up auto-pay for advance tax if total liability exceeds ₹10,000.</li>
                    </ul>
                  </motion.div>
                </>
              ) : (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Calculator className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Enter your income to see the summary</h3>
                  <p className="text-gray-400">Go to the Calculator tab to get started.</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
