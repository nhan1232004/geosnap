import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ToastContainer';
import { LocationFolder, UserProfile } from '../types';
import { Link } from 'react-router-dom';
import { Users, User as UserIcon, MapPin, Calendar } from 'lucide-react';

interface MapFolder extends LocationFolder {
  isMine: boolean;
  userProfile?: UserProfile;
}

const createCustomIcon = (imageUrl?: string, isMine = true) => {
  const defaultImage = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200&h=200&fit=crop';
  const imgUrl = imageUrl || defaultImage;
  const ringColor = isMine ? 'ring-brand' : 'ring-blue-500';
  const dotBg = isMine ? 'bg-brand' : 'bg-blue-500';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute inset-0 bg-black/50 rounded-full blur-[4px]"></div>
        <img src="${imgUrl}" class="w-10 h-10 object-cover rounded-full ring-2 ${ringColor} shadow-xl z-10" />
        <div class="absolute -bottom-1 z-20 ${dotBg} w-3 h-3 rounded-full border border-white"></div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });
};

const createClusterIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute inset-0 bg-brand/30 rounded-full animate-ping duration-[2000ms]"></div>
        <div class="absolute inset-1 bg-brand/10 rounded-full blur-[2px]"></div>
        <div class="w-10 h-10 rounded-full bg-brand border-2 border-white flex items-center justify-center text-white font-black text-sm shadow-2xl z-10">
          ${count}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20]
  });
};

// Sub-component to track zoom level in react-leaflet
function MapEventsTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    }
  });
  return null;
}

