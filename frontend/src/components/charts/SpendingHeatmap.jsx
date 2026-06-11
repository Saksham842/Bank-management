import { format, subDays } from 'date-fns';

const LEVELS = ['rgba(255, 255, 255, 0.05)', '#2e1065', '#4c1d95', '#6d28d9', '#8b5cf6'];

export const SpendingHeatmap = ({ data }) => {
  const dataMap = data.reduce((acc, curr) => {
    acc[curr.date] = curr.amount;
    return acc;
  }, {});

  const blocks = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    blocks.push({
      date: dateStr,
      amount: dataMap[dateStr] || 0
    });
  }

  const getLevelColor = (amount) => {
    if (amount === 0) return LEVELS[0];
    if (amount < 200) return LEVELS[1];
    if (amount < 800) return LEVELS[2];
    if (amount < 2000) return LEVELS[3];
    return LEVELS[4];
  };

  return (
    <div className="overflow-x-auto py-2.5">
      <div className="min-w-[760px] p-1">
        <div 
          className="grid grid-flow-col gap-[3px]" 
          style={{ gridTemplateRows: 'repeat(7, 10px)' }}
        >
          {blocks.map((b, idx) => {
            const levelColor = getLevelColor(b.amount);
            return (
              <div
                key={idx}
                style={{ backgroundColor: levelColor }}
                className="w-2.5 h-2.5 rounded-[2px] cursor-pointer hover:ring-1 hover:ring-indigo-400 transition-all duration-100"
                title={`${b.date}: ₹${b.amount.toLocaleString()}`}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500 pr-2">
          <span>365 Days Ago</span>
          <div className="flex gap-[3px] items-center">
            <span>Less</span>
            {LEVELS.map((col, i) => (
              <div 
                key={i} 
                style={{ backgroundColor: col }} 
                className="w-2.5 h-2.5 rounded-[2px] border border-white/5" 
              />
            ))}
            <span>More</span>
          </div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};
