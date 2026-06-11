import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder, Photo } from '../types';
import {
  Camera,
  MapPin,
  Activity,
  Compass,
  Image as ImageIcon,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, subYears, startOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

// ─── helpers ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildHeatmapGrid(photos: Photo[]): { date: Date; count: number }[][] {
  // 52 weeks x 7 days, starting from 52 weeks ago
  const today = new Date();
  const start = startOfWeek(subYears(today, 1), { weekStartsOn: 1 });

  // map dateKey -> count
  const dateMap: Record<string, number> = {};
  for (const photo of photos) {
    const d = new Date(photo.uploadedAt);
    const key = format(d, 'yyyy-MM-dd');
    dateMap[key] = (dateMap[key] ?? 0) + 1;
  }

  const weeks: { date: Date; count: number }[][] = [];
  let cursor = start;
  while (cursor <= today) {
    const week: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(cursor, d);
      const key = format(day, 'yyyy-MM-dd');
      week.push({ date: day, count: dateMap[key] ?? 0 });
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

  // month labels: pick first week of each month
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

      {/* Month labels */}
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
        {/* Day labels column */}
        <div className="flex flex-col gap-0.5 pr-1.5">
          {days.map((d) => (
            <div key={d} className="h-3 text-[9px] text-text-dim leading-3 flex items-center">
              {d}
            </div>
          ))}
        </div>
        {/* Grid */}
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
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-text-dim w-4">{i + 1}</span>
                    <span className="text-sm font-semibold text-text-main truncate max-w-[160px]">
                      {folder.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-brand">{folder.photoCount} ảnh</span>
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
  photos: Photo[];
}

function PhotosByMonth({ photos }: PhotosByMonthProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const months = useMemo(() => {
    const result: { label: string; count: number; monthKey: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const count = photos.filter((p) => {
        const pd = new Date(p.uploadedAt);
        return pd >= start && pd <= end;
      }).length;
      result.push({
        label: format(d, 'MMM', { locale: vi }),
        count,
        monthKey: format(d, 'yyyy-MM'),
      });
    }
    return result;
  }, [photos]);

  const maxCount = Math.max(...months.map((m) => m.count), 1);

  return (
    <div className="glass-card rounded-2xl p-6 stagger-item">
      <h2 className="text-lg font-bold text-text-heading mb-5">Ảnh theo tháng</h2>
      <div className="flex items-end gap-1.5 h-40">
        {months.map((m, i) => {
          const heightPct = (m.count / maxCount) * 100;
          return (
            <div
              key={m.monthKey}
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
              <span className="text-[9px] text-text-dim font-medium capitalize">{m.label}</span>
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
  photosMap: Map<string, number>;
}

function JourneyTimeline({ folders, photosMap }: JourneyTimelineProps) {
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
          {/* vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-brand/60 via-brand/20 to-transparent" />
          <div className="flex flex-col gap-0">
            {sorted.map((folder, i) => (
              <div key={folder.id} className="flex gap-4 group stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                {/* dot */}
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

                {/* content */}
                <div className="flex-1 pb-5 pt-0.5">
                  <div className="flex items-start gap-3">
                    {/* thumbnail */}
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
                          {photosMap.get(folder.id ?? '') ?? folder.photoCount} ảnh
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folders, setFolders] = useState<LocationFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [photosSnap, foldersSnap] = await Promise.all([
          getDocs(query(collection(db, 'photos'), where('uid', '==', user!.uid))),
          getDocs(
            query(
              collection(db, 'folders'),
              where('uid', '==', user!.uid),
              orderBy('createdAt', 'desc')
            )
          ),
        ]);

        setPhotos(photosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Photo)));
        setFolders(foldersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LocationFolder)));
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalPhotos = photos.length;
  const totalLocations = folders.length;

  const mostActiveMonth = useMemo(() => {
    if (photos.length === 0) return '—';
    const counts: Record<string, number> = {};
    for (const p of photos) {
      const key = format(new Date(p.uploadedAt), 'MM/yyyy');
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!best) return '—';
    const [monthStr] = best;
    const [mm, yyyy] = monthStr.split('/');
    const d = new Date(Number(yyyy), Number(mm) - 1);
    return format(d, 'MMMM yyyy', { locale: vi });
  }, [photos]);

  // Farthest location from user's first folder (used as "home")
  const farthestLocation = useMemo(() => {
    if (folders.length < 2) return '—';
    const home = folders[folders.length - 1]; // earliest
    let maxDist = 0;
    let farthest: LocationFolder | null = null;
    for (const f of folders) {
      if (f.id === home.id) continue;
      const d = haversineKm(home.centerLat, home.centerLng, f.centerLat, f.centerLng);
      if (d > maxDist) {
        maxDist = d;
        farthest = f;
      }
    }
    if (!farthest) return '—';
    return `${farthest.name} · ${Math.round(maxDist).toLocaleString()} km`;
  }, [folders]);

  // Build photos-per-folder map for the timeline
  const photosMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of photos) {
      if (p.folderId) map.set(p.folderId, (map.get(p.folderId) ?? 0) + 1);
    }
    return map;
  }, [photos]);

  // Heatmap
  const heatmapWeeks = useMemo(() => buildHeatmapGrid(photos), [photos]);
  const heatmapMax = useMemo(
    () => Math.max(...heatmapWeeks.flat().map((c) => c.count), 1),
    [heatmapWeeks]
  );

  if (loading) return <DashboardSkeleton />;

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
          value={totalPhotos.toLocaleString()}
          sub="ảnh trong kho"
          delay={0}
        />
        <StatCard
          icon={<MapPin className="w-5 h-5" />}
          label="Địa điểm đã ghé"
          value={totalLocations.toLocaleString()}
          sub="vị trí unique"
          delay={50}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Tháng hoạt động nhất"
          value={mostActiveMonth === '—' ? '—' : mostActiveMonth.split(' ')[0]}
          sub={mostActiveMonth !== '—' ? mostActiveMonth.split(' ')[1] ?? '' : 'Chưa có dữ liệu'}
          delay={100}
        />
        <StatCard
          icon={<Compass className="w-5 h-5" />}
          label="Địa điểm xa nhất"
          value={farthestLocation === '—' ? '—' : farthestLocation.split('·')[0].trim()}
          sub={
            farthestLocation !== '—'
              ? farthestLocation.split('·')[1]?.trim() ?? ''
              : 'Cần thêm địa điểm'
          }
          delay={150}
        />
      </div>

      {/* Activity Heatmap */}
      <HeatmapSection weeks={heatmapWeeks} max={heatmapMax} />

      {/* Top Locations + Photos by Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopLocations folders={folders} />
        <PhotosByMonth photos={photos} />
      </div>

      {/* Journey Timeline */}
      <JourneyTimeline folders={folders} photosMap={photosMap} />
    </div>
  );
}
