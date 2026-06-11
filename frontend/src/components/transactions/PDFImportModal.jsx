import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, Check, Trash2, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const CATEGORY_COLORS = {
  Food: "#F59E0B", Transport: "#3B82F6", Shopping: "#EC4899",
  Bills: "#10B981", Health: "#EF4444", Entertainment: "#8B5CF6",
  Income: "#10B981", Investment: "#06B6D4", Other: "#64748B",
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const Step = ({ n, label, active, done }) => (
  <div className="flex items-center gap-2">
    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
      done ? "bg-emerald-500 border-emerald-500 text-white" :
      active ? "bg-violet-600 border-violet-500 text-white" :
      "bg-slate-900 border-slate-700 text-slate-500"
    }`}>
      {done ? <Check className="h-3 w-3" /> : n}
    </div>
    <span className={`text-[10px] font-semibold tracking-wide ${
      active ? "text-white" : done ? "text-emerald-400" : "text-slate-500"
    }`}>{label}</span>
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const PDFImportModal = ({ onClose, onImport, settings }) => {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=done
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [parsed, setParsed] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // ── Extract text from PDF using pdf.js (CDN loaded) ──
  const extractPdfText = async (file) => {
    if (!window.pdfjsLib) {
      // If pdf.js is not loaded, read as text fallback
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  };

  const processFile = async (f) => {
    if (!f || f.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }
    setFile(f);
    setError("");
    setLoading(true);
    setLoadMsg("Extracting text from PDF...");

    try {
      const pdfText = await extractPdfText(f);
      setLoadMsg("Sending to AI for transaction parsing...");

      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/ai/import-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pdfText }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Parse failed");

      const txns = data.transactions.map((t, i) => ({
        ...t,
        id: t.id || `pdf-${Date.now()}-${i}`,
        amount: parseFloat(t.amount) || 0,
        date: t.date || format(new Date(), "yyyy-MM-dd"),
        version: 1,
        auditTrail: [],
      }));

      setParsed(txns);
      setSelected(new Set(txns.map((t) => t.id)));
      setStep(2);
    } catch (err) {
      setError("Failed to parse PDF: " + err.message);
    } finally {
      setLoading(false);
      setLoadMsg("");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    processFile(f);
  }, []);

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = parsed.filter((t) => selected.has(t.id));
    onImport(toImport);
    setStep(3);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25 }}
        className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white">Bank Statement Import</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Upload PDF → AI extracts transactions automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-900 flex-shrink-0">
          <Step n={1} label="Upload PDF" active={step === 1} done={step > 1} />
          <ChevronRight className="h-3 w-3 text-slate-700" />
          <Step n={2} label="Review" active={step === 2} done={step > 2} />
          <ChevronRight className="h-3 w-3 text-slate-700" />
          <Step n={3} label="Import" active={step === 3} done={step === 3} />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  dragging
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-slate-700 hover:border-violet-500/50 hover:bg-slate-900/40"
                }`}
              >
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
                {loading ? (
                  <>
                    <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
                    <p className="text-sm text-slate-300 font-semibold">{loadMsg}</p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Upload className="h-7 w-7 text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Drop your bank statement PDF here</p>
                    <p className="text-xs text-slate-500">or click to browse · Supports HDFC, SBI, ICICI, Axis formats</p>
                    <span className="px-3 py-1.5 text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full">
                      Gemini AI will extract all transactions
                    </span>
                  </>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">How it works</p>
                <div className="space-y-1.5">
                  {["PDF text is extracted securely in your browser", "Gemini AI reads the statement and classifies each transaction", "Review and deselect rows you don't want before importing"].map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                      <span className="h-4 w-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Found <strong className="text-white">{parsed.length}</strong> transactions ·{" "}
                  <strong className="text-violet-400">{selected.size}</strong> selected
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(parsed.map(t => t.id)))} className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-800 hover:bg-slate-800 transition-all">All</button>
                  <button onClick={() => setSelected(new Set())} className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-800 hover:bg-slate-800 transition-all">None</button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/80 sticky top-0">
                      <tr className="text-[9px] text-slate-400 uppercase tracking-widest">
                        <th className="py-3 px-3 w-10" />
                        <th className="py-3 px-3 text-left">Date</th>
                        <th className="py-3 px-3 text-left">Merchant</th>
                        <th className="py-3 px-3 text-left">Category</th>
                        <th className="py-3 px-3 text-right">Amount</th>
                        <th className="py-3 px-3 text-center">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      <AnimatePresence>
                        {parsed.map((t) => (
                          <motion.tr
                            key={t.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`transition-all cursor-pointer ${
                              selected.has(t.id) ? "bg-slate-900/30" : "opacity-40"
                            }`}
                            onClick={() => toggleRow(t.id)}
                          >
                            <td className="py-2.5 px-3">
                              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                selected.has(t.id)
                                  ? "bg-violet-600 border-violet-500"
                                  : "bg-slate-900 border-slate-700"
                              }`}>
                                {selected.has(t.id) && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{t.date}</td>
                            <td className="py-2.5 px-3">
                              <p className="text-white font-semibold truncate max-w-[140px]">{t.merchant}</p>
                              {t.notes && <p className="text-[9px] text-slate-500 truncate max-w-[140px]">{t.notes}</p>}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                                style={{ backgroundColor: `${CATEGORY_COLORS[t.category] || "#4F46E5"}1A`, borderColor: `${CATEGORY_COLORS[t.category] || "#4F46E5"}40`, color: CATEGORY_COLORS[t.category] || "#4F46E5" }}>
                                {t.category}
                              </span>
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold font-mono ${t.type === "income" ? "text-emerald-400" : "text-slate-200"}`}>
                              {t.type === "income" ? "+" : "-"}{settings?.currency || "₹"}{t.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.type === "income" ? "text-emerald-400 bg-emerald-950/40" : "text-slate-400 bg-slate-900"}`}>
                                {t.type}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="h-16 w-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center"
              >
                <Check className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <p className="font-heading font-bold text-lg text-white">Import Successful!</p>
              <p className="text-xs text-slate-400">{selected.size} transactions added to your ledger.</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {step === 2 && (
          <div className="flex gap-3 p-5 border-t border-slate-800 flex-shrink-0">
            <button onClick={() => { setStep(1); setParsed([]); setFile(null); }}
              className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all">
              ← Re-upload
            </button>
            <button onClick={handleImport} disabled={selected.size === 0}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide disabled:opacity-40 hover:opacity-90 transition-all shadow-lg shadow-violet-900/30">
              Import {selected.size} Transactions →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
