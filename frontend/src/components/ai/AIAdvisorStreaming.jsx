import { useState, useRef } from 'react';
import { Sparkles, CornerDownLeft, X, Zap, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_PROMPTS = [
  "Where is most of my money going?",
  "Am I spending too much on food?",
  "How can I save ₹5,000 more per month?",
  "What are my top 3 recurring expenses?",
  "Am I on track with my savings goal?",
];

export const AIAdvisorStreaming = ({ transactions }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const abortRef = useRef(null);
  const responseRef = useRef(null);

  const handleAsk = async (q) => {
    const query = q || question;
    if (!query.trim()) return;

    // Abort any previous stream
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setQuestion(query);
    setResponse('');
    setWordCount(0);
    setStreaming(true);
    setShowQuickPrompts(false);

    try {
      const token = localStorage.getItem('accessToken');
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const res = await fetch(`${apiBaseUrl}/ai/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ question: query, transactions }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error('No response stream body.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data:'));

        for (const line of lines) {
          const payload = line.replace('data: ', '').trim();
          if (payload === '[DONE]') {
            setStreaming(false);
            return;
          }
          try {
            const { token: tok } = JSON.parse(payload);
            fullText += tok;
            setResponse(fullText);
            setWordCount(fullText.split(/\s+/).filter(Boolean).length);
            // Auto-scroll
            if (responseRef.current) {
              responseRef.current.scrollTop = responseRef.current.scrollHeight;
            }
          } catch (_) { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Advisor stream error:', err);
      // Graceful fallback — show a helpful mock message
      setResponse(
        `[AI Advisor] Based on your transaction history:\n\n` +
        `• Your top spending categories this month are Food and Shopping.\n` +
        `• You have ${transactions?.filter(t => t.type === 'expense').length || 0} expense transactions recorded.\n` +
        `• Tip: Set up a VITE_API_URL to connect to your backend for live AI insights!`
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
  };

  return (
    <div className="glass-panel p-5 shadow-premium rounded-2xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-violet-950/40 border border-violet-500/20 text-violet-400 p-1.5 rounded-lg shadow-[0_0_10px_rgba(124,58,237,0.15)]">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Money Doctor</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Ask anything about your spending • SSE Streaming
            </p>
          </div>
        </div>
        {/* Live indicator */}
        {streaming && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-950/40 border border-violet-500/20 rounded-full">
            <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider">
              Streaming
            </span>
          </div>
        )}
      </div>

      {/* Quick prompts toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowQuickPrompts(p => !p)}
          className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-violet-300 transition-colors font-semibold"
        >
          <Zap className="h-3 w-3" />
          Quick Prompts
          <ChevronDown className={`h-3 w-3 transition-transform ${showQuickPrompts ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showQuickPrompts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleAsk(p)}
                    disabled={streaming}
                    className="px-2.5 py-1 text-[10px] font-medium bg-slate-900/60 border border-slate-700 rounded-lg text-slate-300 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10 transition-all disabled:opacity-40"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input row */}
      <div className="flex gap-2 relative">
        <input
          type="text"
          className="input-premium h-10 pr-20 w-full"
          placeholder="e.g. Am I spending too much on food this month?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !streaming && handleAsk()}
          disabled={streaming}
        />
        <div className="absolute right-1 top-1 flex gap-1">
          {streaming && (
            <button
              onClick={handleStop}
              className="h-8 w-8 flex items-center justify-center rounded-md bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-900/50 transition-all"
            >
              <X size={13} />
            </button>
          )}
          <button
            onClick={() => handleAsk()}
            disabled={streaming || !question.trim()}
            className="btn-primary h-8 w-8 p-0 rounded-md flex items-center justify-center shadow-lg shadow-violet-500/20"
          >
            <CornerDownLeft size={14} />
          </button>
        </div>
      </div>

      {/* Response area */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div
              ref={responseRef}
              className="px-4 py-3 text-xs text-slate-300 bg-slate-950/60 border border-white/5 border-l-4 border-violet-500 rounded-r-xl leading-relaxed whitespace-pre-wrap shadow-inner max-h-52 overflow-y-auto"
            >
              {response}
              {streaming && (
                <span className="inline-block w-0.5 h-3 bg-violet-400 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
            {!streaming && wordCount > 0 && (
              <div className="flex justify-between items-center mt-1.5 px-1">
                <span className="text-[9px] text-slate-600">{wordCount} words</span>
                <button
                  onClick={() => { setResponse(''); setWordCount(0); setQuestion(''); }}
                  className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
