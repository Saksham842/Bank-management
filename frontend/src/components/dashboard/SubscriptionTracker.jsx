import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, parseISO, format } from "date-fns";
import { RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";

// ─── Recurring Detection Algorithm ───────────────────────────────────────────
/**
 * Detects recurring transactions by finding same-merchant transactions
 * that repeat with similar amounts at ~monthly or ~weekly intervals.
 */
const detectRecurring = (transactions) => {
  const expenses = transactions.filter((t) => t.type === "expense");

  // Group by normalized merchant name
  const byMerchant = {};
  expenses.forEach((t) => {
    const key = t.merchant?.toLowerCase().trim() || "unknown";
    if (!byMerchant[key]) byMerchant[key] = [];
    byMerchant[key].push(t);
  });

  const recurring = [];

  Object.entries(byMerchant).forEach(([merchant, txns]) => {
    if (txns.length < 2) return;

    // Sort by date
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));

    // Compute intervals between consecutive transactions
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = differenceInDays(
        parseISO(sorted[i].date),
        parseISO(sorted[i - 1].date)
      );
      intervals.push(days);
    }

    if (intervals.length === 0) return;

    const avgInterval =
      intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdInterval = Math.sqrt(
      intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) /
        intervals.length
    );

    // Only count as recurring if interval is consistent (low std dev)
    // and within monthly (25-35d) or weekly (5-9d) or fortnightly (12-18d) range
    const isMonthly = avgInterval >= 25 && avgInterval <= 35;
    const isWeekly = avgInterval >= 5 && avgInterval <= 9;
    const isFortnightly = avgInterval >= 12 && avgInterval <= 18;
    const isConsistent = stdInterval < avgInterval * 0.4; // 40% tolerance

    if ((isMonthly || isWeekly || isFortnightly) && isConsistent) {
      const avgAmount =
        sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;

      const frequency = isWeekly
        ? "weekly"
        : isFortnightly
        ? "fortnightly"
        : "monthly";

      const monthlyEquivalent =
        frequency === "weekly"
          ? avgAmount * 4.33
          : frequency === "fortnightly"
          ? avgAmount * 2
          : avgAmount;

      const lastTx = sorted[sorted.length - 1];

      recurring.push({
        merchant: txns[0].merchant,
        category: txns[0].category,
        frequency,
        avgAmount: Math.round(avgAmount),
        monthlyEquivalent: Math.round(monthlyEquivalent),
        occurrences: sorted.length,
        lastDate: lastTx.date,
        nextExpected: format(
          new Date(
            parseISO(lastTx.date).getTime() + avgInterval * 24 * 60 * 60 * 1000
          ),
          "yyyy-MM-dd"
        ),
        daysUntilNext: Math.round(
          avgInterval -
            differenceInDays(new Date(), parseISO(lastTx.date))
        ),
      });
    }
  });

  // Sort by monthly equivalent cost descending
  return recurring.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
};

// ─── Category Colors ──────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Food: "#F59E0B",
  Transport: "#3B82F6",
  Shopping: "#EC4899",
  Bills: "#10B981",
  Health: "#EF4444",
  Entertainment: "#8B5CF6",
  Utilities: "#06B6D4",
  Other: "#64748B",
};

