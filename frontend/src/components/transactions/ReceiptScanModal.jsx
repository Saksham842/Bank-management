import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Upload, Sparkles, Check, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { format } from "date-fns";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Field row ────────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = "text", options }) => (
  <div className="space-y-1">
    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500">{label}</label>
    {options ? (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none" />
    )}
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const ReceiptScanModal = ({ onClose, onSave, settings }) => {
  const [phase, setPhase] = useState("upload"); // upload | scanning | review | done
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [form, setForm] = useState({
    merchant: "", amount: "", category: "Shopping", date: format(new Date(), "yyyy-MM-dd"), notes: "", type: "expense",
  });
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  // Convert file → base64
  const fileToBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const b64 = e.target.result.split(",")[1];
        resolve(b64);
      };
      reader.readAsDataURL(file);
    });

  const processImage = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    setError("");

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setImageMime(file.type);
    setPhase("scanning");

    try {
      const b64 = await fileToBase64(file);
      setImageBase64(b64);

      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/ai/scan-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: b64, mimeType: file.type }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Scan failed");

      const d = data.data;
      setScanResult(data);
      setForm({
        merchant: d.merchant || "",
        amount: String(d.amount || ""),
        category: d.category || "Shopping",
        date: d.date || format(new Date(), "yyyy-MM-dd"),
        notes: [d.notes, ...(d.items || [])].filter(Boolean).join(" | "),
        type: "expense",
      });
      setPhase("review");
    } catch (err) {
      setError("Scan failed: " + err.message);
      setPhase("upload");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    processImage(e.dataTransfer.files[0]);
  }, []);

  const handleSave = () => {
    if (!form.merchant || !form.amount) {
      setError("Merchant and amount are required.");
      return;
    }
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      id: `receipt-${Date.now()}`,
      version: 1,
      auditTrail: [],
    });
    setPhase("done");
    setTimeout(onClose, 1500);
  };

  const reset = () => {
    setPhase("upload");
    setPreview(null);
    setImageBase64(null);
    setScanResult(null);
    setError("");
  };

  const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center text-pink-400">
              <Camera className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white">Scan Receipt</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Gemini Vision extracts transaction details</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Upload phase ── */}
          <AnimatePresence mode="wait">
            {phase === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                {/* Camera input (mobile) */}
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => processImage(e.target.files[0])} />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0])} />

                {/* Camera button */}
                <button onClick={() => cameraRef.current?.click()}
                  className="w-full py-4 bg-gradient-to-r from-pink-600/20 to-violet-600/20 border border-pink-500/30 hover:border-pink-500/60 rounded-2xl flex flex-col items-center gap-2 transition-all group">
                  <Camera className="h-8 w-8 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-white">Take Photo</span>
                  <span className="text-[10px] text-slate-500">Use your camera (mobile)</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] text-slate-600 font-semibold">OR</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    dragging ? "border-violet-500 bg-violet-500/10" : "border-slate-700 hover:border-violet-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <Upload className="h-6 w-6 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-300">Upload receipt image</p>
                  <p className="text-[10px] text-slate-500">JPG, PNG, WebP supported</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Gemini Vision AI reads your receipt and fills in merchant, amount, date, and items automatically.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Scanning phase ── */}
            {phase === "scanning" && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-6">
                {preview && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 w-48 h-48">
                    <img src={preview} alt="receipt" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Analyzing receipt...</p>
                  <p className="text-xs text-slate-400 mt-1">Gemini Vision is reading your receipt</p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      className="h-2 w-2 bg-violet-500 rounded-full" />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Review phase ── */}
            {phase === "review" && (
              <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Receipt preview thumbnail */}
                {preview && (
                  <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                    <img src={preview} alt="receipt" className="h-14 w-14 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        <p className="text-[10px] font-bold text-violet-400">
                          {scanResult?.source === "gemini" ? "Gemini Vision" : "AI"} extracted
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400">Review and edit fields below before saving.</p>
                    </div>
                    <button onClick={reset} className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all">
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Extracted items preview */}
                {scanResult?.data?.items?.length > 0 && (
                  <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-3">
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2">Line Items</p>
                    <div className="space-y-1">
                      {scanResult.data.items.map((item, i) => (
                        <p key={i} className="text-[10px] text-slate-400 font-mono">{item}</p>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Merchant" value={form.merchant} onChange={(v) => setForm(f => ({ ...f, merchant: v }))} />
                  </div>
                  <Field label={`Amount (${settings?.currency || "₹"})`} value={form.amount} onChange={(v) => setForm(f => ({ ...f, amount: v }))} type="number" />
                  <Field label="Date" value={form.date} onChange={(v) => setForm(f => ({ ...f, date: v }))} type="date" />
                  <Field label="Category" value={form.category} onChange={(v) => setForm(f => ({ ...f, category: v }))} options={["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"]} />
                  <Field label="Type" value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v }))} options={["expense", "income"]} />
                  <div className="col-span-2">
                    <Field label="Notes" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Done phase ── */}
            {phase === "done" && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10 gap-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                  className="h-16 w-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-400" />
                </motion.div>
                <p className="font-heading font-bold text-lg text-white">Transaction Saved!</p>
                <p className="text-xs text-slate-400">{settings?.currency || "₹"}{parseFloat(form.amount).toLocaleString()} at {form.merchant}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {phase === "review" && (
          <div className="flex gap-3 p-5 border-t border-slate-800 flex-shrink-0">
            <button onClick={reset} className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all">
              Rescan
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl text-xs font-bold tracking-wide hover:opacity-90 transition-all shadow-lg shadow-violet-900/30">
              Save Transaction →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
