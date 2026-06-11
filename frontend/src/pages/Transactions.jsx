import React, { useState, useRef, useContext, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus, Download, Upload, Edit3, Trash2, Clock, Sparkles, AlertTriangle,
  FileText, Camera, Wand2
} from 'lucide-react';
import { TransactionsModals } from '../components/transactions/TransactionsModals';
import { decodeMerchantAsync } from '../utils/merchantDecoder';

// ── NLP keyword map (mirrors App.jsx) ──────────────────────
const NLP_KEYWORD_MAPS = {
  Food: ['zomato', 'swiggy', 'restaurant', 'cafe', 'pizza', 'burger', 'grocery', 'supermarket', 'hyatt', 'starbucks', 'mcdonalds', 'kfc', 'food', 'dining'],
  Transport: ['uber', 'ola', 'petrol', 'fuel', 'metro', 'bus', 'rapido', 'taxi', 'railway', 'flight', 'airline', 'hp', 'bpcl', 'indianoil'],
  Shopping: ['amazon', 'flipkart', 'mall', 'store', 'myntra', 'clothing', 'lifestyle', 'electronics', 'apple', 'croma', 'nykaa'],
  Bills: ['electricity', 'wifi', 'broadband', 'recharge', 'dth', 'jio', 'airtel', 'water', 'gas', 'insurance', 'subscription', 'lic'],
  Health: ['pharmacy', 'hospital', 'doctor', 'medplus', 'apollo', 'netmeds', 'clinic', 'medicine', 'dental'],
  Entertainment: ['netflix', 'spotify', 'prime', 'movie', 'pvr', 'inox', 'bookmyshow', 'hotstar', 'gaming', 'pub']
};

const CATEGORY_COLORS = {
  Food: '#F59E0B', Transport: '#3B82F6', Shopping: '#EC4899',
  Bills: '#10B981', Health: '#EF4444', Entertainment: '#8B5CF6'
};

const autoCategory = (merchant) => {
  const lower = merchant.toLowerCase();
  for (const [cat, words] of Object.entries(NLP_KEYWORD_MAPS)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return 'Shopping';
};

const parseSMS = async (text) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/nlp/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rawText: text }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      const d = data.data;
      return {
        amount: d.amount || 0,
        merchant: d.merchant || 'Unknown Merchant',
        category: d.category || 'Other',
        type: d.type === 'CREDIT' ? 'income' : 'expense',
        date: d.date || format(new Date(), 'yyyy-MM-dd'),
        notes: `AI: ${d.confidence ? Math.round(d.confidence * 100) + '%' : 'parsed'}`
      };
    }
  } catch (_) {}

  // Fallback parsing
  const textLower = text.toLowerCase();
  let type = 'expense';
  let amount = 0;
  let merchant = 'Unknown Merchant';

  const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)/i);
  if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));

  if (['credited', 'received', 'refund', 'deposit', 'earned', 'salary', 'credit'].some(w => textLower.includes(w))) type = 'income';

  for (const kw of ['at ', 'to ', 'from ', 'vpa ']) {
    const match = text.match(new RegExp(`${kw}([a-z0-9 ]{3,20})(?:on|ref|bal|\\.| |$)`, 'i'));
    if (match?.[1]) { merchant = match[1].trim(); break; }
  }

  if (merchant === 'Unknown Merchant') {
    for (const [, words] of Object.entries(NLP_KEYWORD_MAPS)) {
      for (const w of words) {
        if (textLower.includes(w)) { merchant = w.charAt(0).toUpperCase() + w.slice(1); break; }
      }
    }
  }

  const date = format(new Date(), 'yyyy-MM-dd');

  return {
    amount: amount || 0, merchant,
    category: type === 'income' ? 'Salary' : autoCategory(merchant),
    type, date, notes: 'Fallback parse'
  };
};

