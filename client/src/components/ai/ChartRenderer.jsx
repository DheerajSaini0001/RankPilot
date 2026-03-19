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
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart
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

    const typeLower = type.toLowerCase();

    if (typeLower === 'line') {
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

    if (typeLower === 'bar') {
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

    if (typeLower === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            {data.datasets.map((ds, i) => (
              <linearGradient key={`grad-${i}`} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
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
            <Area 
              key={ds.label} 
              type="monotone" 
              dataKey={ds.label} 
              stroke={colors[i % colors.length]} 
              fillOpacity={1} 
              fill={`url(#color-${i})`} 
              strokeWidth={3}
            />
          ))}
        </AreaChart>
      );
    }

    if (typeLower === 'pie' || typeLower === 'donut') {
      // For Pie/Donut, we usually use the first dataset
      const pieData = data.labels.map((label, index) => ({
        name: label,
        value: data.datasets[0].data[index] || 0
      }));

      return (
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={typeLower === 'donut' ? 60 : 0}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationBegin={0}
            animationDuration={1500}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
        </PieChart>
      );
    }

    if (typeLower === 'radar') {
      return (
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          {data.datasets.map((ds, i) => (
            <Radar
              key={ds.label}
              name={ds.label}
              dataKey={ds.label}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.6}
            />
          ))}
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
        </RadarChart>
      );
    }

    if (typeLower === 'scatter') {
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            type="category" 
            dataKey="name" 
            name="label"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <YAxis 
            type="number" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <ZAxis type="number" range={[60, 400]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
          {data.datasets.map((ds, i) => (
            <Scatter 
              key={ds.label} 
              name={ds.label} 
              data={chartData} 
              dataKey={ds.label} 
              fill={colors[i % colors.length]} 
            />
          ))}
        </ScatterChart>
      );
    }

    if (typeLower === 'composed') {
      return (
        <ComposedChart {...commonProps}>
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
          {data.datasets.map((ds, i) => {
            if (i === 0) return <Bar key={ds.label} dataKey={ds.label} barSize={20} fill={colors[0]} radius={[4, 4, 0, 0]} />;
            if (i === 1) return <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={colors[1]} strokeWidth={3} />;
            return <Area key={ds.label} type="monotone" dataKey={ds.label} fill={colors[i % colors.length]} stroke={colors[i % colors.length]} fillOpacity={0.2} />;
          })}
        </ComposedChart>
      );
    }

    return null;
  };


  return (
    <div className="w-full h-[320px] bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-[2rem] p-8 shadow-xl relative animate-in fade-in zoom-in duration-700">
      {data.title && (
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-8 text-center bg-neutral-50 dark:bg-dark-bg/50 py-2 rounded-xl">
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

