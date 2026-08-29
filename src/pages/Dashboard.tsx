import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder } from '../types';
import {
  Camera,
  MapPin,
  Activity,
  Compass,
  Image as ImageIcon,
} from 'lucide-react';
import { format, subYears, startOfWeek, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ErrorFallback } from '../components/ErrorFallback';
import { getUserFoldersOptimized, getFriendsList } from '../lib/firestoreService';

interface DashboardData {
  stats: {
    totalPhotos: number;
    totalLocations: number;
    totalCountries: number;
    totalFriends: number;
    countries: string[];
    farthestLocation: string;
    mostActiveMonth: string;
  };
  topFolders: LocationFolder[];
  monthlyData: { month: string; count: number }[];
  heatmap: Record<string, number>;
  timeline: LocationFolder[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function buildHeatmapGrid(heatmapRecord: Record<string, number>): { date: Date; count: number }[][] {
  const today = new Date();
  const start = startOfWeek(subYears(today, 1), { weekStartsOn: 1 });

  const weeks: { date: Date; count: number }[][] = [];
  let cursor = start;
  while (cursor <= today) {
    const week: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(cursor, d);
      const key = format(day, 'yyyy-MM-dd');
      week.push({ date: day, count: heatmapRecord[key] ?? 0 });
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function heatmapColor(count: number, max: number): string {
  if (count === 0) return 'bg-surface';
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return 'bg-brand/20';
  if (ratio < 0.5) return 'bg-brand/40';
  if (ratio < 0.75) return 'bg-brand/70';
  return 'bg-brand';
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 page-enter">
      {/* Header */}
      <div className="skeleton h-10 w-64 rounded-xl" />
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
      {/* Heatmap */}
      <div className="skeleton h-44 rounded-2xl" />
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
      {/* Timeline */}
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  );
}

// ─── StatCard ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}

function StatCard({ icon, label, value, sub, delay = 0 }: StatCardProps) {
  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col gap-3 card-hover-lift stagger-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-text-dim mb-1">{label}</div>
        <div className="text-3xl font-extrabold gradient-text leading-none">{value}</div>
        {sub && <div className="text-[12px] text-text-dim mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─── HeatmapSection ─────────────────────────────────────────────────────────

interface HeatmapProps {
  weeks: { date: Date; count: number }[][];
  max: number;
}

function HeatmapSection({ weeks, max }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const m = week[0].date.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: format(week[0].date, 'MMM', { locale: vi }), col });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="glass-card rounded-2xl p-6 stagger-item relative overflow-x-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-text-heading">Hoạt động theo ngày</h2>
        <div className="flex items-center gap-2 text-[11px] text-text-dim">
          <span>Ít</span>
          <div className="flex gap-0.5">
            {['bg-surface', 'bg-brand/20', 'bg-brand/40', 'bg-brand/70', 'bg-brand'].map((cls) => (
              <div key={cls} className={`w-3 h-3 rounded-[3px] border border-border-dim ${cls}`} />
            ))}
          </div>
          <span>Nhiều</span>
        </div>
      </div>

      <div className="min-w-[680px]">
        <div className="flex mb-1 pl-8" style={{ gap: '2px' }}>
          {weeks.map((_, col) => {
            const lbl = monthLabels.find((m) => m.col === col);
            return (
              <div key={col} className="flex-1 min-w-[12px] text-[9px] text-text-dim font-medium">
                {lbl ? lbl.label : ''}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0.5">
          <div className="flex flex-col gap-0.5 pr-1.5">
            {days.map((d) => (
              <div key={d} className="h-3 text-[9px] text-text-dim leading-3 flex items-center">
                {d}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5 flex-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5 flex-1 min-w-[10px]">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={`h-3 rounded-[2px] border border-border-dim cursor-default transition-opacity hover:opacity-80 ${heatmapColor(cell.count, max)}`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        text: `${format(cell.date, 'dd/MM/yyyy')}: ${cell.count} ảnh`,
                        x: rect.left,
                        y: rect.top - 28,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-bg-card/95 backdrop-blur-xl border border-border-dim text-text-main text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ─── TopLocations ────────────────────────────────────────────────────────────

interface TopLocationsProps {
  folders: LocationFolder[];
}

function TopLocations({ folders }: TopLocationsProps) {
  const top5 = useMemo(
    () => [...folders].sort((a, b) => b.photoCount - a.photoCount).slice(0, 5),
    [folders]
  );
  const maxCount = top5[0]?.photoCount ?? 1;

  return (
    <div className="glass-card rounded-2xl p-6 stagger-item">
      <h2 className="text-lg font-bold text-text-heading mb-5">Top địa điểm</h2>
      {top5.length === 0 ? (
        <div className="text-text-dim text-sm py-8 text-center">Chưa có dữ liệu</div>
      ) : (
        <div className="flex flex-col gap-4">
          {top5.map((folder, i) => {
            const pct = Math.round((folder.photoCount / maxCount) * 100);
            return (
              <div key={folder.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-text-dim w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-text-main truncate">
                      {folder.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-brand shrink-0">{folder.photoCount} ảnh</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand/70 to-brand rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PhotosByMonth ────────────────────────────────────────────────────────────

interface PhotosByMonthProps {
  monthlyData: { month: string; count: number }[];
}

function PhotosByMonth({ monthlyData }: PhotosByMonthProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1);

  return (
    <div className="glass-card rounded-2xl p-6 stagger-item">
      <h2 className="text-lg font-bold text-text-heading mb-5">Ảnh theo tháng</h2>
      <div className="flex items-end gap-1.5 h-40">
        {monthlyData.map((m, i) => {
          const heightPct = (m.count / maxCount) * 100;
          return (
            <div
              key={m.month}
              className="flex-1 flex flex-col items-center gap-1 group cursor-default"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {hoveredIdx === i && m.count > 0 && (
                <div className="bg-bg-card/95 backdrop-blur-xl border border-border-dim text-text-main text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  {m.count} ảnh
                </div>
              )}
              <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${
                    hoveredIdx === i
                      ? 'bg-brand'
                      : 'bg-gradient-to-t from-brand/60 to-brand/30'
                  }`}
                  style={{ height: `${Math.max(heightPct, m.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-[9px] text-text-dim font-medium capitalize">{m.month.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── JourneyTimeline ─────────────────────────────────────────────────────────

interface JourneyTimelineProps {
  folders: LocationFolder[];
}

function JourneyTimeline({ folders }: JourneyTimelineProps) {
  const sorted = useMemo(
    () => [...folders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [folders]
  );

  return (
    <div className="glass-card rounded-2xl p-6 stagger-item">
      <h2 className="text-lg font-bold text-text-heading mb-6">Lịch sử hành trình</h2>
      {sorted.length === 0 ? (
        <div className="text-text-dim text-sm py-8 text-center">Chưa có hành trình nào</div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-brand/60 via-brand/20 to-transparent" />
          <div className="flex flex-col gap-0">
            {sorted.map((folder, i) => (
              <div key={folder.id} className="flex gap-4 group stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative flex-shrink-0 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-200 ${
                      i === 0
                        ? 'border-brand bg-brand/20 text-brand'
                        : 'border-border-dim bg-surface text-text-dim group-hover:border-brand/60 group-hover:text-brand'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  {i < sorted.length - 1 && <div className="w-px flex-1 min-h-[24px] bg-border-dim mt-1" />}
                </div>

                <div className="flex-1 pb-5 pt-0.5">
                  <div className="flex items-start gap-3">
                    {folder.coverPhotoUrl ? (
                      <img
                        src={folder.coverPhotoUrl}
                        alt={folder.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-border-dim image-reveal"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-surface border border-border-dim flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-text-dim" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text-heading text-sm truncate group-hover:text-brand transition-colors">
                        {folder.name}
                      </div>
                      <div className="text-[11px] text-text-dim mt-0.5">
                        {folder.createdAt
                          ? format(new Date(folder.createdAt), 'dd MMM yyyy', { locale: vi })
                          : 'Không rõ ngày'}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-dim bg-surface border border-border-dim rounded-full px-2.5 py-0.5">
                          <Camera className="w-3 h-3" />
                          {folder.photoCount} ảnh
                        </span>
                        {(folder.city || folder.country) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-dim">
                            <MapPin className="w-3 h-3" />
                            {[folder.city, folder.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [folders, friends] = await Promise.all([
        getUserFoldersOptimized(user.uid, 500),
        getFriendsList(user.uid),
      ]);

      const totalPhotos = folders.reduce((sum, f) => sum + (f.photoCount || 0), 0);
      const countries = Array.from(new Set(folders.map((f) => f.country).filter(Boolean))) as string[];

      // Build monthly counts
      const monthlyMap: Record<string, number> = {};
      const heatmap: Record<string, number> = {};

      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = format(d, 'MM/yyyy');
        monthlyMap[key] = 0;
      }

      folders.forEach((f) => {
        if (f.createdAt) {
          const date = new Date(f.createdAt);
          const monthKey = format(date, 'MM/yyyy');
          if (monthlyMap[monthKey] !== undefined) {
            monthlyMap[monthKey] += f.photoCount || 1;
          }
          const dayKey = format(date, 'yyyy-MM-dd');
          heatmap[dayKey] = (heatmap[dayKey] || 0) + (f.photoCount || 1);
        }
      });

      const monthlyData = Object.entries(monthlyMap).map(([month, count]) => ({
        month,
        count,
      }));

      const topFolders = [...folders].sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0)).slice(0, 5);

      setData({
        stats: {
          totalPhotos,
          totalLocations: folders.length,
          totalCountries: countries.length,
          totalFriends: friends.length,
          countries,
          farthestLocation: folders[0]?.name || 'Chưa xác định',
          mostActiveMonth: monthlyData[0]?.month || 'Không có',
        },
        topFolders,
        monthlyData,
        heatmap,
        timeline: folders,
      });
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err : new Error(err?.message || 'Không thể tải dữ liệu thống kê'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  // Heatmap
  const heatmapWeeks = useMemo(() => {
    if (!data) return [];
    return buildHeatmapGrid(data.heatmap);
  }, [data]);

  const heatmapMax = useMemo(() => {
    if (heatmapWeeks.length === 0) return 1;
    return Math.max(...heatmapWeeks.flat().map((c) => c.count), 1);
  }, [heatmapWeeks]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <ErrorFallback
          error={error}
          title="Không thể tải dữ liệu thống kê"
          message={error?.message || 'Đã xảy ra lỗi khi lấy dữ liệu tổng quan.'}
          onRetry={fetchStats}
          fullScreen
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-text-heading">
          Analytics
          <span className="gradient-text"> Dashboard</span>
        </h1>
        <p className="text-text-dim text-sm mt-1">Thống kê cá nhân về hành trình của bạn</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Camera className="w-5 h-5" />}
          label="Tổng ảnh đã chụp"
          value={data.stats.totalPhotos.toLocaleString()}
          sub="ảnh trong kho"
          delay={0}
        />
        <StatCard
          icon={<MapPin className="w-5 h-5" />}
          label="Địa điểm đã ghé"
          value={data.stats.totalLocations.toLocaleString()}
          sub="vị trí unique"
          delay={50}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Tháng hoạt động nhất"
          value={data.stats.mostActiveMonth === '—' ? '—' : data.stats.mostActiveMonth.split(' ')[0]}
          sub={data.stats.mostActiveMonth !== '—' ? data.stats.mostActiveMonth.split(' ')[1] ?? '' : 'Chưa có dữ liệu'}
          delay={100}
        />
        <StatCard
          icon={<Compass className="w-5 h-5" />}
          label="Địa điểm xa nhất"
          value={data.stats.farthestLocation === '—' ? '—' : data.stats.farthestLocation.split('·')[0].trim()}
          sub={
            data.stats.farthestLocation !== '—'
              ? data.stats.farthestLocation.split('·')[1]?.trim() ?? ''
              : 'Cần thêm địa điểm'
          }
          delay={150}
        />
      </div>

      {/* Activity Heatmap */}
      <HeatmapSection weeks={heatmapWeeks} max={heatmapMax} />

      {/* Top Locations + Photos by Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopLocations folders={data.topFolders} />
        <PhotosByMonth monthlyData={data.monthlyData} />
      </div>

      {/* Journey Timeline */}
      <JourneyTimeline folders={data.timeline} />
    </div>
  );
}
