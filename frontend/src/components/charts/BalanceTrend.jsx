import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import numeral from 'numeral';

export const BalanceTrend = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `₹${numeral(value).format('0a')}`}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f1f5f9',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
            }}
            itemStyle={{ color: '#f1f5f9' }}
            labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
            formatter={(value) => [`₹${numeral(value).format('0,0')}`, 'Balance']}
          />
          
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
