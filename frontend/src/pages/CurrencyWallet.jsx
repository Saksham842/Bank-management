import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Wallet, Plus, X, ArrowRightLeft, RefreshCw, History,
  Activity, DollarSign, TrendingUp, ChevronRight
} from 'lucide-react';
import {
  getWallets, createWallet, updateWallet, deleteWallet,
  getRates, convertCurrency, executeConversion,
  getTransactions, getAnalytics
} from '../api/currency.api';

const TAB_KEYS = ['wallets', 'converter', 'transactions', 'analytics'];
const TAB_LABELS = ['Wallets', 'Converter', 'History', 'Analytics'];
const TAB_ICONS = [Wallet, ArrowRightLeft, History, Activity];

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'SAR', 'CNY'];
const FLAGS = { USD: '🇺🇸', INR: '🇮🇳', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', AED: '🇦🇪', SAR: '🇸🇦', CNY: '🇨🇳' };
const SYMBOLS = { USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ', SAR: '﷼', CNY: '¥' };
const COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6', '#14B8A6', '#F97316', '#6B7280'];

const formatCurrency = (val, currency = 'INR') => {
  if (!val && val !== 0) return '';
  const sym = SYMBOLS[currency] || currency;
  if (val >= 10000000) return sym + (val / 10000000).toFixed(2) + (currency === 'INR' ? 'Cr' : 'M');
  if (val >= 100000) return sym + (val / 100000).toFixed(2) + (currency === 'INR' ? 'L' : 'K');
  return sym + val.toLocaleString('en-IN');
};

const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

export const CurrencyWalletPage = () => {
  const { showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('wallets');
  const [wallets, setWallets] = useState([]);
  const [ratesData, setRatesData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [walletForm, setWalletForm] = useState({ currency: 'USD', balance: '', accountName: '', notes: '' });

  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('INR');
  const [convertAmount, setConvertAmount] = useState(100);
  const [convertResult, setConvertResult] = useState(null);

  const [execFrom, setExecFrom] = useState('USD');
  const [execTo, setExecTo] = useState('INR');
  const [execAmount, setExecAmount] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [w, r, t, a] = await Promise.all([
        getWallets().catch(() => []),
        getRates().catch(() => null),
        getTransactions().catch(() => []),
        getAnalytics().catch(() => null)
      ]);
      setWallets(w);
      setRatesData(r);
      setTransactions(t);
      setAnalytics(a);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const handleConvert = async () => {
    try {
      const res = await convertCurrency(convertFrom, convertTo, convertAmount);
      setConvertResult(res);
    } catch (e) {
      showToast('Conversion failed', 'error');
    }
  };

  const handleExecute = async () => {
    try {
      await executeConversion(execFrom, execTo, parseFloat(execAmount));
      showToast('Conversion executed', 'success');
      setExecAmount('');
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Execution failed', 'error');
    }
  };

  const handleSaveWallet = async () => {
    try {
      const data = {
        ...walletForm,
        balance: parseFloat(walletForm.balance) || 0
      };
      if (editingWallet) {
        await updateWallet(editingWallet._id, data);
        showToast('Wallet updated', 'success');
      } else {
        await createWallet(data);
        showToast('Wallet created', 'success');
      }
      setShowWalletModal(false);
      setEditingWallet(null);
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Error saving wallet', 'error');
    }
  };

  const handleDeleteWallet = async (id) => {
    if (!window.confirm('Delete this wallet?')) return;
    try {
      await deleteWallet(id);
      showToast('Wallet deleted', 'success');
      loadData();
    } catch { showToast('Error deleting', 'error'); }
  };

  const totalInINR = analytics?.totalValueINR || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-emerald-400" /> Multi-Currency Wallet & Forex
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage foreign currency holdings, convert, and track forex transactions</p>
          </div>
          {activeTab === 'wallets' && (
            <button onClick={() => { setEditingWallet(null); setWalletForm({ currency: 'USD', balance: '', accountName: '', notes: '' }); setShowWalletModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg mt-3 md:mt-0">
              <Plus size={18} /> Add Wallet
            </button>
          )}
        </motion.div>

        <motion.div variants={item} className="flex flex-wrap gap-1 mb-6 p-1 bg-gray-800 rounded-xl w-fit">
          {TAB_KEYS.map((key, i) => {
            const Icon = TAB_ICONS[i];
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                <Icon size={16} /> {TAB_LABELS[i]}
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'wallets' && (
            <motion.div key="wallets" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              {wallets.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Currency Wallets</h3>
                  <p className="text-gray-400 mb-4">Add wallets for different currencies to manage your multi-currency holdings.</p>
                  <button onClick={() => { setEditingWallet(null); setWalletForm({ currency: 'USD', balance: '', accountName: '', notes: '' }); setShowWalletModal(true); }}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">Create Your First Wallet</button>
                </motion.div>
              )}

              {wallets.length > 0 && (
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map(w => {
                    const sym = SYMBOLS[w.currency] || w.currency;
                    return (
                      <div key={w._id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl">{FLAGS[w.currency] || '💱'}</div>
                            <div>
                              <h3 className="font-semibold">{w.currency}</h3>
                              <div className="text-xs text-gray-400">{w.accountName || 'General'}</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingWallet(w); setWalletForm({ currency: w.currency, balance: w.balance.toString(), accountName: w.accountName || '', notes: w.notes || '' }); setShowWalletModal(true); }}
                              className="p-1 hover:bg-gray-700 rounded"><ChevronRight size={14} className="text-gray-400" /></button>
                            <button onClick={() => handleDeleteWallet(w._id)} className="p-1 hover:bg-red-900/50 rounded"><X size={14} className="text-red-400" /></button>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">{sym}{w.balance.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-gray-500 mt-1">≈ {formatCurrency(Math.round((ratesData?.rates?.[w.currency]?.['INR'] || 0) * w.balance))} INR</div>
                        {w.notes && <div className="text-xs text-gray-500 mt-2">{w.notes}</div>}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {wallets.length > 0 && analytics?.byCurrency && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-2">Portfolio Value: {formatCurrency(totalInINR)} INR</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.byCurrency}
                          cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="inINR"
                          label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}>
                          {analytics.byCurrency.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'converter' && (
            <motion.div key="converter" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-emerald-400" /> Currency Converter</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">From</label>
                        <select value={convertFrom} onChange={e => setConvertFrom(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                          {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">To</label>
                        <select value={convertTo} onChange={e => setConvertTo(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                          {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Amount</label>
                      <input type="number" value={convertAmount} onChange={e => setConvertAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-semibold text-lg" />
                    </div>
                    <button onClick={handleConvert}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-2">
                      <RefreshCw size={16} /> Convert
                    </button>
                    {convertResult && (
                      <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(convertResult.amount, convertResult.from)} = {formatCurrency(convertResult.result, convertResult.to)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Rate: 1 {convertResult.from} = {convertResult.rate} {convertResult.to}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Execute Conversion</h3>
                  <p className="text-gray-400 text-sm mb-4">Convert between your existing wallets</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">From Wallet</label>
                        <select value={execFrom} onChange={e => setExecFrom(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                          {wallets.map(w => <option key={w.currency} value={w.currency}>{FLAGS[w.currency]} {w.currency} ({formatCurrency(w.balance, w.currency)})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">To Wallet</label>
                        <select value={execTo} onChange={e => setExecTo(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                          {CURRENCIES.filter(c => c !== execFrom).map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Amount to Convert ({execFrom})</label>
                      <input type="number" value={execAmount} onChange={e => setExecAmount(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                    <button onClick={handleExecute}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-2">
                      <ArrowRightLeft size={16} /> Execute Conversion
                    </button>
                  </div>
                </div>
              </motion.div>

              {ratesData && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Live Exchange Rates (Base: USD)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {CURRENCIES.filter(c => c !== 'USD').map(c => (
                      <div key={c} className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <div className="text-lg">{FLAGS[c]} {c}</div>
                        <div className="text-sm font-semibold text-emerald-400">{ratesData.rates?.USD?.[c] || '—'}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div key="transactions" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4">
              {transactions.length === 0 ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Transactions</h3>
                  <p className="text-gray-400">Execute a currency conversion to see your history.</p>
                </motion.div>
              ) : (
                transactions.map((t, i) => (
                  <motion.div key={t._id || i} variants={item}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-900/50 flex items-center justify-center">
                          <ArrowRightLeft size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{FLAGS[t.fromCurrency]} {t.fromCurrency}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium">{FLAGS[t.toCurrency]} {t.toCurrency}</span>
                          </div>
                          <div className="text-xs text-gray-400">{format(new Date(t.date), 'dd MMM yyyy HH:mm')} · Rate: {t.exchangeRate}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-red-400">-{formatCurrency(t.fromAmount, t.fromCurrency)}</div>
                        <div className="text-sm text-emerald-400">+{formatCurrency(t.toAmount, t.toCurrency)}</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div key="analytics" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              {!analytics || wallets.length === 0 ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Add Wallets for Analytics</h3>
                  <p className="text-gray-400">Create currency wallets to see your portfolio breakdown.</p>
                </motion.div>
              ) : (
                <>
                  <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Total Wallets</div>
                      <div className="text-3xl font-bold text-purple-400">{analytics.totalWallets}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Total Value (INR)</div>
                      <div className="text-3xl font-bold text-emerald-400">{formatCurrency(analytics.totalValueINR)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs mb-1">Transactions</div>
                      <div className="text-3xl font-bold text-blue-400">{analytics.recentTransactions?.length || 0}</div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4">Currency Allocation</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={analytics.byCurrency}
                              cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="inINR"
                              label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}>
                              {analytics.byCurrency.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4">Balance by Currency</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.byCurrency}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="currency" stroke="#4B5563" />
                            <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'K'} stroke="#4B5563" />
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                            <Bar dataKey="inINR" radius={[4, 4, 0, 0]}>
                              {analytics.byCurrency.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Portfolio Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-gray-400 border-b border-gray-700"><th className="text-left py-2">Currency</th><th className="text-right py-2">Balance</th><th className="text-right py-2">Value (INR)</th><th className="text-right py-2">Allocation</th></tr></thead>
                        <tbody>
                          {analytics.byCurrency.map((c, i) => (
                            <tr key={c.currency} className="border-b border-gray-700/50">
                              <td className="py-2"><span className="mr-2">{c.flag}</span>{c.currency} <span className="text-gray-500">{c.symbol}</span></td>
                              <td className="text-right py-2">{c.balance.toLocaleString('en-IN')}</td>
                              <td className="text-right py-2 text-emerald-400">{formatCurrency(c.inINR)}</td>
                              <td className="text-right py-2">
                                <div className="flex items-center justify-end gap-2">
                                  <span>{c.percentage}%</span>
                                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showWalletModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowWalletModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingWallet ? 'Edit Wallet' : 'Add Currency Wallet'}</h3>
                <button onClick={() => setShowWalletModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Currency</label>
                  <select value={walletForm.currency} onChange={e => setWalletForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c} — {SYMBOLS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Balance</label>
                  <input type="number" step="0.01" value={walletForm.balance} onChange={e => setWalletForm(f => ({ ...f, balance: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Account Name (optional)</label>
                  <input value={walletForm.accountName} onChange={e => setWalletForm(f => ({ ...f, accountName: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. Travel Card, NRE Account" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Notes</label>
                  <textarea value={walletForm.notes} onChange={e => setWalletForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowWalletModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSaveWallet} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                  {editingWallet ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
