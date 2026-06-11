import { useState, useEffect } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { ReceiptScanner } from '../nlp/ReceiptScanner';
import { useLocalCategorize } from '../../hooks/useNLP';
import { Sparkles } from 'lucide-react';

const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Utilities',
  'Salary',
  'Investment',
  'Other'
];

export const TransactionForm = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const { accounts } = useAccounts();
  const { mutateAsync: runLocalCategorize } = useLocalCategorize();

  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('DEBIT');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState('monthly');
  const [tagsStr, setTagsStr] = useState('');
  const [source, setSource] = useState('manual');
  const [mlConfidence, setMlConfidence] = useState(null);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0]._id);
    }
  }, [accounts]);

  useEffect(() => {
    if (initialData) {
      setAccountId(initialData.accountId || '');
      setType(initialData.type || 'DEBIT');
      setAmount(String(initialData.amount || ''));
      setCategory(initialData.category || 'Food');
      setDescription(initialData.description || '');
      setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setIsRecurring(initialData.isRecurring || false);
      setRecurringFreq(initialData.recurringFreq || 'monthly');
      setTagsStr(initialData.tags ? initialData.tags.join(', ') : '');
      setSource(initialData.extractedFrom || 'manual');
    }
  }, [initialData]);

  const handleDescriptionBlur = async () => {
    if (!description.trim() || initialData) return;
    try {
      const res = await runLocalCategorize(description);
      if (res.success && res.data) {
        setCategory(res.data.category);
        setSource(res.data.source);
        setMlConfidence(res.data.confidence);
      }
    } catch (e) {
      console.warn('Auto classification skipped:', e);
    }
  };

  const handleReceiptExtracted = (data) => {
    if (data.amount) setAmount(String(data.amount));
    if (data.category) setCategory(data.category);
    if (data.type) setType(data.type);
    if (data.merchant) setDescription(data.merchant);
    if (data.date) setDate(new Date(data.date).toISOString().split('T')[0]);
    setSource('nlp_text');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountId || !amount) return;

    const payload = {
      accountId,
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: new Date(date).toISOString(),
      isRecurring,
      recurringFreq: isRecurring ? recurringFreq : undefined,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      extractedFrom: source
    };
    onSubmit(payload);
  };

  return (
    <div className="flex flex-col gap-4">
      {!initialData && (
        <ReceiptScanner onExtracted={handleReceiptExtracted} />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Account</label>
            <select
              className="input-premium"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.name} (₹{acc.balance.toLocaleString()})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Type</label>
            <div className="flex gap-2 h-10">
              <button
                type="button"
                className={`flex-1 rounded-lg font-semibold text-xs transition-all ${
                  type === 'DEBIT'
                    ? 'border-2 border-rose-500 bg-rose-950/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                    : 'border border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
                onClick={() => setType('DEBIT')}
              >
                DEBIT (Expense)
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg font-semibold text-xs transition-all ${
                  type === 'CREDIT'
                    ? 'border-2 border-emerald-500 bg-emerald-950/30 text-emerald-450 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                    : 'border border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
                onClick={() => setType('CREDIT')}
              >
                CREDIT (Income)
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input-premium"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <span>Category</span>
              {mlConfidence !== null && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 animate-pulse">
                  <Sparkles size={10} /> Auto ({Math.round(mlConfidence * 100)}%)
                </span>
              )}
            </label>
            <select
              className="input-premium"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSource('manual');
                setMlConfidence(null);
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description / Merchant</label>
          <input
            type="text"
            className="input-premium"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="e.g. Swiggy delivery, Uber ride, Zomato dinner"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Date</label>
            <input
              type="date"
              className="input-premium"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Tags (comma separated)</label>
            <input
              type="text"
              className="input-premium"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. food, dinner, personal"
            />
          </div>
        </div>

        <div className="p-3 border border-slate-800 rounded-xl bg-slate-900/40 flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-400">
            <input
              type="checkbox"
              className="rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500 h-4 w-4 focus:ring-offset-slate-900 cursor-pointer"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            Mark as Recurring Transaction
          </label>
          {isRecurring && (
            <div className="mt-1">
              <label className="text-[11px] text-slate-500 mb-1 block">Frequency</label>
              <select
                className="input-premium"
                value={recurringFreq}
                onChange={(e) => setRecurringFreq(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 justify-end mt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
};
