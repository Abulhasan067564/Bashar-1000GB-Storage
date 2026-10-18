import React, { useState, useMemo } from 'react';
import { StorageFile, StorageStats, FileCategory } from '../../types/storage';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  HardDrive,
  Files,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code2,
  HelpCircle,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  Database,
  Sparkles
} from 'lucide-react';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: StorageFile[];
  stats: StorageStats;
  lang: 'bn' | 'en';
}

const CATEGORY_COLORS: Record<FileCategory, string> = {
  image: '#06b6d4', // cyan-500
  video: '#a855f7', // purple-500
  audio: '#10b981', // emerald-500
  document: '#3b82f6', // blue-500
  archive: '#f59e0b', // amber-500
  code: '#f43f5e', // rose-500
  other: '#94a3b8' // slate-400
};

const CATEGORY_ICONS: Record<FileCategory, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  code: Code2,
  other: HelpCircle
};

const CATEGORY_LABELS_BN: Record<FileCategory, string> = {
  image: 'ছবি (Images)',
  video: 'ভিডিও (Videos)',
  audio: 'অডিও (Audio)',
  document: 'ডকুমেন্ট (Documents)',
  archive: 'জিপ/আর্কাইভ (Archives)',
  code: 'কোড (Code & Scripts)',
  other: 'অন্যান্য (Others)'
};

