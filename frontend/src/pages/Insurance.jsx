import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addDays, isBefore, differenceInDays } from 'date-fns';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Shield, Plus, X, Calendar, Clock, AlertTriangle, ChevronRight,
  Activity, FileText, Users, DollarSign, TrendingUp
} from 'lucide-react';
import {
  getPolicies, createPolicy, updatePolicy, deletePolicy,
  getInsuranceSummary, getCoverageAnalysis
} from '../api/insurance.api';

const POLICY_TYPES = ['Life', 'Term', 'Health', 'Motor', 'Home', 'Travel', 'Critical Illness', 'Disability', 'Annuity', 'Other'];
const FREQUENCIES = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'];
const STATUS_OPTS = ['active', 'lapsed', 'claimed', 'cancelled'];

const TYPE_ICONS = {
  Life: '🛡️', Term: '📋', Health: '🏥', Motor: '🚗', Home: '🏠',
  Travel: '✈️', 'Critical Illness': '⚠️', Disability: '♿', Annuity: '💵', Other: '📄'
};
const TYPE_COLORS = {
  Life: '#7C3AED', Term: '#3B82F6', Health: '#10B981', Motor: '#F59E0B', Home: '#EC4899',
  Travel: '#06B6D4', 'Critical Illness': '#EF4444', Disability: '#8B5CF6', Annuity: '#14B8A6', Other: '#6B7280'
};

const TAB_KEYS = ['overview', 'policies', 'coverage', 'calendar'];
const TAB_LABELS = ['Overview', 'Policies', 'Coverage', 'Calendar'];
const TAB_ICONS = [Activity, Shield, FileText, Calendar];
const CHART_COLORS = Object.values(TYPE_COLORS);

const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  return '₹' + val.toLocaleString('en-IN');
};

const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

const STATUS_BADGE = {
  active: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  lapsed: 'bg-red-900/50 text-red-400 border-red-700',
  claimed: 'bg-blue-900/50 text-blue-400 border-blue-700',
  cancelled: 'bg-gray-700 text-gray-400 border-gray-600'
};

