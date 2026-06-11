import { useState } from 'react';
import { useNLPSearch } from '../../hooks/useNLP';
import { Search, Compass, AlertCircle } from 'lucide-react';

export const NLPSearchBar = ({ onResults, onClear }) => {
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState('');

  const { mutateAsync, isPending } = useNLPSearch();

  const examples = [
    'food expenses last month over 500',
    'all salary credits this year',
    'transport debit this week',
    'shopping credits under 2000'
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const res = await mutateAsync(query);
      
      onResults(res.data, res.parsedQuery);
      
      const p = res.parsedQuery;
      const parsedItems = [
        p.category && `Category: ${p.category}`,
        p.type && `Type: ${p.type}`,
        p.minAmount && `Min: ₹${p.minAmount}`,
        p.maxAmount && `Max: ₹${p.maxAmount}`,
        p.dateRange && `Range: ${p.dateRange.replace('_', ' ')}`,
        p.keyword && `Keyword: '${p.keyword}'`
      ].filter(Boolean);
      
      setHint(parsedItems.join('  •  '));
    } catch (err) {
      console.error('NLP Search error:', err);
    }
  };

  const handleClear = () => {
    setQuery('');
    setHint('');
    onClear();
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-white/10 shadow-premium">
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            className="input-premium pl-10 h-[42px] w-full"
            placeholder="Search transactions using plain English. Try: 'show Swiggy dinners over 600 last month'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleSearch}
            disabled={isPending || !query.trim()}
            className="btn-primary h-[42px] min-w-[100px] flex items-center justify-center shadow-lg shadow-violet-500/20"
          >
            {isPending ? 'Parsing...' : 'Search'}
          </button>

          {query && (
            <button
              onClick={handleClear}
              className="btn-secondary h-[42px] flex items-center justify-center"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {hint && (
        <div className="flex items-center gap-1.5 mt-3 px-3 py-2 bg-violet-950/30 rounded-lg border border-dashed border-violet-500/35 shadow-inner">
          <Compass size={14} className="text-violet-400 animate-spin-slow" />
          <span className="text-xs text-violet-400 font-semibold">AI Interpreted as:</span>
          <span className="text-xs text-violet-200 font-medium">{hint}</span>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap mt-3">
        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
          <AlertCircle size={12} className="text-slate-500" /> Try Examples:
        </span>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="btn-secondary text-[11px] px-2.5 py-1 rounded-full border border-white/5 text-slate-450 hover:bg-white/10 hover:text-white transition duration-150"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
};
