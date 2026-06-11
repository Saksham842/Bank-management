import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import numeral from 'numeral';

const COLORS = [
  '#7c3aed', // Violet
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#6366f1', // Indigo
  '#EC4899', // Pink
  '#94a3b8'  // Slate
];

export const SpendingDonut = ({ data }) => {
  const formattedData = data.map(item => ({
    name: item._id || 'Other',
    value: item.total
  })).sort((a, b) => b.value - a.value);

  if (formattedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-slate-500 text-xs font-semibold">
        No debit transactions recorded.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {formattedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f1f5f9',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
            }}
            itemStyle={{ color: '#f1f5f9' }}
            formatter={(value) => [`₹${numeral(value).format('0,0')}`, 'Spent']}
          />
          
          <Legend
            iconType="circle"
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
