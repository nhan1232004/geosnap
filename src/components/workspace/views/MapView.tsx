import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import type { Page, Block } from '../../../types';
import { getPageBlocks } from '../../../lib/workspaceService';

interface MapViewProps {
  workspaceId: string;
  pages: Page[];
}

interface MapLocation {
  page: Page;
  lat: number;
  lng: number;
}

// Custom Leaflet icon
const customIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      background-color: #ff6b35;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
      border: 2px solid white;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function MapView({ workspaceId, pages }: MapViewProps) {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMapLocations() {
      setLoading(true);
      const locs: MapLocation[] = [];

      for (const page of pages) {
        try {
          const blocks = await getPageBlocks(page.id);
          const mapBlock = blocks.find((b: Block) => b.type === 'map');
          if (mapBlock && mapBlock.data) {
            const data = mapBlock.data as { centerLat?: number; centerLng?: number };
            if (typeof data.centerLat === 'number' && typeof data.centerLng === 'number') {
              locs.push({
                page,
                lat: data.centerLat,
                lng: data.centerLng,
              });
            }
          }
        } catch (e) {
          console.warn(`Could not load map blocks for page ${page.id}:`, e);
        }
      }

      if (isMounted) {
        setLocations(locs);
        setLoading(false);
      }
    }

    loadMapLocations();

    return () => {
      isMounted = false;
    };
  }, [pages]);

  const defaultCenter: [number, number] = locations.length > 0
    ? [locations[0].lat, locations[0].lng]
    : [16.0544, 108.2022]; // Da Nang central Vietnam

  return (
    <div className="w-full h-[calc(100vh-220px)] min-h-[450px] rounded-2xl overflow-hidden border border-border-dim bg-surface relative flex flex-col">
      <div className="p-4 bg-surface/90 backdrop-blur-md border-b border-border-dim flex items-center justify-between z-10">
        <div>
          <h2 className="text-base font-bold text-text-heading flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand" />
            <span>Bản đồ hành trình (Map View)</span>
          </h2>
          <p className="text-xs text-text-dim mt-0.5">
            {locations.length} địa điểm được gắn tọa độ trên bản đồ
          </p>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-20">
            <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : locations.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-surface/80 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-heading mb-1">Chưa có tọa độ nào</h3>
            <p className="text-xs text-text-dim max-w-sm">
              Hãy thêm block Bản đồ hoặc tải ảnh có GPS vào các trang để hiển thị tự động trên bản đồ này.
            </p>
          </div>
        ) : null}

        <MapContainer
          center={defaultCenter}
          zoom={locations.length > 0 ? 11 : 6}
          className="w-full h-full z-0 dark-tiles"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {locations.map((loc) => (
            <Marker
              key={loc.page.id}
              position={[loc.lat, loc.lng]}
              icon={customIcon}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 min-w-[180px] max-w-[240px]">
                  {loc.page.cover && (
                    <img
                      src={loc.page.cover}
                      alt={loc.page.title}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900 mb-1">
                    <span>{loc.page.icon || '📍'}</span>
                    <span className="truncate">{loc.page.title}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/workspace/${workspaceId}/page/${loc.page.id}`)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#ff6b35] text-white rounded-lg text-xs font-semibold hover:bg-[#e05320] transition-colors"
                  >
                    <span>Mở trang</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
