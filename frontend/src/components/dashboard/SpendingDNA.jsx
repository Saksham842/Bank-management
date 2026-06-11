import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, parseISO } from "date-fns";

// ─── Personality Definitions ──────────────────────────────────────────────────
const PERSONALITIES = {
  subscription_hoarder: {
    id: "subscription_hoarder",
    emoji: "🛒",
    label: "Subscription Hoarder",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.3)",
    border: "rgba(139,92,246,0.4)",
    bg: "rgba(139,92,246,0.08)",
    description:
      "You love recurring services — streaming, apps, memberships. Your subscriptions silently drain your account every month.",
    trait: "High recurring spend ratio",
    tip: "Audit your subscriptions monthly. Cancel anything unused for 2+ weeks.",
  },
  impulse_buyer: {
    id: "impulse_buyer",
    emoji: "🧨",
    label: "Impulse Buyer",
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.3)",
    border: "rgba(245,158,11,0.4)",
    bg: "rgba(245,158,11,0.08)",
    description:
      "Your spending is unpredictable — big spikes followed by quiet days. Emotion-driven purchases are your pattern.",
    trait: "High daily spending variance",
    tip: "Add a 24-hour rule: wait a day before any purchase over ₹1,000.",
  },
  disciplined_saver: {
    id: "disciplined_saver",
    emoji: "🏛️",
    label: "Disciplined Saver",
    color: "#10B981",
    glow: "rgba(16,185,129,0.3)",
    border: "rgba(16,185,129,0.4)",
    bg: "rgba(16,185,129,0.08)",
    description:
      "Your savings rate is impressive and your spending is consistent. You are in the top tier of financial discipline.",
    trait: "High savings rate + low variance",
    tip: "Consider moving idle savings to a high-yield FD or index fund SIP.",
  },
  financial_ghost: {
    id: "financial_ghost",
    emoji: "👻",
    label: "Financial Ghost",
    color: "#94A3B8",
    glow: "rgba(148,163,184,0.3)",
    border: "rgba(148,163,184,0.4)",
    bg: "rgba(148,163,184,0.08)",
    description:
      "You rarely log transactions and your financial data is sparse. Your money moves in the shadows.",
    trait: "Very few transactions recorded",
    tip: "Start tracking every transaction — even small ones. Awareness is the first step.",
  },
  balanced_operator: {
    id: "balanced_operator",
    emoji: "⚖️",
    label: "Balanced Operator",
    color: "#06B6D4",
    glow: "rgba(6,182,212,0.3)",
    border: "rgba(6,182,212,0.4)",
    bg: "rgba(6,182,212,0.08)",
    description:
      "You maintain a healthy balance between spending and saving across diverse categories.",
    trait: "Balanced spend + moderate savings",
    tip: "Keep it up! Look into goal-based investing to put your balance to work.",
  },
};

// ─── DNA Classification Algorithm ─────────────────────────────────────────────
const classifySpendingDNA = (transactions, monthlyIncome = 45000) => {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length < 5) return "financial_ghost";

  // 1) Ghost check — very few transactions
  const last30 = transactions.filter(
    (t) => differenceInDays(new Date(), parseISO(t.date)) <= 30
  );
  if (last30.length < 4) return "financial_ghost";

  // 2) Savings rate (income - expenses over last 30d)
  const last30Income =
    last30.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ||
    monthlyIncome;
  const last30Expense = last30
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const savingsRate = Math.max(0, (last30Income - last30Expense) / last30Income);

  // 3) Recurring / subscription ratio
  const RECURRING_MERCHANTS = [
    "netflix", "spotify", "prime", "hotstar", "zee5", "jio",
    "youtube premium", "apple music", "dropbox", "notion", "figma",
    "github", "canva", "swiggy one", "zomato pro", "gym",
  ];
  const recurringCount = expenses.filter((t) =>
    RECURRING_MERCHANTS.some((kw) => t.merchant?.toLowerCase().includes(kw))
  ).length;
  const recurringRatio = recurringCount / Math.max(expenses.length, 1);

  // 4) Daily spend variance (impulse detection)
  const dailyMap = {};
  last30
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      dailyMap[t.date] = (dailyMap[t.date] || 0) + t.amount;
    });
  const dailyValues = Object.values(dailyMap);
  const meanDaily =
    dailyValues.reduce((a, b) => a + b, 0) / Math.max(dailyValues.length, 1);
  const variance =
    dailyValues.reduce((a, b) => a + Math.pow(b - meanDaily, 2), 0) /
    Math.max(dailyValues.length, 1);
  const cv = Math.sqrt(variance) / Math.max(meanDaily, 1); // coefficient of variation

  // 5) Category diversity
  const catSums = {};
  expenses.forEach((t) => {
    catSums[t.category] = (catSums[t.category] || 0) + t.amount;
  });
  const totalExpense = Object.values(catSums).reduce((a, b) => a + b, 0) || 1;
  const maxCatPct = Math.max(...Object.values(catSums)) / totalExpense;

  // ── Decision Tree ──
  if (recurringRatio > 0.25) return "subscription_hoarder";
  if (cv > 1.8) return "impulse_buyer";
  if (savingsRate >= 0.3 && cv < 1.0) return "disciplined_saver";
  if (savingsRate >= 0.15 && maxCatPct < 0.5 && cv < 1.5) return "balanced_operator";
  return "impulse_buyer"; // fallback for moderate chaos
};