export default function MapViewPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [myFolders, setMyFolders] = useState<MapFolder[]>([]);
  const [friendFolders, setFriendFolders] = useState<MapFolder[]>([]);
  const [showFriends, setShowFriends] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(5);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Fetch own folders
  useEffect(() => {
    if (!user) return;
    const fetchMine = async () => {
      try {
        const q = query(collection(db, 'folders'), where('uid', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as LocationFolder, isMine: true }));
        setMyFolders(data);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'folders');
        toast('Failed to load your locations', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchMine();
  }, [user, toast]);

  // Fetch friend folders when toggled
  const fetchFriendFolders = useCallback(async () => {
    if (!user) return;
    try {
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendships'), where('requesterId', '==', user.uid), where('status', '==', 'accepted'))),
        getDocs(query(collection(db, 'friendships'), where('addresseeId', '==', user.uid), where('status', '==', 'accepted')))
      ]);

      const friendIds = [
        ...sentSnap.docs.map(d => d.data().addresseeId),
        ...receivedSnap.docs.map(d => d.data().requesterId)
      ];

      if (friendIds.length === 0) return;

      const batches = [];
      for (let i = 0; i < friendIds.length; i += 10) {
        const chunk = friendIds.slice(i, i + 10);
        batches.push(getDocs(query(collection(db, 'folders'), where('uid', 'in', chunk), where('visibility', 'in', ['friends', 'public']))));
      }

      const snapshots = await Promise.all(batches);
      let folders: LocationFolder[] = [];
      snapshots.forEach(snap => folders = [...folders, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as LocationFolder))]);

      const profileCache: Record<string, UserProfile> = {};
      const enriched = await Promise.all(folders.map(async (folder) => {
        if (!profileCache[folder.uid]) {
          const profileSnap = await getDoc(doc(db, 'users', folder.uid));
          if (profileSnap.exists()) profileCache[folder.uid] = { uid: profileSnap.id, ...profileSnap.data() } as UserProfile;
        }
        return {
          ...folder,
          isMine: false,
          userProfile: profileCache[folder.uid]
        };
      }));

      setFriendFolders(enriched);
    } catch (e) {
      console.error(e);
      toast('Failed to load friends\' locations', 'error');
    }
  }, [user, toast]);

  useEffect(() => {
    if (showFriends && friendFolders.length === 0) {
      fetchFriendFolders();
    }
  }, [showFriends, friendFolders.length, fetchFriendFolders]);

  const rawDisplayedFolders = showFriends ? [...myFolders, ...friendFolders] : myFolders;

  // 1. Time filtering logic
  const displayedFolders = useMemo(() => {
    const now = new Date();
    return rawDisplayedFolders.filter(folder => {
      if (timeFilter === 'all') return true;
      const createdDate = new Date(folder.createdAt);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeFilter === 'week') return diffDays <= 7;
      if (timeFilter === 'month') return diffDays <= 30;
      if (timeFilter === 'year') return createdDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [rawDisplayedFolders, timeFilter]);

  // 2. Custom responsive grid clustering logic based on Map zoom
  const clusterDistanceThreshold = useMemo(() => {
    if (zoom <= 3) return 5.0;
    if (zoom === 4) return 3.0;
    if (zoom === 5) return 1.5;
    if (zoom === 6) return 0.8;
    if (zoom === 7) return 0.4;
    if (zoom === 8) return 0.2;
    return 0.0; // Disable clustering at zoom 9+
  }, [zoom]);

  const clusters = useMemo(() => {
    const result: {
      id: string;
      centerLat: number;
      centerLng: number;
      folders: MapFolder[];
    }[] = [];

    displayedFolders.forEach(folder => {
      let added = false;
      if (clusterDistanceThreshold > 0) {
        for (const cluster of result) {
          const dLat = folder.centerLat - cluster.centerLat;
          const dLng = folder.centerLng - cluster.centerLng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < clusterDistanceThreshold) {
            cluster.folders.push(folder);
            // Re-average cluster center coordinates
            cluster.centerLat = cluster.folders.reduce((sum, f) => sum + f.centerLat, 0) / cluster.folders.length;
            cluster.centerLng = cluster.folders.reduce((sum, f) => sum + f.centerLng, 0) / cluster.folders.length;
            added = true;
            break;
          }
        }
      }
      if (!added) {
        result.push({
          id: folder.id || String(Math.random()),
          centerLat: folder.centerLat,
          centerLng: folder.centerLng,
          folders: [folder]
        });
      }
    });

    return result;
  }, [displayedFolders, clusterDistanceThreshold]);

  const defaultCenter: [number, number] = [10.8231, 106.6297];

  return (
    <div className="h-full w-full relative">
      {/* HUD Control Panel */}
      <div className="absolute top-8 left-8 z-[400] w-80 bg-bg-card/85 backdrop-blur-md border border-border-dim rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-text-heading mb-1 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand" /> Bản đồ hành trình
          </h1>
          <p className="text-[11px] text-text-dim leading-relaxed">
            Đang hiển thị {displayedFolders.length} địa điểm. Zoom: {zoom}
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="bg-surface/50 border border-border-dim/60 p-1.5 rounded-2xl">
          <div className="flex items-center gap-1 text-[10px] text-text-dim mb-1.5 px-1 font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-brand" /> Bộ lọc thời gian
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(['all', 'week', 'month', 'year'] as const).map(pill => {
              const label = pill === 'all' ? 'Tất cả' : pill === 'week' ? '7 ngày' : pill === 'month' ? '30 ngày' : 'Năm nay';
              const active = timeFilter === pill;
              return (
                <button
                  key={pill}
                  onClick={() => setTimeFilter(pill)}
                  className={`py-1 rounded-xl text-[10px] font-bold transition-all ${
                    active ? 'bg-brand text-white shadow-sm' : 'text-text-dim hover:bg-surface hover:text-text-main'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Toggle */}
        <div className="space-y-2">
          {/* My Map Toggle */}
          <button 
            onClick={() => setShowFriends(false)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
              !showFriends ? 'bg-brand/10 border border-brand/35 shadow-[inset_0_0_0_1px_rgba(255,107,53,0.15)]' : 'bg-surface border border-border-dim/60 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${!showFriends ? 'bg-brand text-white shadow-lg shadow-brand/40' : 'bg-black/40 text-text-dim'}`}>
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className={`text-[12px] font-bold ${!showFriends ? 'text-brand' : 'text-text-main'}`}>Hành trình của tôi</div>
                <div className="text-[10px] text-text-dim">{myFolders.length} địa điểm</div>
              </div>
            </div>
            {!showFriends && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
          </button>

          {/* Friends Map Toggle */}
          <button 
            onClick={() => setShowFriends(true)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
              showFriends ? 'bg-blue-500/10 border border-blue-500/35 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]' : 'bg-surface border border-border-dim/60 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${showFriends ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'bg-black/40 text-text-dim'}`}>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className={`text-[12px] font-bold ${showFriends ? 'text-blue-400' : 'text-text-main'}`}>Hành trình bạn bè</div>
                <div className="text-[10px] text-text-dim">Khám phá công khai</div>
              </div>
            </div>
            {showFriends && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
          </button>
        </div>
      </div>
      
      <MapContainer 
        center={myFolders.length > 0 ? [myFolders[0].centerLat, myFolders[0].centerLng] : defaultCenter} 
        zoom={5} 
        scrollWheelZoom={true} 
        className="h-full w-full z-0 font-sans"
      >
        <MapEventsTracker onZoomChange={setZoom} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {clusters.map(cluster => {
          const isCluster = cluster.folders.length > 1;

          if (isCluster) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                position={[cluster.centerLat, cluster.centerLng]}
                icon={createClusterIcon(cluster.folders.length)}
              >
                <Popup className="custom-popup">
                  <div className="w-64 max-h-80 overflow-y-auto pr-1 text-text-main">
                    <div className="sticky top-0 bg-bg-surface pb-2 mb-2 border-b border-border-dim z-10">
                      <h3 className="font-bold text-[13px] text-text-heading flex items-center gap-1.5">
                        📍 Cụm địa điểm ({cluster.folders.length} địa điểm)
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {cluster.folders.map(folder => (
                        <div key={folder.id} className="flex gap-2 items-center p-1.5 rounded-xl hover:bg-surface transition-all">
                          {folder.coverPhotoUrl ? (
                            <img src={folder.coverPhotoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border-dim shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 text-sm">
                              🌍
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[11px] text-text-heading truncate">{folder.name}</h4>
                            <p className="text-[9px] text-text-dim mt-0.5">{folder.photoCount} ảnh</p>
                          </div>
                          <Link to={`/folder/${folder.id}`} className="px-2.5 py-1 bg-brand/10 hover:bg-brand hover:text-white text-brand rounded-lg text-[10px] font-bold transition-all shrink-0">
                            Xem
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          } else {
            const folder = cluster.folders[0];
            return (
              <Marker 
                key={`single-${folder.id}`} 
                position={[folder.centerLat, folder.centerLng]}
                icon={createCustomIcon(folder.isMine ? folder.coverPhotoUrl : (folder.userProfile?.avatarUrl || folder.coverPhotoUrl), folder.isMine)}
              >
                <Popup className="custom-popup">
                  <div className="w-52 bg-bg-surface text-text-main">
                    {folder.coverPhotoUrl && (
                      <img src={folder.coverPhotoUrl} alt={folder.name} className="w-full h-28 object-cover rounded-xl mb-3 border border-border-dim" />
                    )}
                    {!folder.isMine && folder.userProfile && (
                      <div className="flex items-center gap-2 mb-2 bg-black/40 p-1.5 rounded-lg border border-border-dim">
                        {folder.userProfile.avatarUrl ? (
                          <img src={folder.userProfile.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold border border-blue-500/30">
                            {(folder.userProfile.displayName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-text-heading truncate">{folder.userProfile.displayName}</span>
                      </div>
                    )}
                    <h3 className="font-bold text-[14px] leading-tight mb-1 text-text-heading">{folder.name}</h3>
                    <p className="text-[11px] text-text-dim mb-4">{folder.photoCount} ảnh</p>
                    <Link to={`/folder/${folder.id}`} className="block text-center bg-brand/10 border border-brand/35 text-[12px] text-brand hover:bg-brand hover:text-white py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                      Khám phá địa điểm
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          }
        })}
      </MapContainer>
    </div>
  );
}