// ── Component ───────────────────────────────────────────────
export const Transactions = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, settings, showToast } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('add');
  const [form, setForm] = useState({ amount: '', merchant: '', category: 'Shopping', type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [selectedTx, setSelectedTx] = useState(null);
  const [smsInput, setSmsInput] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [sortKey, setSortKey] = useState('date');
  const [page, setPage] = useState(1);
  const [auditTx, setAuditTx] = useState(null);
  const fileRef = useRef(null);
  const PAGE_SIZE = 15;

  // Feature 2: PDF Import modal
  const [showPDFModal, setShowPDFModal] = useState(false);
  // Feature 6: Receipt Scan modal
  const [showScanModal, setShowScanModal] = useState(false);
  // Feature 3: Merchant decode cache
  const [decodedMerchants, setDecodedMerchants] = useState({});
  const [decodingId, setDecodingId] = useState(null);

  const handleDecodeMerchant = useCallback(async (tx) => {
    if (decodedMerchants[tx.id]) return; // already decoded
    setDecodingId(tx.id);
    try {
      const result = await decodeMerchantAsync(tx.merchant);
      setDecodedMerchants(prev => ({ ...prev, [tx.id]: result }));
    } catch (_) {}
    finally { setDecodingId(null); }
  }, [decodedMerchants]);

  const handleBulkImport = (txns) => {
    txns.forEach(t => addTransaction(t));
    showToast('success', `Imported ${txns.length} transactions from PDF!`);
    setActiveTab('ledger');
  };

  const handleReceiptSave = (tx) => {
    addTransaction(tx);
    showToast('success', `Receipt saved: ${tx.merchant}`);
    setActiveTab('ledger');
  };

  const setMerchant = (val) => setForm(f => ({ ...f, merchant: val, category: autoCategory(val) }));

  const handleSMS = async (e) => {
    e.preventDefault();
    if (!smsInput.trim()) return;
    const p = await parseSMS(smsInput);
    setForm({ amount: p.amount.toString(), merchant: p.merchant, category: p.category, type: p.type, date: p.date, notes: p.notes });
    showToast('info', 'Statement parsed successfully.');
    setSmsInput('');
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file || !window.Tesseract) { showToast('error', 'OCR unavailable.'); return; }
    setOcrProgress(0);
    try {
      const worker = await window.Tesseract.createWorker({ logger: m => m.status === 'recognizing' && setOcrProgress(Math.round(m.progress * 100)) });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setOcrText(text);
      setOcrProgress(null);
      const p = await parseSMS(text);
      setForm({ amount: p.amount?.toString() || '', merchant: p.merchant || '', category: p.category, type: p.type, date: p.date, notes: 'Extracted via OCR.' });
      showToast('success', 'Receipt scanned successfully.');
    } catch {
      setOcrProgress(null);
      showToast('error', 'OCR scan failed.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.merchant) { showToast('error', 'Amount and Merchant are required.'); return; }
    const payload = { ...form, amount: parseFloat(form.amount) };
    selectedTx ? updateTransaction({ ...payload, id: selectedTx.id }) : addTransaction(payload);
    setForm({ amount: '', merchant: '', category: 'Shopping', type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    setSelectedTx(null);
    setActiveTab('ledger');
  };

  const startEdit = (tx) => {
    setSelectedTx(tx);
    setForm({ amount: tx.amount.toString(), merchant: tx.merchant, category: tx.category, type: tx.type, date: tx.date, notes: tx.notes || '' });
    setActiveTab('add');
  };

  const exportExcel = () => {
    if (!window.XLSX || transactions.length === 0) return;
    const ws = window.XLSX.utils.json_to_sheet(transactions.map(t => ({ Date: t.date, Merchant: t.merchant, Category: t.category, Amount: t.amount, Type: t.type, Notes: t.notes })));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    window.XLSX.writeFile(wb, `LedgerPro_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    showToast('success', 'Excel exported.');
  };

  const exportPDF = () => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(124, 58, 237);
    doc.text('LedgerPro Statement', 14, 20);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 27);
    let y = 36;
    doc.setFontSize(9); doc.setTextColor(0);
    ['Date', 'Merchant', 'Category', 'Type', 'Amount'].forEach((h, i) => doc.text(h, 14 + i * 38, y));
    y += 6;
    transactions.slice(0, 35).forEach(t => {
      if (y > 275) { doc.addPage(); y = 20; }
      [t.date, t.merchant.substring(0, 16), t.category, t.type, `${settings.currency}${t.amount}`].forEach((v, i) => doc.text(String(v), 14 + i * 38, y));
      y += 6;
    });
    doc.save(`LedgerPro_${format(new Date(), 'yyyyMMdd')}.pdf`);
    showToast('success', 'PDF exported.');
  };

  const filtered = transactions
    .filter(t => !search || t.merchant.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .filter(t => filterCat === 'All' || t.category === filterCat)
    .filter(t => filterType === 'All' || t.type === filterType)
    .sort((a, b) => sortKey === 'amount' ? b.amount - a.amount : b.date.localeCompare(a.date));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5 w-full">
      {/* Tabs + Export buttons */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          {[['add', 'Add / Edit'], ['ledger', `Ledger (${transactions.length})`]].map(([tab, label]) => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'ledger') setSelectedTx(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === tab ? 'bg-violet-600/20 text-white border border-violet-500/30' : 'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Feature 6: Receipt Scan */}
          <button onClick={() => setShowScanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-950/40 border border-pink-500/30 text-pink-300 hover:text-white hover:bg-pink-950/60 rounded-lg text-xs font-semibold transition-all">
            <Camera className="h-3.5 w-3.5" /> Scan Receipt
          </button>
          {/* Feature 2: PDF Import */}
          <button onClick={() => setShowPDFModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/40 border border-blue-500/30 text-blue-300 hover:text-white hover:bg-blue-950/60 rounded-lg text-xs font-semibold transition-all">
            <FileText className="h-3.5 w-3.5" /> Import PDF
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {activeTab === 'add' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: SMS Parser + OCR */}
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">NLP SMS / Statement Parser</p>
              <form onSubmit={handleSMS} className="space-y-3">
                <textarea rows={3} value={smsInput} onChange={e => setSmsInput(e.target.value)}
                  placeholder="Paste bank SMS or statement text here..."
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-mono resize-none" />
                <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> Parse Statement
                </button>
              </form>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Receipt OCR Scanner</p>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleOCR} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-28 border border-dashed border-slate-700 hover:border-violet-500 bg-slate-950/30 hover:bg-slate-900/30 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all">
                <Upload className="h-8 w-8 text-slate-500 group-hover:text-violet-400 transition-all" />
                <span className="text-xs text-slate-500 font-light">Upload receipt image (JPG/PNG)</span>
              </button>
              {ocrProgress !== null && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Scanning via Tesseract...</span><span>{ocrProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all" style={{ width: `${ocrProgress}%` }} />
                  </div>
                </div>
              )}
              {ocrText && (
                <details className="mt-3 text-[10px] font-mono text-slate-500 bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 cursor-pointer">
                  <summary className="text-slate-400 font-sans font-medium mb-1">Raw extracted text</summary>
                  <p className="whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{ocrText}</p>
                </details>
              )}
            </div>
          </div>

          {/* Right: Manual Form */}
          <div className="lg:col-span-3">
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-5">
                {selectedTx ? 'Edit Transaction' : 'Manual Entry'}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Amount ({settings.currency})</label>
                    <input type="number" step="any" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00" className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: e.target.value === 'income' ? 'Income' : 'Shopping' }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Merchant / Description</label>
                  <input type="text" value={form.merchant} onChange={e => setMerchant(e.target.value)}
                    placeholder="e.g. Zomato, Amazon, Netflix"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} disabled={form.type === 'income'}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none disabled:opacity-50">
                      {form.type === 'income'
                        ? <option value="Income">Income / Salary</option>
                        : Object.keys(NLP_KEYWORD_MAPS).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes..."
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none" />
                </div>

                <div className="flex gap-3 pt-2 border-t border-slate-800 mt-4">
                  {selectedTx && (
                    <button type="button" onClick={() => { setSelectedTx(null); setForm({ amount: '', merchant: '', category: 'Shopping', type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), notes: '' }); }}
                      className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all">
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide hover:opacity-90 transition-all shadow-lg shadow-violet-900/30">
                    {selectedTx ? 'Update Transaction' : 'Log Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 border border-slate-900 rounded-xl p-3.5">
            <input type="text" placeholder="Search ledger..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500" />
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none">
              <option value="All">All Categories</option>
              {Object.keys(NLP_KEYWORD_MAPS).map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Income">Income</option>
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none">
              <option value="All">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none">
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
            </select>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-5 font-semibold">Date</th>
                    <th className="py-4 px-5 font-semibold">Merchant</th>
                    <th className="py-4 px-5 font-semibold">Category</th>
                    <th className="py-4 px-5 font-semibold text-right">Amount</th>
                    <th className="py-4 px-5 font-semibold text-center">Version</th>
                    <th className="py-4 px-5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  <AnimatePresence initial={false}>
                    {paginated.length > 0 ? paginated.map(t => (
                      <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="hover:bg-slate-950/30 transition-all">
                        <td className="py-3.5 px-5 text-slate-400 font-mono">{t.date}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-start gap-1.5">
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate max-w-[160px]">{t.merchant}</p>
                              {/* Feature 3: Plain-English decoded merchant name */}
                              {decodedMerchants[t.id] ? (
                                <p className="text-[9px] text-violet-400 font-medium mt-0.5 flex items-center gap-1">
                                  <Wand2 className="h-2.5 w-2.5" />
                                  {decodedMerchants[t.id].name}
                                </p>
                              ) : (
                                t.notes && <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{t.notes}</p>
                              )}
                            </div>
                            {/* Decode button */}
                            {!decodedMerchants[t.id] && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDecodeMerchant(t); }}
                                disabled={decodingId === t.id}
                                title="Decode merchant name"
                                className="flex-shrink-0 mt-0.5 h-5 w-5 flex items-center justify-center rounded bg-slate-800 text-slate-500 hover:text-violet-400 hover:bg-slate-700 transition-all disabled:opacity-40"
                              >
                                {decodingId === t.id
                                  ? <span className="h-2.5 w-2.5 rounded-full border border-violet-400 border-t-transparent animate-spin block" />
                                  : <Wand2 className="h-2.5 w-2.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                            style={{ backgroundColor: `${CATEGORY_COLORS[t.category] || '#4F46E5'}1A`, borderColor: `${CATEGORY_COLORS[t.category] || '#4F46E5'}40`, color: CATEGORY_COLORS[t.category] || '#4F46E5' }}>
                            {t.category}
                          </span>
                        </td>
                        <td className={`py-3.5 px-5 text-right font-bold font-mono ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {t.type === 'income' ? '+' : '-'}{settings.currency}{t.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {(t.version || 1) > 1 ? (
                            <button onClick={() => setAuditTx(t)}
                              className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all">
                              <Clock className="h-2.5 w-2.5" /> v{t.version}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">v1</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => startEdit(t)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )) : (
                      <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-500">No transactions matched filters.</td></tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-slate-950/60 px-5 py-3.5 border-t border-slate-800">
                <span className="text-[10px] text-slate-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-semibold rounded-lg disabled:opacity-40">← Prev</button>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-semibold rounded-lg disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <TransactionsModals
        auditTx={auditTx} setAuditTx={setAuditTx}
        showPDFModal={showPDFModal} setShowPDFModal={setShowPDFModal}
        handleBulkImport={handleBulkImport}
        showScanModal={showScanModal} setShowScanModal={setShowScanModal}
        handleReceiptSave={handleReceiptSave}
        settings={settings}
      />
    </div>
  );
};
