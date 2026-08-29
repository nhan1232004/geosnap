import React from 'react';
import { Block, MapData } from '../../../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom brand marker
const brandIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: MapData) => void;
}

export function MapBlock({ block, isEditing, onChange }: Props) {
  const data = (block.data || { centerLat: 21.0285, centerLng: 105.8542, zoom: 13 }) as unknown as MapData;

  return (
    <div className="py-2">
      <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-border-dim z-0 relative">
        <MapContainer 
          center={[data.centerLat, data.centerLng]} 
          zoom={data.zoom} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[data.centerLat, data.centerLng]} icon={brandIcon}>
            <Popup>
              Vị trí được đánh dấu
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