export const InsurancePage = () => {
  const { showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('overview');
  const [policies, setPolicies] = useState([]);
  const [summary, setSummary] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    policyType: 'Life', policyName: '', policyNumber: '', provider: '',
    sumAssured: '', premium: '', premiumFrequency: 'yearly',
    startDate: '', endDate: '', nextDueDate: '', status: 'active',
    nominees: [], beneficiaries: [], notes: ''
  });
  const [nomineeInput, setNomineeInput] = useState({ name: '', relation: '', share: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        getPolicies().catch(() => []),
        getInsuranceSummary().catch(() => null),
        getCoverageAnalysis().catch(() => null)
      ]);
      setPolicies(p);
      setSummary(s);
      setCoverage(c);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        sumAssured: parseFloat(form.sumAssured) || 0,
        premium: parseFloat(form.premium) || 0
      };
      if (!data.policyName || !data.provider || !data.startDate) {
        showToast('Name, provider, and start date are required', 'error');
        return;
      }
      if (editing) {
        await updatePolicy(editing._id, data);
        showToast('Policy updated', 'success');
      } else {
        await createPolicy(data);
        showToast('Policy added', 'success');
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Error saving policy', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this insurance policy?')) return;
    try {
      await deletePolicy(id);
      showToast('Policy deleted', 'success');
      loadData();
    } catch { showToast('Error deleting', 'error'); }
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      policyType: p.policyType, policyName: p.policyName, policyNumber: p.policyNumber || '',
      provider: p.provider, sumAssured: p.sumAssured.toString(), premium: p.premium.toString(),
      premiumFrequency: p.premiumFrequency, startDate: format(new Date(p.startDate), 'yyyy-MM-dd'),
      endDate: p.endDate ? format(new Date(p.endDate), 'yyyy-MM-dd') : '',
      nextDueDate: p.nextDueDate ? format(new Date(p.nextDueDate), 'yyyy-MM-dd') : '',
      status: p.status, nominees: p.nominees || [], beneficiaries: p.beneficiaries || [], notes: p.notes || ''
    });
    setShowModal(true);
  };

  const addNominee = () => {
    if (!nomineeInput.name || !nomineeInput.relation || !nomineeInput.share) return;
    setForm(f => ({ ...f, nominees: [...f.nominees, { ...nomineeInput, share: parseInt(nomineeInput.share) }] }));
    setNomineeInput({ name: '', relation: '', share: '' });
  };

  const removeNominee = (i) => {
    setForm(f => ({ ...f, nominees: f.nominees.filter((_, idx) => idx !== i) }));
  };

  const totalPremium = summary?.totalPremium || 0;
  const totalSumAssured = summary?.totalSumAssured || 0;
  const upcomingPayments = summary?.upcoming || [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">

        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-emerald-400" /> Insurance Manager
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track policies, coverage, premiums, and renewals</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ policyType: 'Life', policyName: '', policyNumber: '', provider: '', sumAssured: '', premium: '', premiumFrequency: 'yearly', startDate: '', endDate: '', nextDueDate: '', status: 'active', nominees: [], beneficiaries: [], notes: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors mt-3 md:mt-0">
            <Plus size={18} /> Add Policy
          </button>
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
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">

              {policies.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Insurance Policies</h3>
                  <p className="text-gray-400 mb-4">Add your life, health, motor, and other insurance policies to track coverage and premiums.</p>
                  <button onClick={() => { setEditing(null); setForm({ policyType: 'Life', policyName: '', policyNumber: '', provider: '', sumAssured: '', premium: '', premiumFrequency: 'yearly', startDate: '', endDate: '', nextDueDate: '', status: 'active', nominees: [], beneficiaries: [], notes: '' }); setShowModal(true); }}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">Add Your First Policy</button>
                </motion.div>
              )}

              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Policies</div>
                    <div className="text-2xl font-bold">{summary.totalPolicies}</div>
                    <div className="text-xs text-gray-500"><span className="text-emerald-400">{summary.active}</span> active · <span className="text-red-400">{summary.lapsed}</span> lapsed</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Total Sum Assured</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalSumAssured)}</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Total Premium</div>
                    <div className="text-2xl font-bold text-amber-400">{formatCurrency(totalPremium)}</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Monthly Outgo</div>
                    <div className="text-2xl font-bold text-blue-400">{coverage ? formatCurrency(coverage.monthlyPremiumOutgo) : '—'}</div>
                  </motion.div>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Upcoming Payments</div>
                    <div className="text-2xl font-bold text-purple-400">{upcomingPayments.length}</div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {summary?.byType && (
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Coverage by Type</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={Object.entries(summary.byType).map(([k, v]) => ({ name: k, value: v.sumAssured }))}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {Object.keys(summary.byType).map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {Object.entries(summary.byType).map(([type, data], i) => (
                        <span key={type} className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                          {type} ({data.count})
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {upcomingPayments.length > 0 && (
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400" /> Upcoming Payments</h3>
                    <div className="space-y-2">
                      {upcomingPayments.slice(0, 5).map(p => (
                        <div key={p._id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{TYPE_ICONS[p.policyType] || '📄'}</span>
                            <div>
                              <div className="text-sm font-medium">{p.policyName}</div>
                              <div className="text-xs text-gray-400">{p.provider} · {format(new Date(p.nextDueDate), 'MMM dd, yyyy')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-amber-400">{formatCurrency(p.premium)}</div>
                            <div className="text-xs text-gray-500">{differenceInDays(new Date(p.nextDueDate), new Date()) > 0 ? `${differenceInDays(new Date(p.nextDueDate), new Date())} days` : 'Overdue'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'policies' && (
            <motion.div key="policies" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4">
              {policies.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Policies Yet</h3>
                  <p className="text-gray-400">Tap "Add Policy" to get started.</p>
                </motion.div>
              )}
              {policies.map(p => (
                <motion.div key={p._id} variants={item}
                  className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">{TYPE_ICONS[p.policyType] || '📄'}</div>
                      <div>
                        <h3 className="font-semibold">{p.policyName}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{p.provider}</span>
                          <span>·</span>
                          <span>{p.policyType}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs border ${STATUS_BADGE[p.status] || STATUS_BADGE.active}`}>{p.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-700 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
                      <button onClick={() => handleDelete(p._id)} className="p-1.5 hover:bg-red-900/50 rounded"><X size={16} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Sum Assured</span><div className="font-semibold text-emerald-400">{formatCurrency(p.sumAssured)}</div></div>
                    <div><span className="text-gray-400 text-xs">Premium</span><div className="font-semibold">{formatCurrency(p.premium)}/{p.premiumFrequency.replace('_', ' ')}</div></div>
                    <div><span className="text-gray-400 text-xs">Start</span><div className="font-semibold">{format(new Date(p.startDate), 'dd MMM yyyy')}</div></div>
                    <div><span className="text-gray-400 text-xs">Next Due</span><div className={`font-semibold ${p.nextDueDate && isBefore(new Date(p.nextDueDate), new Date()) ? 'text-red-400' : ''}`}>{p.nextDueDate ? format(new Date(p.nextDueDate), 'dd MMM yyyy') : '—'}</div></div>
                    <div><span className="text-gray-400 text-xs">Nominees</span><div className="font-semibold">{(p.nominees || []).length}</div></div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'coverage' && (
            <motion.div key="coverage" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {coverage ? (
                <>
                  <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                      <div className="text-gray-400 text-sm mb-1">Life Cover</div>
                      <div className="text-2xl font-bold text-purple-400">{formatCurrency(coverage.lifeCover)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                      <div className="text-gray-400 text-sm mb-1">Health Cover</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatCurrency(coverage.healthCover)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                      <div className="text-gray-400 text-sm mb-1">Monthly Premium Outgo</div>
                      <div className="text-2xl font-bold text-amber-400">{formatCurrency(coverage.monthlyPremiumOutgo)}</div>
                    </div>
                  </motion.div>

                  {coverage.gaps.length > 0 && (
                    <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> Coverage Gaps</h3>
                      <div className="space-y-3">
                        {coverage.gaps.map((gap, i) => (
                          <div key={i} className={`rounded-lg p-3 border ${gap.severity === 'critical' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-amber-900/20 border-amber-800 text-amber-300'}`}>
                            <div className="flex items-center gap-2 font-medium mb-1">
                              <span className={`w-2 h-2 rounded-full ${gap.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
                              {gap.type} — {gap.severity === 'critical' ? 'Critical' : 'Warning'}
                            </div>
                            <p className="text-sm opacity-90">{gap.message}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Recommendations</h3>
                    <ul className="space-y-2">
                      {coverage.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-emerald-400 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </>
              ) : (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Add Policies for Analysis</h3>
                  <p className="text-gray-400">Add insurance policies to see coverage analysis, gaps, and recommendations.</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div key="calendar" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {upcomingPayments.length > 0 ? (
                <>
                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400" /> Premium Payment Calendar</h3>
                    <div className="space-y-2">
                      {upcomingPayments.map(p => {
                        const daysUntil = differenceInDays(new Date(p.nextDueDate), new Date());
                        return (
                          <div key={p._id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[48px]">
                                <div className="text-lg font-bold">{format(new Date(p.nextDueDate), 'dd')}</div>
                                <div className="text-xs text-gray-400">{format(new Date(p.nextDueDate), 'MMM')}</div>
                              </div>
                              <span className="text-lg">{TYPE_ICONS[p.policyType] || '📄'}</span>
                              <div>
                                <div className="font-medium">{p.policyName}</div>
                                <div className="text-xs text-gray-400">{p.provider} · {p.policyType}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-amber-400">{formatCurrency(p.premium)}</div>
                              <div className={`text-xs ${daysUntil < 0 ? 'text-red-400' : daysUntil < 30 ? 'text-amber-400' : 'text-gray-400'}`}>
                                {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Due today' : `${daysUntil} days left`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Premium Timeline</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={upcomingPayments.map(p => ({
                          name: p.policyName.substring(0, 12) + '...',
                          premium: p.premium,
                          daysUntil: Math.max(0, differenceInDays(new Date(p.nextDueDate), new Date()))
                        })).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="name" stroke="#4B5563" fontSize={10} />
                          <YAxis tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'K'} stroke="#4B5563" />
                          <Tooltip formatter={(v) => [formatCurrency(v), 'Premium']} />
                          <Bar dataKey="premium" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </>
              ) : (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Upcoming Payments</h3>
                  <p className="text-gray-400">Add policies with due dates to see your payment calendar.</p>
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
                <h3 className="text-lg font-semibold">{editing ? 'Edit Policy' : 'Add Insurance Policy'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Type</label>
                  <select value={form.policyType} onChange={e => setForm(f => ({ ...f, policyType: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Policy Name</label>
                  <input value={form.policyName} onChange={e => setForm(f => ({ ...f, policyName: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. ICICI Pru iProtect Smart" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Provider</label>
                  <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. ICICI Prudential, LIC, HDFC Life" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">Policy Number</label>
                  <input value={form.policyNumber} onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Sum Assured (₹)</label>
                  <input type="number" value={form.sumAssured} onChange={e => setForm(f => ({ ...f, sumAssured: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Premium (₹)</label>
                  <input type="number" value={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Frequency</label>
                  <select value={form.premiumFrequency} onChange={e => setForm(f => ({ ...f, premiumFrequency: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Next Due Date</label>
                  <input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div className="mt-4 border-t border-gray-700 pt-4">
                <label className="text-gray-400 text-sm block mb-2">Nominees</label>
                {form.nominees.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-700/50 rounded px-3 py-1.5 mb-1.5 text-sm">
                    <span className="font-medium">{n.name}</span>
                    <span className="text-gray-400">({n.relation})</span>
                    <span className="text-gray-400">— {n.share}%</span>
                    <button onClick={() => removeNominee(i)} className="ml-auto p-0.5 hover:bg-gray-600 rounded"><X size={12} className="text-red-400" /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input value={nomineeInput.name} onChange={e => setNomineeInput(n => ({ ...n, name: e.target.value }))}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white" placeholder="Name" />
                  <input value={nomineeInput.relation} onChange={e => setNomineeInput(n => ({ ...n, relation: e.target.value }))}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white" placeholder="Relation" />
                  <input type="number" value={nomineeInput.share} onChange={e => setNomineeInput(n => ({ ...n, share: e.target.value }))}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white" placeholder="%" />
                  <button onClick={addNominee} className="p-1.5 bg-emerald-700 hover:bg-emerald-600 rounded"><Plus size={14} /></button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-gray-400 text-sm block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                  {editing ? 'Update' : 'Add Policy'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
