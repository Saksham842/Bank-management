import { SmartCategoryBadge } from '../nlp/SmartCategoryBadge';
import { Edit2, Trash2, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export const TransactionTable = ({ transactions, onEdit, onDelete }) => {
  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-10 text-center glass-panel rounded-2xl border border-white/10 text-slate-400 shadow-md"
      >
        No transactions found. Try adding a new transaction or searching with different criteria.
      </motion.div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-premium">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-950/40 border-b border-slate-800/80 text-slate-450 font-semibold">
              <th className="py-4 px-6">Date</th>
              <th className="py-4 px-6">Type</th>
              <th className="py-4 px-6">Category</th>
              <th className="py-4 px-6">Description / Merchant</th>
              <th className="py-4 px-6">Amount</th>
              <th className="py-4 px-6">Tags</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <motion.tbody layout>
            {transactions.map((t) => (
              <motion.tr
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                key={t._id}
                className="border-b border-slate-800/40 hover:bg-slate-950/20 transition-colors"
              >
                <td className="py-4 px-6 text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    {format(new Date(t.date), 'dd MMM yyyy')}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    t.type === 'DEBIT'
                      ? 'bg-rose-950/30 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-950/30 text-emerald-450 border-emerald-500/20'
                  }`}>
                    {t.type === 'DEBIT' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                    {t.type}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <SmartCategoryBadge category={t.category} source={t.extractedFrom} />
                </td>
                <td className="py-4 px-6 text-white font-medium">
                  {t.description || <span className="text-slate-500 italic">No narrative</span>}
                  {t.isRecurring && (
                    <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md ml-2 font-bold whitespace-nowrap">
                      🔁 Recurring
                    </span>
                  )}
                </td>
                <td className={`py-4 px-6 font-bold ${t.type === 'DEBIT' ? 'text-slate-300' : 'text-emerald-400'}`}>
                  {t.type === 'DEBIT' ? '-' : '+'}₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-6">
                  <div className="flex gap-1.5 flex-wrap">
                    {t.tags && t.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-slate-800/80 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => onEdit(t)}
                      className="border-none bg-transparent text-slate-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Edit Transaction"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(t._id)}
                      className="border-none bg-transparent text-rose-400 hover:text-rose-300 cursor-pointer p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors"
                      title="Delete Transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
};
