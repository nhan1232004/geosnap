import React, { useEffect, useState } from 'react';
import { Block, MapData } from '../../../types';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';
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

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: MapData) => void;
}

export function MapBlock({ block, isEditing, onChange }: Props) {
  const data = (block.data || { centerLat: 21.0285, centerLng: 105.8542, zoom: 13 }) as unknown as MapData;
  const lat = data.centerLat ?? 21.0285;
  const lng = data.centerLng ?? 105.8542;
  const zoom = data.zoom ?? 13;

  const handleMapClick = (newLat: number, newLng: number) => {
    if (!isEditing) return;
    onChange({
      ...data,
      centerLat: newLat,
      centerLng: newLng,
    });
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        onChange({
          ...data,
          centerLat: pos.coords.latitude,
          centerLng: pos.coords.longitude,
          zoom: 14,
        });
      });
    }
  };

  return (
    <div className="py-2.5">
      <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-border-dim z-0 relative shadow-sm group">
        <MapContainer 
          center={[lat, lng]} 
          zoom={zoom} 
          scrollWheelZoom={false}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <MapClickHandler onClick={handleMapClick} />
          <Marker position={[lat, lng]} icon={brandIcon}>
            <Popup>
              <div className="text-xs font-semibold text-text-heading">
                📍 {lat.toFixed(4)}, {lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {isEditing && (
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
            <button
              type="button"
              onClick={handleLocateMe}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/90 hover:bg-surface border border-border-dim rounded-xl text-xs font-semibold text-text-heading backdrop-blur-md shadow-md cursor-pointer transition-all"
            >
              <Navigation size={12} className="text-brand" />
              <span>Vị trí hiện tại</span>
            </button>
          </div>
        )}

        <div className="absolute bottom-3 left-3 z-[400] px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[11px] text-white/90 font-mono flex items-center gap-1.5">
          <MapPin size={11} className="text-brand" />
          <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}