const FREQ_BADGE = {
  weekly: { label: "Weekly", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  fortnightly: { label: "Fortnightly", color: "#06B6D4", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)" },
  monthly: { label: "Monthly", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" },
};

// ─── Single Recurring Item ────────────────────────────────────────────────────
const RecurringItem = ({ item, currency }) => {
  const freq = FREQ_BADGE[item.frequency];
  const catColor = CATEGORY_COLORS[item.category] || "#64748B";
  const daysLeft = item.daysUntilNext;
  const isDueSoon = daysLeft <= 5 && daysLeft >= 0;
  const isOverdue = daysLeft < 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:bg-slate-900/30 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm border flex-shrink-0"
          style={{
            background: `${catColor}15`,
            borderColor: `${catColor}30`,
            color: catColor,
          }}
        >
          {item.category === "Entertainment" ? "🎬" :
           item.category === "Food" ? "🍔" :
           item.category === "Transport" ? "🚗" :
           item.category === "Bills" ? "⚡" :
           item.category === "Health" ? "💊" :
           item.category === "Shopping" ? "🛍️" : "📋"}
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate max-w-[140px]">
            {item.merchant}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
              style={{
                color: freq.color,
                background: freq.bg,
                borderColor: freq.border,
              }}
            >
              {freq.label}
            </span>
            {isDueSoon && (
              <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Due in {daysLeft}d
              </span>
            )}
            {isOverdue && (
              <span className="text-[9px] text-red-400 font-semibold">
                Expected {Math.abs(daysLeft)}d ago
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className="text-xs font-bold text-white">
          {currency}{item.avgAmount.toLocaleString()}
        </p>
        <p className="text-[9px] text-slate-500 mt-0.5">
          ≈ {currency}{item.monthlyEquivalent.toLocaleString()}/mo
        </p>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const SubscriptionTracker = ({ transactions, settings }) => {
  const [showAll, setShowAll] = useState(false);

  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);

  const totalMonthlyBurn = recurring.reduce(
    (s, r) => s + r.monthlyEquivalent,
    0
  );
  const dueSoon = recurring.filter(
    (r) => r.daysUntilNext >= 0 && r.daysUntilNext <= 7
  ).length;

  const displayItems = showAll ? recurring : recurring.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-panel rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Recurring Payments
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5">
              Auto-detected subscriptions &amp; bills
            </p>
          </div>
        </div>

        {/* Monthly burn badge */}
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase font-semibold">Monthly Burn</p>
          <p className="font-heading font-bold text-red-400 text-base">
            {settings?.currency || "₹"}{totalMonthlyBurn.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Due soon alert */}
      {dueSoon > 0 && (
        <div className="flex items-center gap-2.5 bg-amber-950/30 border border-amber-500/20 rounded-xl p-2.5 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            <strong>{dueSoon}</strong> payment{dueSoon > 1 ? "s" : ""} due within 7 days
          </p>
        </div>
      )}

      {/* Items */}
      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <RefreshCw className="h-8 w-8 text-slate-700 mb-2" />
          <p className="text-xs text-slate-500">
            No recurring patterns detected yet.
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            Need 2+ transactions from the same merchant.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {displayItems.map((item, idx) => (
              <RecurringItem
                key={`${item.merchant}-${idx}`}
                item={item}
                currency={settings?.currency || "₹"}
              />
            ))}
          </AnimatePresence>

          {recurring.length > 4 && (
            <button
              onClick={() => setShowAll((p) => !p)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-all mt-1"
            >
              {showAll ? "Show Less" : `Show ${recurring.length - 4} More`}
              <ChevronRight
                className={`h-3 w-3 transition-transform ${showAll ? "rotate-90" : ""}`}
              />
            </button>
          )}
        </div>
      )}

      {/* Summary footer */}
      {recurring.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/50 grid grid-cols-3 text-center gap-2">
          <div>
            <p className="text-base font-heading font-bold text-white">
              {recurring.length}
            </p>
            <p className="text-[9px] text-slate-500 uppercase font-semibold">Recurring</p>
          </div>
          <div>
            <p className="text-base font-heading font-bold text-amber-400">
              {dueSoon}
            </p>
            <p className="text-[9px] text-slate-500 uppercase font-semibold">Due Soon</p>
          </div>
          <div>
            <p className="text-base font-heading font-bold text-red-400">
              {settings?.currency || "₹"}{totalMonthlyBurn.toLocaleString()}
            </p>
            <p className="text-[9px] text-slate-500 uppercase font-semibold">/Month</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};
