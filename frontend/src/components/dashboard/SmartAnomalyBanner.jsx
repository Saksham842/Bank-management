import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Sparkles, X, MessageSquare, CheckCircle } from "lucide-react";

// ─── Contextual question generator (runs locally, no API needed) ──────────────
const generateContextQuestion = (anomaly) => {
  const { merchant, amount, categoryAverage, multiplier } = anomaly;
  const m = merchant?.toLowerCase() || "";

  if (m.includes("food") || m.includes("restaurant") || m.includes("hotel") || m.includes("dining") || m.includes("hyatt") || m.includes("taj"))
    return `You spent ${multiplier}x your usual food budget here. Was this a personal celebration, team outing, or catering event?`;
  if (m.includes("amazon") || m.includes("flipkart") || m.includes("myntra") || m.includes("meesho"))
    return `This shopping spend is ${multiplier}x your average. Was this a planned purchase (appliance, gadget) or an impulse buy?`;
  if (m.includes("uber") || m.includes("ola") || m.includes("rapido") || m.includes("cab") || m.includes("flight") || m.includes("air"))
    return `Transport spend of ${multiplier}x average detected. Was this a work trip (reimbursable) or personal travel?`;
  if (m.includes("pharmacy") || m.includes("hospital") || m.includes("clinic") || m.includes("doctor") || m.includes("apollo"))
    return `Medical expense is ${multiplier}x your average. Is this a one-time treatment or an ongoing medical need?`;
  if (m.includes("laptop") || m.includes("phone") || m.includes("iphone") || m.includes("samsung") || m.includes("dell"))
    return `Electronics purchase detected at ${multiplier}x average. Was this a planned upgrade or business expense?`;

  return `Spend of ₹${amount?.toLocaleString()} at ${merchant} is ${multiplier}x your usual category average. What was the occasion?`;
};

const REASONS = [
  { id: "celebration", label: "🎉 Celebration", mark: "normal" },
  { id: "work", label: "💼 Work/Reimbursable", mark: "normal" },
  { id: "one_time", label: "⚡ One-time Need", mark: "normal" },
  { id: "impulse", label: "😬 Impulse Buy", mark: "impulse" },
  { id: "mistake", label: "❌ Error/Dispute", mark: "error" },
];

// ─── Single Anomaly Card ──────────────────────────────────────────────────────
const AnomalyCard = ({ anomaly, currency, onDismiss, onMarkNormal }) => {
  const [showClarify, setShowClarify] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);

  const question = generateContextQuestion(anomaly);

  const handleReason = (reason) => {
    setSelectedReason(reason);
    setResolved(true);
    if (reason.mark === "normal") {
      onMarkNormal?.(anomaly.transactionId);
    }
    setTimeout(() => onDismiss?.(anomaly.transactionId), 1200);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.25 } }}
      className="bg-slate-950/50 border border-amber-500/15 rounded-xl overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center justify-between p-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-200 font-semibold truncate">
              <span className="text-amber-400">{currency}{anomaly.amount?.toLocaleString()}</span>
              {" "}at <span className="text-white">{anomaly.merchant}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {anomaly.multiplier}x avg · category avg {currency}{anomaly.categoryAverage?.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowClarify((p) => !p)}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-violet-300 border border-violet-500/30 bg-violet-500/10 rounded-lg hover:bg-violet-500/20 transition-all"
          >
            <MessageSquare className="h-2.5 w-2.5" />
            Clarify
          </button>
          <button
            onClick={() => onDismiss?.(anomaly.transactionId)}
            className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-all"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Clarify panel */}
      <AnimatePresence>
        {showClarify && !resolved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-amber-500/10"
          >
            <div className="p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  {question}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleReason(r)}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {resolved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-emerald-500/15 p-2.5 flex items-center gap-2"
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            <p className="text-[10px] text-emerald-400 font-semibold">
              Thanks! Marked as: {selectedReason?.label}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Anomaly Banner ──────────────────────────────────────────────────────
export const SmartAnomalyBanner = ({ anomalies, currency, onDismiss, onMarkNormal }) => {
  const active = anomalies?.filter((a) => !a.dismissed) || [];

  if (active.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-950/20 border border-amber-500/25 rounded-2xl p-4 backdrop-blur-md shadow-[0_0_30px_rgba(245,158,11,0.08)]"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20 flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-sm text-amber-300">
            ⚠️ {active.length} Anomal{active.length > 1 ? "ies" : "y"} Detected
          </h3>
          <p className="text-[10px] text-amber-500/70 mt-0.5">
            Unusual spending patterns — click "Clarify" to provide context
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {active.map((a) => (
            <AnomalyCard
              key={a.transactionId}
              anomaly={a}
              currency={currency}
              onDismiss={onDismiss}
              onMarkNormal={onMarkNormal}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
