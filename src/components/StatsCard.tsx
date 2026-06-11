import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Image as ImageIcon, Users, Zap } from 'lucide-react';

interface UserStats {
  totalLocations: number;
  totalPhotos: number;
  totalFriends: number;
  totalDistance?: number;
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats>({
    totalLocations: 0,
    totalPhotos: 0,
    totalFriends: 0,
    totalDistance: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Get total locations
        const foldersSnap = await getDocs(query(collection(db, 'folders'), where('uid', '==', userId)));
        const totalLocations = foldersSnap.docs.length;

        // Get total photos
        const photosSnap = await getDocs(query(collection(db, 'photos'), where('uid', '==', userId)));
        const totalPhotos = photosSnap.docs.length;

        // Get total friends (accepted friendships)
        const sentSnap = await getDocs(query(collection(db, 'friendships'), where('requesterId', '==', userId), where('status', '==', 'accepted')));
        const receivedSnap = await getDocs(query(collection(db, 'friendships'), where('addresseeId', '==', userId), where('status', '==', 'accepted')));
        const totalFriends = sentSnap.docs.length + receivedSnap.docs.length;

        setStats({
          totalLocations,
          totalPhotos,
          totalFriends,
          totalDistance: 0
        });
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return { stats, loading };
}

export function StatsCard({ icon: Icon, label, value, unit = '' }: { icon: React.ReactNode, label: string, value: number | string, unit?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-surface border border-border-dim hover:border-brand/30 transition-colors">
      <div className="text-brand">{Icon}</div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">{label}</div>
        <div className="text-lg font-bold text-white">{value}{unit}</div>
      </div>
    </div>
  );
}

export function UserStatsGrid({ userId }: { userId: string | undefined }) {
  const { stats, loading } = useUserStats(userId);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatsCard icon={<MapPin className="w-4 h-4" />} label="Locations" value={stats.totalLocations} />
      <StatsCard icon={<ImageIcon className="w-4 h-4" />} label="Photos" value={stats.totalPhotos} />
      <StatsCard icon={<Users className="w-4 h-4" />} label="Friends" value={stats.totalFriends} />
      <StatsCard icon={<Zap className="w-4 h-4" />} label="Streak" value={0} />
    </div>
  );
}
