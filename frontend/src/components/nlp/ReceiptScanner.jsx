import { useState } from 'react';
import { useReceiptExtract } from '../../hooks/useNLP';
import { Sparkles, Clipboard, CheckCircle } from 'lucide-react';

export const ReceiptScanner = ({ onExtracted }) => {
  const [text, setText] = useState('');
  const { mutateAsync, isPending } = useReceiptExtract();
  const [success, setSuccess] = useState(false);

  const handleExtract = async () => {
    if (!text.trim()) return;
    try {
      const res = await mutateAsync(text);
      if (res.success && res.data) {
        onExtracted(res.data);
        setText('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Extraction failure:', err);
    }
  };

  return (
    <div className="bg-emerald-950/20 border border-dashed border-emerald-500/30 rounded-xl p-4 mb-4 shadow-inner">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-450 animate-pulse" />
          <span className="text-sm font-semibold text-emerald-300">
            Paste Receipt / Bank SMS / Narration
          </span>
        </div>
        <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold tracking-wider uppercase">
          AI Powered
        </span>
      </div>

      <textarea
        className="input-premium w-full min-h-[80px] p-2.5 text-xs resize-y"
        placeholder="Examples:&#10;Swiggy Order #8972 ₹420.50 paid via UPI on 21 May&#10;Alert: ₹45,000 credited to Account XXXX9876 by salary NEFT"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex gap-2.5 mt-2.5">
        <button
          onClick={handleExtract}
          disabled={isPending || !text.trim()}
          className="btn-primary flex-1 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-550 border-none text-white font-bold h-[38px] flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition"
        >
          {isPending ? (
            'Analyzing Narration...'
          ) : (
            <>
              <Clipboard size={16} /> Extract & Pre-fill Form
            </>
          )}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-1.5 mt-2.5 text-emerald-400 text-xs font-semibold">
          <CheckCircle size={14} className="text-emerald-450" />
          <span>Form pre-filled successfully! Please review and save.</span>
        </div>
      )}
    </div>
  );
};
