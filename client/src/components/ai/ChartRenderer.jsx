import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const ChartRenderer = ({ type, data }) => {
  if (!data || !data.labels || !data.datasets) return null;

  // Reformat data for Recharts (array of objects)
  const chartData = data.labels.map((label, index) => {
    const entry = { name: label };
    data.datasets.forEach(dataset => {
      entry[dataset.label] = dataset.data[index] || 0;
    });
    return entry;
  });

  const colors = [
    '#6366f1', // brand-500
    '#06b6d4', // accent-500
    '#f59e0b', // warning/ads
    '#10b981', // success
    '#ef4444'  // error
  ];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    if (type.toLowerCase() === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
          {data.datasets.map((ds, i) => (
            <Line 
              key={ds.label} 
              type="monotone" 
              dataKey={ds.label} 
              stroke={colors[i % colors.length]} 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      );
    }

    if (type.toLowerCase() === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
          {data.datasets.map((ds, i) => (
            <Bar 
              key={ds.label} 
              dataKey={ds.label} 
              fill={colors[i % colors.length]} 
              radius={[4, 4, 0, 0]} 
            />
          ))}
        </BarChart>
      );
    }

    return null;
  };

  return (
    <div className="my-6 w-full h-[280px] bg-neutral-50 dark:bg-dark-surface/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm animate-in fade-in zoom-in duration-500">
      {data.title && (
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4 text-center">
          {data.title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height="85%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;
