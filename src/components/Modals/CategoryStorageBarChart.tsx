import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import {
  FileCategory
} from '../../types/storage';
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Code2,
  HelpCircle,
  TrendingUp,
  Flame,
  ArrowUpDown,
  Layers,
  Sparkles
} from 'lucide-react';

export interface CategoryDataPoint {
  name: string;
  category: FileCategory;
  bytes: number;
  mb: number;
  percentage: number;
  count: number;
  color: string;
}

interface CategoryStorageBarChartProps {
  categoryData: CategoryDataPoint[];
  totalUsedBytes: number;
  formatBytes: (bytes: number) => string;
  lang: 'bn' | 'en';
}

const CATEGORY_ICONS: Record<FileCategory, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  code: Code2,
  other: HelpCircle
};

export const CategoryStorageBarChart: React.FC<CategoryStorageBarChartProps> = ({
  categoryData,
  totalUsedBytes,
  formatBytes,
  lang
}) => {
  const [metric, setMetric] = useState<'size' | 'percent'>('size');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');

  // Sorted by size descending to immediately highlight what is taking up the most space
  const sortedData = useMemo(() => {
    return [...categoryData].sort((a, b) => b.bytes - a.bytes);
  }, [categoryData]);

  // Identify the category taking up the most space
  const topConsumer = sortedData[0];
  const TopIcon = topConsumer ? (CATEGORY_ICONS[topConsumer.category] || HelpCircle) : HelpCircle;

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return sortedData.map(item => ({
      ...item,
      chartValue: metric === 'size' ? item.mb : item.percentage,
      shortLabel: item.name.split(' ')[0] // e.g. "ছবি" or "Images"
    }));
  }, [sortedData, metric]);

  const hasData = totalUsedBytes > 0 && sortedData.some(d => d.bytes > 0);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'ক্যাটাগরি ভিত্তিক স্টোরেজ ব্যবহার (Bar Chart)' : 'Storage Usage per File Category'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'কোন ফাইল টাইপ সবচেয়ে বেশি জায়গা নিচ্ছে তা দ্রুত শনাক্ত করুন'
              : 'Quickly identify which file category is consuming the most space'}
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Metric Toggle: MB vs % */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setMetric('size')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                metric === 'size' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সাইজ (MB)' : 'Size (MB)'}
            </button>
            <button
              onClick={() => setMetric('percent')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                metric === 'percent' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              % {lang === 'bn' ? 'অনুপাত' : 'Share'}
            </button>
          </div>

          {/* Orientation Toggle: Vertical vs Horizontal */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setOrientation('vertical')}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                orientation === 'vertical' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Vertical Bars"
            >
              {lang === 'bn' ? 'খাড়া বার' : 'Vertical'}
            </button>
            <button
              onClick={() => setOrientation('horizontal')}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                orientation === 'horizontal' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Horizontal Bars"
            >
              {lang === 'bn' ? 'অনুভূমিক' : 'Horizontal'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Space Consumer Highlight Banner */}
      {topConsumer && topConsumer.bytes > 0 && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-cyan-950/60 border border-amber-500/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${topConsumer.color}25`, color: topConsumer.color }}
            >
              <TopIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'শীর্ষ জায়গা দখলকারী ক্যাটাগরি' : 'Top Space Consumer'}</span>
              </div>
              <div className="text-xs font-bold text-white">
                {topConsumer.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-sm font-black text-white font-mono">
                {formatBytes(topConsumer.bytes)}
              </div>
              <div className="text-[10px] font-bold text-cyan-400">
                {topConsumer.percentage}% {lang === 'bn' ? 'ব্যবহৃত স্টোরেজের' : 'of total used'} ({topConsumer.count} {lang === 'bn' ? 'টি ফাইল' : 'files'})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recharts Bar Visualization */}
      <div className="w-full h-72 sm:h-80 relative">
        {!hasData ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Layers className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <span>{lang === 'bn' ? 'কোনো ফাইল আপলোড করা হয়নি।' : 'No uploaded files yet.'}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {orientation === 'vertical' ? (
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 15, left: -5, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  tick={{ fill: '#cbd5e1' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  unit={metric === 'size' ? ' MB' : '%'}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as CategoryDataPoint;
                      const Icon = CATEGORY_ICONS[data.category] || HelpCircle;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-44">
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: `${data.color}25`, color: data.color }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="font-bold text-white">{data.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">{lang === 'bn' ? 'মোট সাইজ:' : 'Total Size:'}</span>
                            <span className="font-mono font-bold text-white">{formatBytes(data.bytes)}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">{lang === 'bn' ? 'স্টোরেজ অংশ:' : 'Share:'}</span>
                            <span className="font-bold font-mono" style={{ color: data.color }}>{data.percentage}%</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">{lang === 'bn' ? 'ফাইলের সংখ্যা:' : 'Files:'}</span>
                            <span className="font-mono text-cyan-300 font-semibold">{data.count} {lang === 'bn' ? 'টি' : 'files'}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="chartValue"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`bar-cell-${entry.category}`}
                      fill={entry.color}
                      stroke={entry.color}
                      strokeOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  unit={metric === 'size' ? ' MB' : '%'}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  dataKey="shortLabel"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tick={{ fill: '#cbd5e1' }}
                  width={60}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as CategoryDataPoint;
                      const Icon = CATEGORY_ICONS[data.category] || HelpCircle;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-44">
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: `${data.color}25`, color: data.color }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="font-bold text-white">{data.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">{lang === 'bn' ? 'মোট সাইজ:' : 'Total Size:'}</span>
                            <span className="font-mono font-bold text-white">{formatBytes(data.bytes)}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">{lang === 'bn' ? 'স্টোরেজ অংশ:' : 'Share:'}</span>
                            <span className="font-bold font-mono" style={{ color: data.color }}>{data.percentage}%</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">{lang === 'bn' ? 'ফাইলের সংখ্যা:' : 'Files:'}</span>
                            <span className="font-mono text-cyan-300 font-semibold">{data.count} {lang === 'bn' ? 'টি' : 'files'}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="chartValue"
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`h-bar-cell-${entry.category}`}
                      fill={entry.color}
                      stroke={entry.color}
                      strokeOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Category Legend & Quick Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-800/80">
        {sortedData.map((item) => {
          const Icon = CATEGORY_ICONS[item.category] || HelpCircle;
          return (
            <div
              key={`chip-${item.category}`}
              className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-bold text-slate-300 truncate">{item.name.split(' ')[0]}</span>
              </div>
              <div className="text-xs font-black text-white font-mono">
                {formatBytes(item.bytes)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                <span>{item.percentage}%</span>
                <span>{item.count}f</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
