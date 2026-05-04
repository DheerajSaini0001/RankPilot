import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ComposedChart, FunnelChart, Funnel, LabelList,
  Treemap, RadialBarChart, RadialBar, CartesianGrid, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ChartRenderer = ({ type, data }) => {
  // STEP 1 — Data normalization
  const deepFind = (obj, targetKeys) => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of targetKeys) { if (obj[key] !== undefined) return obj[key]; }
    if (obj.data && !Array.isArray(obj.data)) { const found = deepFind(obj.data, targetKeys); if (found) return found; }
    if (obj.chartData) { const found = deepFind(obj.chartData, targetKeys); if (found) return found; }
    return null;
  };

  const getNormalizedData = () => {
    if (!data) return { labels: [], datasets: [] };
    
    // Case 1: Standard Format (labels + datasets)
    if (data.labels && data.datasets) {
      return {
        labels: data.labels || [],
        datasets: data.datasets || [],
        title: data.title || data.data?.title
      };
    }

    // Case 2: Simple Data Format [ { name: '...', value: 100 }, ... ]
    const rawData = data.data || data.chartData || data.rows || [];
    const xAxisKey = data?.xAxis?.dataKey || data?.x_axis_key || 'name';

    if (Array.isArray(rawData) && rawData.length > 0) {
      // If it's a simple array of objects
      if (typeof rawData[0] === 'object') {
        const labels = rawData.map(d => d[xAxisKey] || d.name || d.label || d.category || d.date || 'Item');
        
        // Find all numeric keys that aren't the X-axis key
        const first = rawData[0];
        const numericKeys = Object.keys(first).filter(k => k !== xAxisKey && typeof first[k] === 'number');
        
        const datasets = numericKeys.length > 0 
          ? numericKeys.map(key => ({
              label: key.charAt(0).toUpperCase() + key.slice(1),
              data: rawData.map(d => d[key] ?? 0)
            }))
          : [{ label: 'Value', data: rawData.map(d => d.value || d.size || d.count || 0) }];

        return { labels, datasets, title: data.title || data.data?.title };
      }
      
      // If it's a simple array of numbers
      if (typeof rawData[0] === 'number') {
        return {
          labels: rawData.map((_, i) => `Item ${i+1}`),
          datasets: [{ label: 'Value', data: rawData }],
          title: data.title
        };
      }
    }

    // Fallback: Deep find
    const labels = deepFind(data, ['labels', 'label', 'x_axis', 'categories', 'names']) || [];
    const datasets = deepFind(data, ['datasets', 'dataset', 'values', 'data']) || [];

    return { 
      labels: Array.isArray(labels) ? labels : [], 
      datasets: Array.isArray(datasets) ? (typeof datasets[0] === 'number' ? [{ label: 'Value', data: datasets }] : datasets) : [],
      title: data.title
    };
  };

  const actualData = getNormalizedData();

  if (!actualData.labels.length || !actualData.datasets.length) {
    return (
      <div className="my-4 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-[11px] text-red-500 font-mono leading-relaxed shadow-sm">
        <div className="font-black mb-1 opacity-60 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Visualisation System Error
        </div>
        <div className="opacity-70">Structure mismatch or empty data. Received keys: {Object.keys(data || {}).join(', ')}</div>
      </div>
    );
  }

  // STEP 2 — Chart data reshaping
  const chartData = actualData.labels.map((label, i) => {
    const entry = { name: label };
    actualData.datasets.forEach(ds => {
      const dataArray = Array.isArray(ds) ? ds : (ds.data || ds.values || []);
      const dsLabel = ds.label || ds.name || "Value";
      entry[dsLabel] = dataArray[i] !== undefined ? dataArray[i] : 0;
    });
    return entry;
  });

  const colors = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#F43F5E', '#10B981'];

  // STEP 3 — Shared visual setup
  const GradientDefs = () => (
    <defs>
      {actualData.datasets.map((ds, i) => (
        <React.Fragment key={`grad-${i}`}>
          <linearGradient id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.4} />
            <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`line-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={1} />
            <stop offset="100%" stopColor={colors[(i + 1) % colors.length]} stopOpacity={1} />
          </linearGradient>
        </React.Fragment>
      ))}
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
      </filter>
    </defs>
  );

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const tooltipContentStyle = {
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 20px 40px -8px rgba(0,0,0,0.15)',
    fontSize: '13px',
    fontWeight: 'bold',
    background: isDark ? 'rgba(23,23,23,0.9)' : 'rgba(255,255,255,0.9)',
    color: isDark ? '#F9FAFB' : '#111827',
    backdropFilter: 'blur(12px)'
  };

  const sharedProps = {
    data: chartData,
    margin: { top: 10, right: 30, left: 0, bottom: 0 }
  };

  const sharedXAxis = <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={15} />;
  const sharedYAxis = <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dx={-10} />;
  const sharedGrid = <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} />;
  const sharedLegend = <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '800', paddingTop: '25px' }} iconType="circle" />;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-white dark:border-neutral-800 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">{entry.name}</span>
                </div>
                <span className="text-xs font-black text-neutral-900 dark:text-white">{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // STEP 4 — Chart types
  const renderChart = () => {
    const typeLower = type?.toLowerCase() || 'line';
    
    let finalType = typeLower;
    if (typeLower === 'line' && actualData.datasets && actualData.datasets.length === 1) {
        finalType = 'area';
    }
    if (typeLower === 'area') {
        finalType = 'area';
    }

    if (finalType === 'line') {
      return (
        <LineChart {...sharedProps}>
          <GradientDefs />
          {sharedGrid}
          {sharedXAxis}
          {sharedYAxis}
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => (
            <Line 
              key={ds.label || i} 
              type="monotone" 
              dataKey={ds.label} 
              stroke={`url(#line-${i})`} 
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 3, fill: isDark ? '#171717' : '#ffffff', stroke: colors[i % colors.length] }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: colors[i % colors.length] }}
              filter="url(#shadow)"
            />
          ))}
        </LineChart>
      );
    }

    if (finalType === 'bar') {
      return (
        <BarChart {...sharedProps}>
          <GradientDefs />
          {sharedGrid}
          {sharedXAxis}
          {sharedYAxis}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => (
            <Bar 
              key={ds.label || i} 
              dataKey={ds.label} 
              fill={`url(#color-${i})`} 
              radius={[6, 6, 0, 0]} 
            />
          ))}
        </BarChart>
      );
    }

    if (finalType === 'stacked_bar') {
      return (
        <BarChart {...sharedProps}>
          {sharedGrid}
          {sharedXAxis}
          {sharedYAxis}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => (
            <Bar 
              key={ds.label || i} 
              dataKey={ds.label} 
              fill={colors[i % colors.length]} 
              stackId="a"
            />
          ))}
        </BarChart>
      );
    }

    if (finalType === 'horizontal_bar') {
      return (
        <BarChart layout="vertical" {...sharedProps}>
          <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} width={100} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => (
            <Bar 
              key={ds.label || i} 
              dataKey={ds.label} 
              fill={colors[i % colors.length]} 
              radius={[0, 4, 4, 0]} 
            />
          ))}
        </BarChart>
      );
    }

    if (finalType === 'area') {
      return (
        <AreaChart {...sharedProps}>
          <GradientDefs />
          {sharedGrid}
          {sharedXAxis}
          {sharedYAxis}
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => (
            <Area 
              key={ds.label || i} 
              type="monotone" 
              dataKey={ds.label} 
              stroke={`url(#line-${i})`} 
              fillOpacity={1} 
              fill={`url(#color-${i})`} 
              strokeWidth={4}
              activeDot={{ r: 7, strokeWidth: 3, stroke: isDark ? '#171717' : '#ffffff', fill: colors[i % colors.length] }}
            />
          ))}
        </AreaChart>
      );
    }

    if (finalType === 'pie' || finalType === 'donut') {
      const pieData = actualData.labels.map((label, index) => ({
        name: label,
        value: actualData.datasets[0] ? actualData.datasets[0].data[index] : 0
      }));

      return (
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={finalType === 'donut' ? '60%' : 0}
            outerRadius="80%"
            paddingAngle={5}
            dataKey="value"
            animationDuration={1500}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {sharedLegend}
        </PieChart>
      );
    }

    if (finalType === 'radar') {
      return (
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280', fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 9, fill: isDark ? '#9ca3af' : '#6b7280', fontWeight: 500 }} />
          {actualData.datasets.map((ds, i) => (
            <Radar
              key={ds.label || i}
              name={ds.label}
              dataKey={ds.label}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.5}
              strokeWidth={3}
            />
          ))}
          <Tooltip content={<CustomTooltip />} />
          {sharedLegend}
        </RadarChart>
      );
    }

    if (finalType === 'scatter' || finalType === 'bubble') {
      const isBubble = finalType === 'bubble';
      return (
        <ScatterChart {...sharedProps}>
          {sharedGrid}
          <XAxis type="category" dataKey="name" name="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
          <YAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
          <ZAxis type="number" range={isBubble ? [100, 2000] : [60, 400]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => (
            <Scatter 
              key={ds.label || i} 
              name={ds.label} 
              data={chartData} 
              dataKey={ds.label} 
              fill={colors[i % colors.length]} 
              fillOpacity={isBubble ? 0.6 : 1}
              strokeWidth={2}
              stroke={isDark ? '#171717' : '#fff'}
            />
          ))}
        </ScatterChart>
      );
    }

    if (finalType === 'composed') {
      return (
        <ComposedChart {...sharedProps}>
          <GradientDefs />
          {sharedGrid}
          {sharedXAxis}
          {sharedYAxis}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
          {sharedLegend}
          {actualData.datasets.map((ds, i) => {
            if (i === 0) return <Bar key={ds.label} dataKey={ds.label} barSize={30} fill={`url(#bar-${i})`} radius={[6, 6, 0, 0]} />;
            if (i === 1) return <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={colors[1]} strokeWidth={4} dot={{ r: 4 }} />;
            return <Area key={ds.label} type="monotone" dataKey={ds.label} fill={colors[i % colors.length]} stroke={colors[i % colors.length]} fillOpacity={0.1} />;
          })}
        </ComposedChart>
      );
    }

    if (finalType === 'funnel') {
      const funnelData = chartData.map(item => ({
        name: item.name,
        value: actualData.datasets[0] ? item[actualData.datasets[0].label] : 0,
      })).sort((a, b) => b.value - a.value);

      return (
        <FunnelChart>
          <Tooltip content={<CustomTooltip />} />
          <Funnel dataKey="value" data={funnelData} isAnimationActive>
            <LabelList position="right" fill={isDark ? "#9ca3af" : "#6b7280"} stroke="none" dataKey="name" fontSize={10} fontWeight={600} />
            {funnelData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} fillOpacity={0.8} />
            ))}
          </Funnel>
        </FunnelChart>
      );
    }

    if (finalType === 'radial') {
      const radialData = chartData.map((item, index) => ({
        name: item.name,
        value: actualData.datasets[0] ? Number(item[actualData.datasets[0].label]) : 0,
        fill: colors[index % colors.length]
      }));

      return (
        <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="20%" 
            outerRadius="90%" 
            barSize={12} 
            data={radialData}
            startAngle={180}
            endAngle={-180}
        >
          <RadialBar 
            minAngle={15} 
            background={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', radius: 10 }} 
            clockWise 
            dataKey="value" 
            cornerRadius={10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: '800' }} />
        </RadialBarChart>
      );
    }

    if (finalType === 'treemap') {
      const treemapData = chartData.map(item => ({
        name: item.name,
        size: actualData.datasets[0] ? Number(item[actualData.datasets[0].label]) : 0
      }));

      const CustomizedTreemapContent = (props) => {
        const { root, depth, x, y, width, height, index, name } = props;
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              style={{
                fill: colors[index % colors.length],
                stroke: isDark ? '#171717' : '#fff',
                strokeWidth: 2 / (depth + 1),
                strokeOpacity: 1,
              }}
              rx={4}
              ry={4}
            />
            {width > 30 && height > 30 && (
              <text x={x + 10} y={y + 20} fill="#fff" fontSize={10} fontWeight={800} fillOpacity={0.9}>
                {name}
              </text>
            )}
          </g>
        );
      };

      return (
        <Treemap 
            data={treemapData} 
            dataKey="size" 
            aspectRatio={4 / 3} 
            stroke="none" 
            content={<CustomizedTreemapContent />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      );
    }

    if (finalType === 'geo_map') {
      const maxVal = Math.max(...(actualData.datasets[0]?.data || [1]));
      const countryData = {};
      actualData.labels.forEach((label, i) => {
        countryData[label.toLowerCase()] = actualData.datasets[0]?.data[i] || 0;
      });

      return (
        <div className="w-full h-full flex items-center justify-center">
            <ComposableMap projectionConfig={{ scale: 140 }}>
            <Geographies geography={geoUrl}>
                {({ geographies }) =>
                geographies.map((geo) => {
                    const countryName = geo.properties.name.toLowerCase();
                    const val = countryData[countryName] || 0;
                    const opacity = val ? 0.3 + (val / maxVal) * 0.7 : 0.1;
                    return (
                        <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={val ? colors[0] : isDark ? '#374151' : '#e5e7eb'}
                            style={{
                                default: { outline: "none", opacity: val ? opacity : 1 },
                                hover: { outline: "none", fill: colors[1] },
                                pressed: { outline: "none", fill: colors[2] },
                            }}
                        />
                    );
                })
                }
            </Geographies>
            </ComposableMap>
        </div>
      );
    }

    return null;
  };

  // STEP 5 — Wrapper rendering
  if ((type || '').toLowerCase() === 'table') {
    const isArrayFormat = actualData.datasets && actualData.datasets[0] && Array.isArray(actualData.datasets[0].data[0]);
    
    return (
      <div className="flex flex-col w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm overflow-hidden">
        {actualData.title && (
          <h4 className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-neutral-500 to-neutral-400 dark:from-neutral-400 dark:to-neutral-500 bg-clip-text text-transparent mb-4 text-center">
            {actualData.title}
          </h4>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                {isArrayFormat ? (
                  actualData.labels.map((label, idx) => (
                    <th key={idx} className="p-3 border-b border-neutral-200 dark:border-neutral-700 font-bold text-neutral-900 dark:text-neutral-100">{label}</th>
                  ))
                ) : (
                  <>
                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700 font-bold text-neutral-900 dark:text-neutral-100">Name</th>
                    {actualData.datasets.map(ds => (
                      <th key={ds.label} className="p-3 border-b border-neutral-200 dark:border-neutral-700 font-bold text-neutral-900 dark:text-neutral-100">{ds.label}</th>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {isArrayFormat ? (
                actualData.datasets[0].data.map((rowArr, i) => (
                  <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                    {rowArr.map((cell, j) => (
                      <td key={j} className="p-3 text-neutral-700 dark:text-neutral-300 font-medium">{cell}</td>
                    ))}
                  </tr>
                ))
              ) : (
                chartData.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                    <td className="p-3 text-neutral-700 dark:text-neutral-300 font-medium">{row.name}</td>
                    {actualData.datasets.map(ds => (
                      <td key={ds.label} className="p-3 text-neutral-600 dark:text-neutral-400">{row[ds.label]}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[260px] sm:h-[300px] bg-white/40 dark:bg-neutral-900/40 border border-white/50 dark:border-neutral-800/50 rounded-[1.25rem] p-3 sm:p-4 shadow-sm relative animate-in fade-in zoom-in duration-700 backdrop-blur-xl">
      {actualData.title && (
        <h4 className="shrink-0 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-neutral-500 to-neutral-400 dark:from-neutral-400 dark:to-neutral-500 bg-clip-text text-transparent mb-6 text-center">
          {actualData.title}
        </h4>
      )}
      <div className="flex-1 min-h-0 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(ChartRenderer);