const CATEGORY_LABELS_EN: Record<FileCategory, string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  document: 'Documents',
  archive: 'Archives',
  code: 'Code',
  other: 'Others'
};

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  files,
  stats,
  lang
}) => {
  const [trendView, setTrendView] = useState<'cumulative' | 'daily'>('cumulative');
  const [activeTab, setActiveTab] = useState<'trends' | 'categories'>('trends');

  const activeFiles = useMemo(() => files.filter(f => !f.inTrash && !f.isFolder), [files]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatBytesToMB = (bytes: number) => {
    return parseFloat((bytes / (1024 * 1024)).toFixed(2));
  };

  // 1. Compute 30-day timeline growth trends
  const trendData = useMemo(() => {
    const days: { dateStr: string; label: string; dailyBytes: number; count: number }[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
      days.push({ dateStr, label, dailyBytes: 0, count: 0 });
    }

    // Accumulate files into days
    activeFiles.forEach(f => {
      const fDate = new Date(f.uploadedAt);
      const yyyy = fDate.getFullYear();
      const mm = String(fDate.getMonth() + 1).padStart(2, '0');
      const dd = String(fDate.getDate()).padStart(2, '0');
      const fileDayStr = `${yyyy}-${mm}-${dd}`;

      const matchedDay = days.find(d => d.dateStr === fileDayStr);
      if (matchedDay) {
        matchedDay.dailyBytes += f.size || 0;
        matchedDay.count += 1;
      } else {
        // If uploaded before the 30-day window, it counts towards initial baseline
        // Handled in cumulative calculation below
      }
    });

    // Calculate baseline before 30-day window
    const windowStartDate = new Date(today);
    windowStartDate.setDate(windowStartDate.getDate() - 29);
    windowStartDate.setHours(0, 0, 0, 0);

    let baselineBytes = 0;
    activeFiles.forEach(f => {
      if (new Date(f.uploadedAt) < windowStartDate) {
        baselineBytes += f.size || 0;
      }
    });

    // Generate cumulative points
    let currentCumulative = baselineBytes;
    return days.map(day => {
      currentCumulative += day.dailyBytes;
      return {
        date: day.label,
        dateKey: day.dateStr,
        dailyMB: formatBytesToMB(day.dailyBytes),
        cumulativeMB: formatBytesToMB(currentCumulative),
        cumulativeBytes: currentCumulative,
        dailyBytes: day.dailyBytes,
        fileCount: day.count
      };
    });
  }, [activeFiles, lang]);

  // Total 30-day growth
  const total30DayGrowthBytes = useMemo(() => {
    return trendData.reduce((acc, curr) => acc + curr.dailyBytes, 0);
  }, [trendData]);

  // 2. Compute Top-Consuming File Types
  const categoryData = useMemo(() => {
    const map: Record<FileCategory, { category: FileCategory; bytes: number; count: number }> = {
      image: { category: 'image', bytes: 0, count: 0 },
      video: { category: 'video', bytes: 0, count: 0 },
      audio: { category: 'audio', bytes: 0, count: 0 },
      document: { category: 'document', bytes: 0, count: 0 },
      archive: { category: 'archive', bytes: 0, count: 0 },
      code: { category: 'code', bytes: 0, count: 0 },
      other: { category: 'other', bytes: 0, count: 0 }
    };

    activeFiles.forEach(f => {
      const cat = f.category || 'other';
      if (!map[cat]) {
        map[cat] = { category: cat, bytes: 0, count: 0 };
      }
      map[cat].bytes += f.size || 0;
      map[cat].count += 1;
    });

    const totalUsed = stats.usedBytes || 1; // avoid / 0

    return Object.values(map)
      .map(item => {
        const percentage = (item.bytes / totalUsed) * 100;
        return {
          name: lang === 'bn' ? CATEGORY_LABELS_BN[item.category] : CATEGORY_LABELS_EN[item.category],
          category: item.category,
          bytes: item.bytes,
          mb: formatBytesToMB(item.bytes),
          percentage: parseFloat(percentage.toFixed(1)),
          count: item.count,
          color: CATEGORY_COLORS[item.category]
        };
      })
      .sort((a, b) => b.bytes - a.bytes);
  }, [activeFiles, stats.usedBytes, lang]);

  // Largest file
  const largestFile = useMemo(() => {
    if (activeFiles.length === 0) return null;
    return [...activeFiles].sort((a, b) => (b.size || 0) - (a.size || 0))[0];
  }, [activeFiles]);

  // Average file size
  const averageFileSize = useMemo(() => {
    if (activeFiles.length === 0) return 0;
    return Math.round(stats.usedBytes / activeFiles.length);
  }, [activeFiles.length, stats.usedBytes]);

  // Top category
  const topCategory = categoryData[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Background Decorative Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/25 shrink-0">
              <BarChart3 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {lang === 'bn' ? 'স্টোরেজ অ্যানালিটিক্স ড্যাশবোর্ড' : 'Storage Analytics Dashboard'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Recharts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'বিগত ৩০ দিনের স্টোরেজ বৃদ্ধি এবং শীর্ষ ডাটা ব্যবহারকারী ফাইল টাইপ'
                  : 'Storage growth over the last 30 days and top-consuming file types'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top KPI Metrics Cards */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 py-4">
          {/* Card 1: Total Used Storage */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{lang === 'bn' ? 'ব্যবহৃত স্টোরেজ' : 'Total Consumed'}</span>
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {formatBytes(stats.usedBytes)}
            </div>
            <div className="text-[11px] text-cyan-400 font-semibold mt-1">
              {((stats.usedBytes / stats.totalBytes) * 100).toFixed(2)}% {lang === 'bn' ? '(১০০০ জিবি কোটা)' : 'of 1,000 GB'}
            </div>
          </div>

          {/* Card 2: 30-Day Growth */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{lang === 'bn' ? '৩০ দিনের বৃদ্ধি' : '30-Day Growth'}</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono flex items-center gap-1">
              <span>+{formatBytes(total30DayGrowthBytes)}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {lang === 'bn' ? 'বিগত ৩০ দিনে আপলোড' : 'added in last 30 days'}
            </div>
          </div>

          {/* Card 3: Total Active Files */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{lang === 'bn' ? 'সক্রিয় ফাইল সংখ্যা' : 'Active Files'}</span>
              <Files className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {activeFiles.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {lang === 'bn' ? `গড় সাইজ: ${formatBytes(averageFileSize)}` : `Avg: ${formatBytes(averageFileSize)}`}
            </div>
          </div>

          {/* Card 4: Largest File */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{lang === 'bn' ? 'সর্ববৃহৎ ফাইল' : 'Largest File'}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-300 truncate" title={largestFile?.name || 'N/A'}>
              {largestFile ? largestFile.name : (lang === 'bn' ? 'কোনো ফাইল নেই' : 'No files')}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              {largestFile ? formatBytes(largestFile.size) : '0 B'}
            </div>
          </div>
        </div>

        {/* Tabs Switcher */}
        <div className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'trends'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{lang === 'bn' ? '৩০ দিনের গ্রোথ ট্রেন্ড' : '30-Day Growth Trends'}</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <PieIcon className="w-4 h-4" />
              <span>{lang === 'bn' ? 'শীর্ষ ডাটা ব্যবহারকারী টাইপ' : 'Top Consuming Types'}</span>
            </button>
          </div>

          {activeTab === 'trends' && (
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTrendView('cumulative')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  trendView === 'cumulative' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'bn' ? 'মোট সঞ্চিত' : 'Cumulative'}
              </button>
              <button
                onClick={() => setTrendView('daily')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  trendView === 'daily' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'bn' ? 'দৈনিক' : 'Daily'}
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: 30-Day Growth Trends */}
          {activeTab === 'trends' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span>
                        {trendView === 'cumulative'
                          ? (lang === 'bn' ? 'বিগত ৩০ দিনের মোট সঞ্চিত স্টোরেজ কার্ভ (Cumulative MB)' : 'Cumulative Storage Growth (MB) Over 30 Days')
                          : (lang === 'bn' ? 'বিগত ৩০ দিনের দৈনিক আপলোড সাইজ (Daily Added MB)' : 'Daily Uploads (MB) Over Last 30 Days')}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'মাউস দিয়ে গ্রাফে পয়েন্টের উপর নিলে বিস্তারিত তথ্য দেখা যাবে'
                        : 'Hover over the chart points to inspect daily metrics'}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    30 Days Window
                  </span>
                </div>

                {/* Recharts Area / Bar Chart */}
                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {trendView === 'cumulative' ? (
                      <AreaChart data={trendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          interval={4}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          unit=" MB"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                          }}
                          formatter={(value: any) => [`${value} MB`, lang === 'bn' ? 'মোট স্টোরেজ' : 'Storage']}
                          labelFormatter={(label) => `${lang === 'bn' ? 'তারিখ' : 'Date'}: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativeMB"
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#growthGradient)"
                          activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={trendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          interval={4}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          unit=" MB"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                          }}
                          formatter={(value: any, _name: any, item: any) => [
                            `${value} MB (${item?.payload?.fileCount || 0} ${lang === 'bn' ? 'টি ফাইল' : 'files'})`,
                            lang === 'bn' ? 'দৈনিক আপলোড' : 'Uploaded'
                          ]}
                          labelFormatter={(label) => `${lang === 'bn' ? 'তারিখ' : 'Date'}: ${label}`}
                        />
                        <Bar
                          dataKey="dailyMB"
                          fill="#38bdf8"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 30-Day Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-xs">
                  <div className="text-slate-400 mb-1">{lang === 'bn' ? 'সর্বোচ্চ আপলোডের দিন' : 'Peak Ingest Day'}</div>
                  <div className="text-white font-bold text-sm">
                    {[...trendData].sort((a, b) => b.dailyBytes - a.dailyBytes)[0]?.date || 'N/A'}
                  </div>
                  <div className="text-cyan-400 font-mono mt-0.5">
                    {[...trendData].sort((a, b) => b.dailyBytes - a.dailyBytes)[0]?.dailyMB || 0} MB
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-xs">
                  <div className="text-slate-400 mb-1">{lang === 'bn' ? 'দৈনিক গড় আপলোড' : 'Avg Daily Ingest'}</div>
                  <div className="text-white font-bold text-sm">
                    {(total30DayGrowthBytes / 30 / (1024 * 1024)).toFixed(2)} MB / {lang === 'bn' ? 'দিন' : 'day'}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {lang === 'bn' ? 'ধারাবাহিক গতি' : 'consistent throughput'}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-xs">
                  <div className="text-slate-400 mb-1">{lang === 'bn' ? 'ফ্রি স্টোরেজ বাকি' : 'Free Quota Remaining'}</div>
                  <div className="text-emerald-300 font-bold text-sm font-mono">
                    {formatBytes(stats.freeBytes)}
                  </div>
                  <div className="text-emerald-500/80 mt-0.5">
                    {((stats.freeBytes / stats.totalBytes) * 100).toFixed(1)}% {lang === 'bn' ? 'ফ্রি' : 'available'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Top-Consuming File Types */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Recharts Pie Donut Chart */}
                <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5 self-start">
                    <PieIcon className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'bn' ? 'ক্যাটাগরি ডিস্ট্রিবিউশন' : 'Storage Distribution'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-2 self-start">
                    {lang === 'bn' ? 'কোন ধরনের ফাইল কতটুকু জায়গা নিচ্ছে' : 'Proportional breakdown by format category'}
                  </p>

                  <div className="w-full h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData.filter(c => c.bytes > 0)}
                          dataKey="bytes"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {categoryData.filter(c => c.bytes > 0).map((entry) => (
                            <Cell key={entry.category} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px'
                          }}
                          formatter={(val: any) => [formatBytes(Number(val)), lang === 'bn' ? 'সাইজ' : 'Size']}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Inner Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium">
                        {lang === 'bn' ? 'সর্বোচ্চ' : 'Top Type'}
                      </span>
                      <span className="text-base font-black text-white font-mono">
                        {topCategory && topCategory.bytes > 0 ? `${topCategory.percentage}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ranked Leaderboard of Top Consuming Types */}
                <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-blue-400" />
                      <span>{lang === 'bn' ? 'শীর্ষ ডাটা ব্যবহারকারী তালিকা' : 'Top Data Consumers Leaderboard'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">
                      {lang === 'bn' ? 'সাইজের ভিত্তিতে সাজানো ফাইল ক্যাটাগরি' : 'Ranked from highest consuming category to lowest'}
                    </p>

                    <div className="space-y-2.5">
                      {categoryData.map((item, idx) => {
                        const IconComponent = CATEGORY_ICONS[item.category] || HelpCircle;
                        return (
                          <div
                            key={item.category}
                            className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-mono font-bold text-slate-500 w-4">
                                #{idx + 1}
                              </span>
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${item.color}20`, color: item.color }}
                              >
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({item.count} {lang === 'bn' ? 'টি' : 'files'})
                                  </span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="w-28 sm:w-40 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.max(item.percentage, item.bytes > 0 ? 3 : 0)}%`,
                                      backgroundColor: item.color
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-white font-mono">
                                {formatBytes(item.bytes)}
                              </div>
                              <div className="text-[10px] font-semibold" style={{ color: item.color }}>
                                {item.percentage}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {lang === 'bn'
                ? '১ টেরাবাইট (১০০০ জিবি) হাই-স্পিড ক্লাউড স্টোরেজে সুরক্ষিত'
                : 'Secured on Bashar 1000GB Cloud Storage'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold transition cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