// ─── Trait Meter ──────────────────────────────────────────────────────────────
const TraitMeter = ({ label, value, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] text-slate-400">
      <span>{label}</span>
      <span className="font-semibold text-white">{Math.round(value)}%</span>
    </div>
    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const SpendingDNA = ({ transactions, monthlyIncome, settings }) => {
  const [expanded, setExpanded] = useState(false);

  const personalityKey = useMemo(
    () => classifySpendingDNA(transactions, monthlyIncome),
    [transactions, monthlyIncome]
  );
  const personality = PERSONALITIES[personalityKey];

  // Compute trait meters
  const metrics = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const last30 = transactions.filter(
      (t) => differenceInDays(new Date(), parseISO(t.date)) <= 30
    );
    const income =
      last30.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ||
      monthlyIncome;
    const expense = last30
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const savingsRate = Math.max(
      0,
      Math.min(100, ((income - expense) / income) * 100)
    );

    const RECURRING = ["netflix", "spotify", "prime", "hotstar", "jio", "zee5", "gym", "canva", "github", "notion"];
    const recCount = expenses.filter((t) =>
      RECURRING.some((kw) => t.merchant?.toLowerCase().includes(kw))
    ).length;
    const recurringScore = Math.min(100, (recCount / Math.max(expenses.length, 1)) * 300);

    const dailyMap = {};
    last30.filter((t) => t.type === "expense").forEach((t) => {
      dailyMap[t.date] = (dailyMap[t.date] || 0) + t.amount;
    });
    const vals = Object.values(dailyMap);
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
    const cv = Math.sqrt(
      vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(vals.length, 1)
    ) / Math.max(mean, 1);
    const impulseScore = Math.min(100, cv * 50);

    const catSums = {};
    expenses.forEach((t) => { catSums[t.category] = (catSums[t.category] || 0) + t.amount; });
    const total = Object.values(catSums).reduce((a, b) => a + b, 0) || 1;
    const maxPct = Math.max(...Object.values(catSums).map((v) => v / total), 0);
    const diversityScore = Math.max(0, 100 - maxPct * 100);

    return { savingsRate, recurringScore, impulseScore, diversityScore };
  }, [transactions, monthlyIncome]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-panel rounded-2xl overflow-hidden"
      style={{
        borderColor: personality.border,
        boxShadow: `0 0 40px ${personality.glow}, 0 8px 32px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Header */}
      <div
        className="p-5 cursor-pointer select-none"
        onClick={() => setExpanded((p) => !p)}
        style={{ background: personality.bg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                borderColor: personality.border,
                background: `${personality.color}18`,
                boxShadow: `0 0 16px ${personality.glow}`,
              }}
            >
              {personality.emoji}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">
                Spending DNA
              </p>
              <h3
                className="font-heading font-bold text-lg leading-tight"
                style={{ color: personality.color }}
              >
                {personality.label}
              </h3>
            </div>
          </div>

          {/* Expand chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-slate-500"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>

        {/* Trait tag */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
            style={{
              color: personality.color,
              borderColor: personality.border,
              background: `${personality.color}15`,
            }}
          >
            {personality.trait}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-5 border-t border-slate-800/50">
              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {personality.description}
              </p>

              {/* Trait Meters */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Financial Traits
                </p>
                <TraitMeter
                  label="Savings Rate"
                  value={metrics.savingsRate}
                  color="#10B981"
                />
                <TraitMeter
                  label="Subscription Load"
                  value={metrics.recurringScore}
                  color="#8B5CF6"
                />
                <TraitMeter
                  label="Impulse Spending"
                  value={metrics.impulseScore}
                  color="#F59E0B"
                />
                <TraitMeter
                  label="Category Diversity"
                  value={metrics.diversityScore}
                  color="#06B6D4"
                />
              </div>

              {/* AI Tip */}
              <div className="flex gap-3 bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5">
                <span className="text-lg flex-shrink-0 mt-0.5">💡</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Smart Tip
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {personality.tip}
                  </p>
                </div>
              </div>

              {/* All Personalities */}
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3">
                  All Personality Types
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.values(PERSONALITIES).map((p) => (
                    <div
                      key={p.id}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                        p.id === personalityKey
                          ? "opacity-100 scale-105"
                          : "opacity-35 scale-95"
                      }`}
                      style={{
                        borderColor: p.id === personalityKey ? p.border : "transparent",
                        background: p.id === personalityKey ? p.bg : "transparent",
                      }}
                    >
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-[9px] text-center text-slate-400 leading-tight font-medium">
                        {p.label.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
