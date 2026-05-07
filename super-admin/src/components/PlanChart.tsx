import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, Cell, Legend, XAxis, YAxis, Tooltip as RechartsTooltip 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const PlanChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="plan" hide />
        <YAxis hide />
        <RechartsTooltip />
        <Legend />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default React.memo(PlanChart);
