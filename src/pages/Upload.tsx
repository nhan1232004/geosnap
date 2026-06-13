import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import exifr from 'exifr';
import { UploadCloud, CheckCircle2, Image as ImageIcon, AlertCircle, MapPin, Navigation } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ToastContainer';
import { findMatchingFolder } from '../lib/clustering';
import { reverseGeocode } from '../lib/geocoding';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

function resizeImageToBlob(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Failed to create blob');
        }, 'image/jpeg', 0.82);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImageToDataUrl(file: File, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToStorage(userId: string, file: File, blob: Blob): Promise<string> {
  try {
    const name = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileToUpload = new File([blob], name, { type: 'image/jpeg' });
    const res = await api.uploadPhoto(fileToUpload);
    return res.url;
  } catch (err) {
    console.warn('API upload failed, falling back to data URL:', err);
    return await resizeImageToDataUrl(file, 800, 800);
  }
}

type ManualItem = { file?: File, url: string, name: string, takenAt: string };

const formatForInput = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) {
    return '';
  }
};

function LocationMarker({ position, setPosition }: { position: {lat: number, lng: number} | null, setPosition: (p: {lat: number, lng: number}) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom(), { duration: 0.3 });
    },
  });

  useEffect(() => {
    if (position && map) {
      map.flyTo(position, 14, { duration: 0.5 });
    }
  }, [position, map]);

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function Upload() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [statusText, setStatusText] = useState('Select photos or drag and drop');
  const [manualQueue, setManualQueue] = useState<ManualItem[]>([]);
  const [folders, setFolders] = useState<{id: string, name: string, centerLat: number, centerLng: number, photoCount: number, coverPhotoUrl?: string}[]>([]);
  const [pickingItem, setPickingItem] = useState<ManualItem | null>(null);
  const [pickedPos, setPickedPos] = useState<{lat: number, lng: number} | null>(null);
  const [customLocationName, setCustomLocationName] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchFolders = async () => {
      try {
        const res = await api.get<{ folders: any[] }>('/api/v1/folders?limit=1000');
        setFolders(res.folders);
      } catch (e) {
        console.error('Failed to fetch folders:', e);
      }
    };
    fetchFolders();
  }, [user]);

  const handleAssign = async (item: ManualItem, folderId: string) => {
    if (!user) return;
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      
      await api.post('/api/v1/photos', {
        url: item.url,
        latitude: folder.centerLat,
        longitude: folder.centerLng,
        takenAt: item.takenAt,
        hasGps: true,
        folderId: folder.id
      });

      if (!folder.coverPhotoUrl) {
        await api.put(`/api/v1/folders/${folder.id}`, { coverPhotoUrl: item.url });
      }

      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, photoCount: f.photoCount + 1, coverPhotoUrl: f.coverPhotoUrl || item.url } as any : f));

    } catch (err) {
      console.error(err);
      toast(`Không thể gán ảnh: ${item.name}`, 'error');
    } finally {
      setManualQueue(prev => prev.filter(i => i.name !== item.name));
      setProgress(prev => ({ ...prev, [item.name]: 100 }));
    }
  };

  const handleSkip = (item: ManualItem) => {
    setManualQueue(prev => prev.filter(i => i.name !== item.name));
    setProgress(prev => ({ ...prev, [item.name]: -2 }));
  };

  const handleDateChange = (itemName: string, val: string) => {
    if (!val) return;
    try {
      const iso = new Date(val).toISOString();
      setManualQueue(prev => prev.map(i => i.name === itemName ? { ...i, takenAt: iso } : i));
    } catch (e) {
      // ignore
    }
  };

  const handleMapConfirm = async () => {
    if (!pickingItem || !pickedPos || !user) return;
    const { lat, lng } = pickedPos;
    
    try {
      let matchingFolder = findMatchingFolder(lat, lng, folders);
      let folderId;

      if (matchingFolder && !customLocationName) {
        const newCount = matchingFolder.photoCount + 1;
        const newLat = ((matchingFolder.centerLat * matchingFolder.photoCount) + lat) / newCount;
        const newLng = ((matchingFolder.centerLng * matchingFolder.photoCount) + lng) / newCount;

        await api.put(`/api/v1/folders/${matchingFolder.id}`, {
          centerLat: newLat,
          centerLng: newLng,
          coverPhotoUrl: matchingFolder.coverPhotoUrl || pickingItem.url
        });
        setFolders(prev => prev.map(f => f.id === matchingFolder.id ? {...f, photoCount: newCount, centerLat: newLat, centerLng: newLng, coverPhotoUrl: matchingFolder.coverPhotoUrl || pickingItem.url} as any : f));
        folderId = matchingFolder.id;
      } else {
        const name = customLocationName.trim() || await reverseGeocode(lat, lng);
        const newFolder = await api.post<any>('/api/v1/folders', {
          name,
          centerLat: lat,
          centerLng: lng,
          coverPhotoUrl: pickingItem.url
        });
        folderId = newFolder.id;
        setFolders(prev => [...prev, { id: folderId, name, centerLat: lat, centerLng: lng, photoCount: 1, coverPhotoUrl: pickingItem.url }]);
      }

      await api.post('/api/v1/photos', {
        url: pickingItem.url,
        latitude: lat,
        longitude: lng,
        takenAt: pickingItem.takenAt,
        hasGps: true,
        folderId
      });

    } catch (err) {
      console.error(err);
      toast('Không thể lưu vị trí. Vui lòng thử lại.', 'error');
    } finally {
      setManualQueue(prev => prev.filter(i => i.name !== pickingItem.name));
      setProgress(prev => ({ ...prev, [pickingItem.name]: 100 }));
      setPickingItem(null);
      setPickedPos(null);
      setCustomLocationName('');
    }
  };

  const processFile = async (file: File) => {
    if (!user) return;
    
    setProgress(prev => ({ ...prev, [file.name]: 10 }));
    let lat = 0, lng = 0, takenAt = new Date().toISOString(), hasGps = false;
    try {
      const exifData = await exifr.parse(file, { gps: true, tiff: false, exif: true });
      if (exifData && exifData.latitude && exifData.longitude) {
        lat = exifData.latitude;
        lng = exifData.longitude;
        hasGps = true;
      }
      if (exifData?.DateTimeOriginal) {
        takenAt = new Date(exifData.DateTimeOriginal).toISOString();
      }
    } catch (error) {
      console.warn("EXIF read error", error);
    }

    setProgress(prev => ({ ...prev, [file.name]: 40 }));
    
    const blob = await resizeImageToBlob(file, 1200, 1200);
    setProgress(prev => ({ ...prev, [file.name]: 60 }));
    
    const url = await uploadToStorage(user.uid, file, blob);
    
    setProgress(prev => ({ ...prev, [file.name]: 75 }));

    if (!hasGps) {
      setManualQueue(prev => [...prev, { file, url, name: file.name, takenAt }]);
      setProgress(prev => ({ ...prev, [file.name]: -1 }));
      return;
    }

    let matchingFolder = findMatchingFolder(lat, lng, folders);

    try {
      if (matchingFolder) {
        const newCount = matchingFolder.photoCount + 1;
        const newLat = ((matchingFolder.centerLat * matchingFolder.photoCount) + lat) / newCount;
        const newLng = ((matchingFolder.centerLng * matchingFolder.photoCount) + lng) / newCount;

        await api.put(`/api/v1/folders/${matchingFolder.id}`, {
          centerLat: newLat,
          centerLng: newLng,
          coverPhotoUrl: matchingFolder.coverPhotoUrl || url
        });
        setFolders(prev => prev.map(f => f.id === matchingFolder.id ? {...f, photoCount: newCount, centerLat: newLat, centerLng: newLng, coverPhotoUrl: matchingFolder.coverPhotoUrl || url} as any : f));
      } else {
        const name = await reverseGeocode(lat, lng);
        const newFolder = await api.post<any>('/api/v1/folders', {
          name,
          centerLat: lat,
          centerLng: lng,
          coverPhotoUrl: url
        });
        matchingFolder = { id: newFolder.id, photoCount: 1, centerLat: lat, centerLng: lng, coverPhotoUrl: url };
        setFolders(prev => [...prev, { id: newFolder.id, name, centerLat: lat, centerLng: lng, photoCount: 1, coverPhotoUrl: url }]);
      }

      await api.post('/api/v1/photos', {
        url,
        latitude: lat,
        longitude: lng,
        takenAt,
        hasGps: true,
        folderId: matchingFolder.id
      });

      setProgress(prev => ({ ...prev, [file.name]: 100 }));
    } catch (err) {
      console.error(err);
      toast(`Không thể tải lên ${file.name}`, 'error');
      setProgress(prev => ({ ...prev, [file.name]: -2 }));
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    setStatusText(`Đang xử lý ${acceptedFiles.length} bức ảnh...`);

    const initialProgress = acceptedFiles.reduce((acc, file) => {
      acc[file.name] = 0;
      return acc;
    }, {} as { [key: string]: number });
    setProgress(initialProgress);

    try {
      await Promise.all(acceptedFiles.map(processFile));
      setStatusText('Tải lên hoàn tất!');
      toast(`Tải lên thành công ${acceptedFiles.length} ảnh`, 'success');
    } catch (e) {
      console.error(e);
      setStatusText('Có lỗi xảy ra khi tải ảnh lên.');
      toast('Có lỗi khi tải ảnh lên', 'error');
    } finally {
      setUploading(false);
    }
  }, [user, folders]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/heic': [],
      'image/webp': []
    }
  } as any);

  return (
    <div className="mx-auto max-w-2xl p-10 pt-20">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-text-heading">Upload Photos</h1>
      
      <div 
        {...getRootProps()} 
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed p-16 text-center transition-all duration-300
        ${isDragActive ? 'border-brand bg-brand/5' : 'border-border-dim hover:border-brand/50 hover:bg-glass'}
        ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`mb-6 h-16 w-16 transition-colors duration-300 ${isDragActive ? 'text-brand' : 'text-text-dim group-hover:text-brand/80'}`} />
        <p className="text-[16px] font-medium text-text-main mb-2">{statusText}</p>
        <p className="text-[13px] text-text-dim">Supports JPG, PNG, WEBP, HEIC with EXIF GPS</p>
      </div>

      {manualQueue.length > 0 && (
        <div className="mt-8 space-y-6">
          <h3 className="font-semibold text-sm tracking-widest uppercase text-brand border-b border-border-dim pb-3 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Action Required: Missing GPS Data
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {manualQueue.map(item => (
              <div key={item.name} className="flex flex-col md:flex-row gap-6 p-4 rounded-xl border border-brand/30 bg-bg-card backdrop-blur-md shadow-lg shadow-brand/5">
                <img src={item.url} className="w-32 h-24 object-cover rounded-lg" alt={item.name} />
                <div className="flex-1 flex flex-col justify-center py-2">
                  <h4 className="font-medium text-text-heading mb-1 line-clamp-1">{item.name}</h4>
                  <p className="text-[13px] text-text-dim mb-4">No location data found in image EXIF. Update date/time and assign a location.</p>
                  
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-text-dim uppercase tracking-wider mb-2">Date & Time Taken</label>
                    <input
                      type="datetime-local"
                      value={formatForInput(item.takenAt)}
                      onChange={(e) => handleDateChange(item.name, e.target.value)}
                      className="w-full bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>

                  <label className="block text-[11px] font-semibold text-text-dim uppercase tracking-wider mb-2">Location Assignment</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <select 
                      className="flex-1 bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-brand/50 transition-colors"
                      onChange={(e) => {
                        if (e.target.value) handleAssign(item, e.target.value);
                      }}
                      value=""
                    >
                      <option value="" disabled>Select an existing folder...</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPickingItem(item)}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-brand hover:text-white hover:bg-brand/20 border border-brand/30 transition-colors flex items-center justify-center whitespace-nowrap flex-1 sm:flex-none"
                        title="Pick on map to create new or assign"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Map / New Location</span>
                      </button>
                      <button onClick={() => handleSkip(item)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-dim hover:text-white hover:bg-glass border border-border-dim transition-colors">
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(progress).length > 0 && (
        <div className="mt-12 space-y-4">
          <h3 className="font-semibold text-sm tracking-widest uppercase text-text-dim border-b border-border-dim pb-3">Upload Progress</h3>
          {Object.entries(progress).map(([filename, prog]) => (
            <div key={filename} className="flex items-center gap-4 rounded-xl border border-border-dim bg-glass backdrop-blur-sm p-4 shadow-sm">
              <ImageIcon className="h-5 w-5 text-brand" />
              <div className="flex-1 truncate text-sm font-medium text-text-main">{filename}</div>
              {prog === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 min-w-5 shrink-0" />
              ) : prog === -1 ? (
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand shrink-0 border border-brand/20 bg-brand/10 px-2 py-1 rounded-md">Needs GPS</span>
              ) : prog === -2 ? (
                <span className="text-[10px] font-bold tracking-wider uppercase text-text-dim shrink-0 border border-border-dim bg-surface px-2 py-1 rounded-md">Skipped</span>
              ) : (
                <div className="w-24 text-right text-xs font-semibold text-brand shrink-0">{Math.round(Number(prog))}%</div>
              )}
            </div>
          ))}
        </div>
      )}

      {pickingItem && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-surface w-full max-w-3xl rounded-2xl border border-border-dim overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-border-dim">
              <h3 className="text-text-heading font-semibold text-lg">Pick Map Location</h3>
              <p className="text-[13px] text-text-dim mt-1">Click anywhere on the map to drop a pin for <span className="text-brand">{pickingItem.name}</span>.</p>
              
              <div className="mt-3">
                <input 
                  type="text" 
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="Tên địa điểm (Tùy chọn, tự động tạo nếu để trống)"
                  className="w-full bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-brand/50 transition-colors"
                />
              </div>
            </div>
            <div className="h-[450px] w-full bg-black/50 z-0">
              <MapContainer 
                center={folders.length > 0 ? [folders[0].centerLat, folders[0].centerLng] : [10.8231, 106.6297]} 
                zoom={10} 
                className="h-full w-full z-0"
              >
                 <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                 />
                 <LocationMarker position={pickedPos} setPosition={setPickedPos} />
              </MapContainer>
            </div>
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-border-dim bg-bg-card">
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    toast('Đang lấy vị trí...', 'success');
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setPickedPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      },
                      (err) => {
                        toast('Không thể lấy vị trí hiện tại', 'error');
                      },
                      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                    );
                  } else {
                    toast('Trình duyệt không hỗ trợ GPS', 'error');
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium text-brand hover:bg-brand/10 border border-brand/30 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Dùng vị trí hiện tại của tôi
              </button>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => { setPickingItem(null); setPickedPos(null); setCustomLocationName(''); }} 
                  className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-white hover:bg-glass border border-border-dim transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleMapConfirm} 
                  disabled={!pickedPos} 
                  className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Lưu vị trí
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
