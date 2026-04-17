import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder } from '../types';
import { Link } from 'react-router-dom';

// Fix typical Leaflet icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapViewPage() {
  const { user } = useAppStore();
  const [folders, setFolders] = useState<LocationFolder[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchFolders = async () => {
      try {
        const q = query(collection(db, 'folders'), where('uid', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocationFolder));
        setFolders(data);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'folders');
      }
    };

    fetchFolders();
  }, [user]);

  const defaultCenter: [number, number] = [10.8231, 106.6297]; // Default HCMC

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-8 left-8 z-[400] bg-bg-card/80 backdrop-blur-md border border-border-dim rounded-2xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Map Explorer</h1>
        <div className="text-[12px] text-text-dim max-w-[250px]">
          Showing {folders.length} location clusters across your journey.
        </div>
      </div>
      
      <MapContainer 
        center={folders.length > 0 ? [folders[0].centerLat, folders[0].centerLng] : defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {folders.map(folder => (
            <Marker key={folder.id} position={[folder.centerLat, folder.centerLng]}>
            <Popup className="custom-popup">
              <div className="w-48 bg-bg-surface text-text-main">
                {folder.coverPhotoUrl && (
                  <img src={folder.coverPhotoUrl} alt={folder.name} className="w-full h-24 object-cover rounded-lg mb-3" />
                )}
                <h3 className="font-semibold text-sm leading-tight mb-2 text-white">{folder.name}</h3>
                <p className="text-[12px] text-text-dim mb-3">{folder.photoCount} photos</p>
                <Link to={`/folder/${folder.id}`} className="block text-center bg-glass border border-border-dim text-[12px] text-brand hover:bg-brand/10 hover:border-brand/30 py-2 rounded-lg font-medium transition-colors">
                  Explore Cluster
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
