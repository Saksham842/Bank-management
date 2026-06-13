import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Users, Plus, X, ArrowRightLeft, DollarSign, Receipt,
  Activity, UserCheck, ChevronRight, Handshake
} from 'lucide-react';
import {
  getGroups, createGroup, updateGroup, deleteGroup,
  getExpenses, createExpense, deleteExpense,
  getBalances, createSettlement, getSettlements
} from '../api/split.api';

const TAB_KEYS = ['groups', 'expenses', 'balances', 'settlements'];
const TAB_LABELS = ['Groups', 'Expenses', 'Balances', 'Settlements'];
const TAB_ICONS = [Users, Receipt, DollarSign, Handshake];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  return '₹' + val.toLocaleString('en-IN');
};

const COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6', '#14B8A6', '#F97316'];

const container = {
  hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = {
  hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }
};

export const ExpenseSplitterPage = () => {
  const { showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', members: [''] });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', paidBy: '', splitType: 'equal', category: '', notes: '', shares: [] });
  const [customShares, setCustomShares] = useState([]);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleForm, setSettleForm] = useState({ fromMember: '', toMember: '', amount: '', notes: '' });

  const loadGroups = useCallback(async () => {
    try {
      const g = await getGroups();
      setGroups(g);
      if (!selectedGroup && g.length > 0) setSelectedGroup(g[0]._id);
    } catch {}
  }, [selectedGroup]);

  const loadGroupData = useCallback(async () => {
    if (!selectedGroup) return;
    setLoading(true);
    try {
      const [e, b, s] = await Promise.all([
        getExpenses(selectedGroup).catch(() => []),
        getBalances(selectedGroup).catch(() => null),
        getSettlements(selectedGroup).catch(() => [])
      ]);
      setExpenses(e);
      setBalances(b);
      setSettlements(s);
    } catch {}
    setLoading(false);
  }, [selectedGroup]);

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadGroupData(); }, [selectedGroup, groups]);

  const handleSaveGroup = async () => {
    try {
      const members = groupForm.members.filter(m => m.trim()).map(name => ({ name: name.trim() }));
      if (members.length < 1) { showToast('At least one member required', 'error'); return; }
      const data = { name: groupForm.name, description: groupForm.description, members };
      if (editingGroup) {
        await updateGroup(editingGroup._id, data);
        showToast('Group updated', 'success');
      } else {
        const g = await createGroup(data);
        setSelectedGroup(g._id);
        showToast('Group created', 'success');
      }
      setShowGroupModal(false);
      setEditingGroup(null);
      loadGroups();
    } catch (e) { showToast(e?.response?.data?.message || 'Error saving group', 'error'); }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Delete this group and ALL its expenses?')) return;
    try { await deleteGroup(id); if (selectedGroup === id) setSelectedGroup(null); loadGroups(); showToast('Group deleted', 'success'); }
    catch { showToast('Error deleting', 'error'); }
  };

  const handleSaveExpense = async () => {
    try {
      const group = groups.find(g => g._id === selectedGroup);
      const data = {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        paidBy: expenseForm.paidBy,
        splitType: expenseForm.splitType,
        category: expenseForm.category,
        notes: expenseForm.notes,
        shares: expenseForm.splitType !== 'equal' ? customShares : undefined
      };
      if (!data.description || !data.amount || !data.paidBy) { showToast('Description, amount, and payer required', 'error'); return; }
      if (!group?.members?.find(m => m.name === data.paidBy)) { showToast('Payer must be a group member', 'error'); return; }
      await createExpense(selectedGroup, data);
      showToast('Expense added', 'success');
      setShowExpenseModal(false);
      loadGroupData();
    } catch (e) { showToast(e?.response?.data?.message || 'Error adding expense', 'error'); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await deleteExpense(id); loadGroupData(); showToast('Expense deleted', 'success'); }
    catch { showToast('Error deleting', 'error'); }
  };

  const handleSettle = async () => {
    try {
      if (!settleForm.fromMember || !settleForm.toMember || !settleForm.amount) { showToast('All fields required', 'error'); return; }
      await createSettlement(selectedGroup, { ...settleForm, amount: parseFloat(settleForm.amount) });
      showToast('Settlement recorded', 'success');
      setShowSettleModal(false);
      setSettleForm({ fromMember: '', toMember: '', amount: '', notes: '' });
      loadGroupData();
    } catch (e) { showToast(e?.response?.data?.message || 'Error recording settlement', 'error'); }
  };

  const openExpenseModal = () => {
    const group = groups.find(g => g._id === selectedGroup);
    setExpenseForm({ description: '', amount: '', paidBy: group?.members?.[0]?.name || '', splitType: 'equal', category: '', notes: '', shares: [] });
    setCustomShares(group?.members?.map(m => ({ memberName: m.name, percentage: 0, shares: 0 })) || []);
    setShowExpenseModal(true);
  };

  const group = groups.find(g => g._id === selectedGroup);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-400" /> Expense Splitter
            </h1>
            <p className="text-gray-400 text-sm mt-1">Split expenses with friends, track balances, settle up</p>
          </div>
          <div className="flex gap-2 mt-3 md:mt-0">
            {activeTab === 'groups' && (
              <button onClick={() => { setEditingGroup(null); setGroupForm({ name: '', description: '', members: [''] }); setShowGroupModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"><Plus size={18} /> New Group</button>
            )}
            {activeTab === 'expenses' && selectedGroup && (
              <button onClick={openExpenseModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"><Plus size={18} /> Add Expense</button>
            )}
            {activeTab === 'balances' && selectedGroup && balances?.payouts?.length > 0 && (
              <button onClick={() => { setSettleForm({ fromMember: balances.payouts[0]?.from || '', toMember: balances.payouts[0]?.to || '', amount: balances.payouts[0]?.amount?.toString() || '', notes: '' }); setShowSettleModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"><Handshake size={18} /> Record Settlement</button>
            )}
          </div>
        </motion.div>

        {groups.length > 0 && (
          <motion.div variants={item} className="flex flex-wrap gap-2 mb-4">
            {groups.map(g => (
              <button key={g._id} onClick={() => setSelectedGroup(g._id)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${selectedGroup === g._id ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
                {g.name}
              </button>
            ))}
          </motion.div>
        )}

        <motion.div variants={item} className="flex flex-wrap gap-1 mb-6 p-1 bg-gray-800 rounded-xl w-fit">
          {TAB_KEYS.map((key, i) => {
            const Icon = TAB_ICONS[i];
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                <Icon size={16} /> {TAB_LABELS[i]}
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'groups' && (
            <motion.div key="groups" variants={container} initial="hidden" animate="show" className="space-y-4">
              {groups.length === 0 && (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Split Groups</h3>
                  <p className="text-gray-400 mb-4">Create a group to start splitting expenses with friends, roommates, or travel buddies.</p>
                  <button onClick={() => { setEditingGroup(null); setGroupForm({ name: '', description: '', members: [''] }); setShowGroupModal(true); }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Create Your First Group</button>
                </motion.div>
              )}
              {groups.map(g => (
                <motion.div key={g._id} variants={item} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400"><Users size={20} /></div>
                      <div>
                        <h3 className="font-semibold text-lg">{g.name}</h3>
                        <div className="text-xs text-gray-400 flex gap-3 mt-0.5">
                          <span>{g.members?.length || 0} members</span>
                          <span>Total spent: {formatCurrency(g.totalSpent || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingGroup(g); setGroupForm({ name: g.name, description: g.description || '', members: g.members.map(m => m.name) }); setShowGroupModal(true); }}
                        className="p-1.5 hover:bg-gray-700 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
                      <button onClick={() => handleDeleteGroup(g._id)} className="p-1.5 hover:bg-red-900/50 rounded"><X size={16} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.members?.map((m, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded text-xs">
                        <UserCheck size={12} className="text-gray-400" /> {m.name}
                      </span>
                    ))}
                  </div>
                  {g.description && <p className="text-sm text-gray-500 mt-2">{g.description}</p>}
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div key="expenses" variants={container} initial="hidden" animate="show" className="space-y-4">
              {!selectedGroup ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Select a Group</h3>
                  <p className="text-gray-400">Choose a group from the top to see its expenses.</p>
                </motion.div>
              ) : expenses.length === 0 ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Expenses Yet</h3>
                  <p className="text-gray-400 mb-4">Add the first expense for "{group?.name}".</p>
                  <button onClick={openExpenseModal} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"><Plus size={18} className="inline mr-1" /> Add Expense</button>
                </motion.div>
              ) : (
                expenses.map(e => (
                  <motion.div key={e._id} variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400"><Receipt size={16} /></div>
                        <div>
                          <h4 className="font-medium">{e.description}</h4>
                          <div className="text-xs text-gray-400 flex gap-2 mt-0.5">
                            <span>{format(new Date(e.date), 'dd MMM')}</span>
                            <span>{e.paidBy} paid</span>
                            {e.category && <span>· {e.category}</span>}
                            <span>· {e.splitType}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-amber-400">{formatCurrency(e.amount)}</div>
                        <button onClick={() => handleDeleteExpense(e._id)} className="text-xs text-red-400 hover:underline mt-1">Remove</button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.shares?.map((s, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${s.memberName === e.paidBy ? 'bg-emerald-900/30 text-emerald-400' : 'bg-gray-700 text-gray-300'}`}>
                          {s.memberName}: {formatCurrency(s.amount)}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'balances' && (
            <motion.div key="balances" variants={container} initial="hidden" animate="show" className="space-y-6">
              {!selectedGroup || !balances ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Balance Data</h3>
                  <p className="text-gray-400">Add expenses to see balances.</p>
                </motion.div>
              ) : (
                <>
                  <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs">Total Spent</div>
                      <div className="text-2xl font-bold text-blue-400">{formatCurrency(balances.totalSpent)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs">Members</div>
                      <div className="text-2xl font-bold text-purple-400">{balances.memberCount}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="text-gray-400 text-xs">Pending Settlements</div>
                      <div className="text-2xl font-bold text-emerald-400">{balances.payouts?.length || 0}</div>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Member Balances</h3>
                    <div className="space-y-3">
                      {balances.balances.map((b, i) => (
                        <div key={b.name} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                              {b.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{b.name}</span>
                          </div>
                          <span className={`font-semibold text-lg ${b.net > 0 ? 'text-emerald-400' : b.net < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {b.net > 0 ? '+' : ''}{formatCurrency(b.net)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {balances.payouts?.length > 0 && (
                    <motion.div variants={item} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-emerald-400" /> Suggested Payouts</h3>
                      <div className="space-y-3">
                        {balances.payouts.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-red-400">{p.from}</span>
                              <ArrowRightLeft size={16} className="text-gray-500" />
                              <span className="font-medium text-emerald-400">{p.to}</span>
                            </div>
                            <span className="font-bold text-lg text-amber-400">{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => { setSettleForm({ fromMember: balances.payouts[0]?.from || '', toMember: balances.payouts[0]?.to || '', amount: balances.payouts[0]?.amount?.toString() || '', notes: '' }); setShowSettleModal(true); }}
                        className="mt-4 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-2">
                        <Handshake size={16} /> Record a Settlement
                      </button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'settlements' && (
            <motion.div key="settlements" variants={container} initial="hidden" animate="show" className="space-y-4">
              {!selectedGroup ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Handshake className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Select a Group</h3>
                </motion.div>
              ) : settlements.length === 0 ? (
                <motion.div variants={item} className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                  <Handshake className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Settlements Yet</h3>
                  <p className="text-gray-400">Record settlements when someone pays back.</p>
                </motion.div>
              ) : (
                settlements.map(s => (
                  <motion.div key={s._id} variants={item} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Handshake size={16} className="text-emerald-400" />
                        <div>
                          <span className="text-red-400 font-medium">{s.fromMember}</span>
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="text-emerald-400 font-medium">{s.toMember}</span>
                          <div className="text-xs text-gray-500">{format(new Date(s.date), 'dd MMM yyyy')}{s.notes ? ` · ${s.notes}` : ''}</div>
                        </div>
                      </div>
                      <span className="font-bold text-lg text-amber-400">{formatCurrency(s.amount)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showGroupModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowGroupModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingGroup ? 'Edit Group' : 'New Split Group'}</h3>
                <button onClick={() => setShowGroupModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Group Name</label>
                  <input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. Goa Trip, Roommates" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Description</label>
                  <input value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Optional" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Members</label>
                  {groupForm.members.map((m, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={m} onChange={e => { const copy = [...groupForm.members]; copy[i] = e.target.value; setGroupForm(f => ({ ...f, members: copy })); }}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Member name" />
                      {groupForm.members.length > 1 && (
                        <button onClick={() => setGroupForm(f => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }))}
                          className="p-2 hover:bg-red-900/50 rounded"><X size={16} className="text-red-400" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setGroupForm(f => ({ ...f, members: [...f.members, ''] }))}
                    className="text-sm text-blue-400 hover:underline flex items-center gap-1"><Plus size={14} /> Add Member</button>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowGroupModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSaveGroup} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">{editingGroup ? 'Update' : 'Create Group'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpenseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowExpenseModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Expense</h3>
                <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Description" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Amount" />
                  <select value={expenseForm.paidBy} onChange={e => setExpenseForm(f => ({ ...f, paidBy: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    {group?.members?.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={expenseForm.splitType} onChange={e => setExpenseForm(f => ({ ...f, splitType: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    <option value="equal">Equal Split</option>
                    <option value="percentage">By Percentage</option>
                    <option value="shares">By Shares</option>
                    <option value="custom">Custom Amounts</option>
                  </select>
                  <input value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Category (optional)" />
                </div>
                {expenseForm.splitType !== 'equal' && (
                  <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                    <label className="text-gray-400 text-xs">Split Details</label>
                    {group?.members?.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm w-20 text-gray-300">{m.name}</span>
                        <input type="number" placeholder={expenseForm.splitType === 'percentage' ? '%' : expenseForm.splitType === 'shares' ? 'Shares' : 'Amount'}
                          onChange={e => {
                            const copy = [...customShares];
                            copy[i] = { ...copy[i], [expenseForm.splitType === 'percentage' ? 'percentage' : expenseForm.splitType === 'shares' ? 'shares' : 'amount']: parseFloat(e.target.value) || 0 };
                            setCustomShares(copy);
                          }}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                      </div>
                    ))}
                  </div>
                )}
                <textarea value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} placeholder="Notes (optional)" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSaveExpense} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Add Expense</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowSettleModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Record Settlement</h3>
                <button onClick={() => setShowSettleModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">From</label>
                    <select value={settleForm.fromMember} onChange={e => setSettleForm(f => ({ ...f, fromMember: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                      {group?.members?.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">To</label>
                    <select value={settleForm.toMember} onChange={e => setSettleForm(f => ({ ...f, toMember: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                      {group?.members?.filter(m => m.name !== settleForm.fromMember).map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Amount (₹)</label>
                  <input type="number" value={settleForm.amount} onChange={e => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Notes</label>
                  <input value={settleForm.notes} onChange={e => setSettleForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Paid via GPay / Cash" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowSettleModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleSettle} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">Record Settlement</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
