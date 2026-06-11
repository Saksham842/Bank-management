import numeral from 'numeral';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const KPICard = ({ title, amount, icon, iconBg, iconColor, trend }) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="glass-panel rounded-2xl p-5 flex justify-between items-start hover-card"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        <span className="text-2xl font-extrabold text-white tabular-nums">
          ₹ {numeral(amount).format('0,0.00')}
        </span>
        {trend && (
          <div className="flex items-center gap-1.5 text-xs mt-0.5">
            <span
              className={`font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {trend.isPositive
                ? <TrendingUp size={10} />
                : <TrendingDown size={10} />}
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-slate-500">{trend.label}</span>
          </div>
        )}
      </div>

      <div className={`p-3 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>
    </motion.div>
  );
};
