import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import exifr from 'exifr';
import { UploadCloud, CheckCircle2, Image as ImageIcon, AlertCircle, MapPin, Navigation } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ToastContainer';
import { findMatchingFolder } from '../lib/clustering';
import { reverseGeocode } from '../lib/geocoding';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LocationFolder } from '../types';
import {
  getUserFoldersOptimized,
  createFolderDoc,
  updateFolderDoc,
  createPhotoDoc,
  uploadImageFile,
} from '../lib/firestoreService';

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

async function uploadToStorage(userId: string, file: File, blob: Blob): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const fileToUpload = new File([blob], filename, { type: 'image/jpeg' });
  return await uploadImageFile(fileToUpload, `photos/${userId}/${filename}`);
}

type ManualItem = { id: string; file?: File; url: string; name: string; takenAt: string };

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
  const [folders, setFolders] = useState<LocationFolder[]>([]);
  const [pickingItem, setPickingItem] = useState<ManualItem | null>(null);
  const [pickedPos, setPickedPos] = useState<{lat: number, lng: number} | null>(null);
  const [customLocationName, setCustomLocationName] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchFolders = async () => {
      try {
        const userFolders = await getUserFoldersOptimized(user.uid, 100);
        setFolders(userFolders);
      } catch (e) {
        console.error('Failed to fetch folders:', e);
      }
    };
    fetchFolders();
  }, [user]);

  const handleSkip = (item: ManualItem) => {
    setManualQueue(prev => prev.filter(i => i.id !== item.id));
    setProgress(prev => ({ ...prev, [item.name]: -2 }));
  };

  const handleAssign = async (item: ManualItem, folderId: string) => {
    if (!user) return;
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      
      await createPhotoDoc({
        uid: user.uid,
        url: item.url,
        latitude: folder.centerLat,
        longitude: folder.centerLng,
        takenAt: item.takenAt,
        hasGps: false,
        folderId: folder.id,
        visibility: 'private',
        uploadedAt: new Date().toISOString(),
      });

      const newCover = folder.coverPhotoUrl || item.url;
      const newCount = (folder.photoCount || 0) + 1;
      await updateFolderDoc(folder.id, {
        photoCount: newCount,
        coverPhotoUrl: newCover,
      });

      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, photoCount: newCount, coverPhotoUrl: newCover } : f));
      setManualQueue(prev => prev.filter(i => i.id !== item.id));
      setProgress(prev => ({ ...prev, [item.name]: 100 }));
      toast(`Đã gán ${item.name} vào ${folder.name}`, 'success');
    } catch (err) {
      console.error(err);
      toast('Không thể gán ảnh vào thư mục', 'error');
    }
  };

  const handleSaveLocation = async () => {
    if (!user || !pickingItem || !pickedPos) return;

    try {
      let finalName = customLocationName.trim();
      if (!finalName) {
        finalName = await reverseGeocode(pickedPos.lat, pickedPos.lng);
      }

      let matchingFolder = findMatchingFolder(pickedPos.lat, pickedPos.lng, folders);

      if (matchingFolder) {
        const newCount = matchingFolder.photoCount + 1;
        const newLat = ((matchingFolder.centerLat * matchingFolder.photoCount) + pickedPos.lat) / newCount;
        const newLng = ((matchingFolder.centerLng * matchingFolder.photoCount) + pickedPos.lng) / newCount;
        const newCover = matchingFolder.coverPhotoUrl || pickingItem.url;

        await updateFolderDoc(matchingFolder.id, {
          centerLat: newLat,
          centerLng: newLng,
          photoCount: newCount,
          coverPhotoUrl: newCover,
          name: finalName || matchingFolder.name
        });

        setFolders(prev => prev.map(f => f.id === matchingFolder!.id ? {
          ...f,
          photoCount: newCount,
          centerLat: newLat,
          centerLng: newLng,
          coverPhotoUrl: newCover,
          name: finalName || f.name
        } : f));
      } else {
        const newFolder = await createFolderDoc({
          uid: user.uid,
          name: finalName,
          centerLat: pickedPos.lat,
          centerLng: pickedPos.lng,
          coverPhotoUrl: pickingItem.url,
          photoCount: 1,
          createdAt: new Date().toISOString(),
          visibility: 'private',
        });
        const createdFolder: LocationFolder = {
          id: newFolder.id || '',
          name: finalName,
          centerLat: pickedPos.lat,
          centerLng: pickedPos.lng,
          photoCount: 1,
          coverPhotoUrl: pickingItem.url,
          uid: user.uid,
          createdAt: new Date().toISOString(),
          visibility: 'private',
        };
        matchingFolder = createdFolder;
        setFolders(prev => [...prev, createdFolder]);
      }

      await createPhotoDoc({
        uid: user.uid,
        url: pickingItem.url,
        latitude: pickedPos.lat,
        longitude: pickedPos.lng,
        takenAt: pickingItem.takenAt,
        hasGps: true,
        folderId: matchingFolder.id,
        visibility: 'private',
        uploadedAt: new Date().toISOString(),
      });

      toast(`Đã gán vị trí cho ${pickingItem.name}`, 'success');
    } catch (err) {
      console.error(err);
      toast('Không thể lưu vị trí. Vui lòng thử lại.', 'error');
    } finally {
      setManualQueue(prev => prev.filter(i => i.id !== pickingItem.id));
      setProgress(prev => ({ ...prev, [pickingItem.name]: 100 }));
      setPickingItem(null);
      setPickedPos(null);
      setCustomLocationName('');
    }
  };

  const processFileWithFolderState = async (file: File, activeFolders: LocationFolder[]): Promise<LocationFolder | null> => {
    if (!user) return null;
    
    setProgress(prev => ({ ...prev, [file.name]: 10 }));
    let lat = 0, lng = 0, takenAt = new Date().toISOString(), hasGps = false;
    
    // Robust EXIF parsing with 4000ms timeout
    try {
      const exifPromise = exifr.parse(file, { gps: true, tiff: false, exif: true });
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
      const exifData = await Promise.race([exifPromise, timeoutPromise]) as any;

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

    setProgress(prev => ({ ...prev, [file.name]: 35 }));
    
    try {
      const blob = await resizeImageToBlob(file, 1400, 1400);
      setProgress(prev => ({ ...prev, [file.name]: 65 }));
      
      const url = await uploadToStorage(user.uid, file, blob);
      setProgress(prev => ({ ...prev, [file.name]: 85 }));

      if (!hasGps) {
        const uniqueId = crypto.randomUUID();
        setManualQueue(prev => [...prev, { id: uniqueId, file, url, name: file.name, takenAt }]);
        setProgress(prev => ({ ...prev, [file.name]: -1 }));
        return null;
      }

      let matchingFolder = findMatchingFolder(lat, lng, activeFolders);

      if (matchingFolder) {
        const newCount = matchingFolder.photoCount + 1;
        const newLat = ((matchingFolder.centerLat * matchingFolder.photoCount) + lat) / newCount;
        const newLng = ((matchingFolder.centerLng * matchingFolder.photoCount) + lng) / newCount;
        const newCover = matchingFolder.coverPhotoUrl || url;

        await updateFolderDoc(matchingFolder.id, {
          centerLat: newLat,
          centerLng: newLng,
          photoCount: newCount,
          coverPhotoUrl: newCover,
        });

        const updatedFolder = {
          ...matchingFolder,
          photoCount: newCount,
          centerLat: newLat,
          centerLng: newLng,
          coverPhotoUrl: newCover,
        };

        setFolders(prev => prev.map(f => f.id === matchingFolder!.id ? updatedFolder : f));

        await createPhotoDoc({
          uid: user.uid,
          url,
          latitude: lat,
          longitude: lng,
          takenAt,
          hasGps: true,
          folderId: matchingFolder.id,
          visibility: matchingFolder.visibility || 'private',
          uploadedAt: new Date().toISOString(),
        });

        setProgress(prev => ({ ...prev, [file.name]: 100 }));
        return updatedFolder;
      } else {
        const name = await reverseGeocode(lat, lng);
        const newFolder = await createFolderDoc({
          uid: user.uid,
          name,
          centerLat: lat,
          centerLng: lng,
          coverPhotoUrl: url,
          photoCount: 1,
          createdAt: new Date().toISOString(),
          visibility: 'private',
        });
        const createdFolder: LocationFolder = {
          id: newFolder.id || '',
          name,
          centerLat: lat,
          centerLng: lng,
          photoCount: 1,
          coverPhotoUrl: url,
          uid: user.uid,
          createdAt: new Date().toISOString(),
          visibility: 'private'
        };
        setFolders(prev => [...prev, createdFolder]);

        await createPhotoDoc({
          uid: user.uid,
          url,
          latitude: lat,
          longitude: lng,
          takenAt,
          hasGps: true,
          folderId: newFolder.id,
          visibility: 'private',
          uploadedAt: new Date().toISOString(),
        });

        setProgress(prev => ({ ...prev, [file.name]: 100 }));
        return createdFolder;
      }
    } catch (err) {
      console.error(err);
      toast(`Không thể tải lên ${file.name}`, 'error');
      setProgress(prev => ({ ...prev, [file.name]: -2 }));
      return null;
    }
  };

  const handleBatchAssignAll = async (folderId: string) => {
    if (!user || manualQueue.length === 0) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    toast(`Đang gán ${manualQueue.length} ảnh vào ${folder.name}...`, 'info');
    const itemsToAssign = [...manualQueue];
    for (const item of itemsToAssign) {
      await handleAssign(item, folderId);
    }
    toast(`Đã gán toàn bộ ảnh vào ${folder.name}`, 'success');
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
      // Process sequentially with synchronized folder state to prevent duplicate folders
      const currentFolderState = [...folders];
      for (const file of acceptedFiles) {
        const folderResult = await processFileWithFolderState(file, currentFolderState);
        if (folderResult) {
          const idx = currentFolderState.findIndex(f => f.id === folderResult.id);
          if (idx >= 0) {
            currentFolderState[idx] = folderResult;
          } else {
            currentFolderState.push(folderResult);
          }
        }
      }
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
    <div className="mx-auto max-w-2xl p-4 sm:p-10 pt-6 sm:pt-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">Tải ảnh lên (Upload)</h1>
        <p className="text-text-dim text-xs sm:text-sm mt-1">Tự động nén nhanh, đọc tọa độ GPS và gom nhóm vào album</p>
      </div>
      
      <div 
        {...getRootProps()} 
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-16 text-center transition-all duration-300
        ${isDragActive ? 'border-brand bg-brand/5' : 'border-border-dim hover:border-brand/50 hover:bg-glass'}
        ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`mb-4 h-14 w-14 transition-colors duration-300 ${isDragActive ? 'text-brand' : 'text-text-dim group-hover:text-brand'}`} />
        <p className="text-base font-semibold text-text-heading mb-1">{statusText}</p>
        <p className="text-xs text-text-dim">Kéo thả hoặc nhấn để chọn ảnh (JPG, PNG, WEBP, HEIC)</p>
      </div>

      {manualQueue.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-dim pb-3">
            <h3 className="font-bold text-xs tracking-wider uppercase text-brand flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Cần gắn vị trí ({manualQueue.length} ảnh chưa có GPS)</span>
            </h3>

            {folders.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) handleBatchAssignAll(e.target.value);
                  }}
                  defaultValue=""
                  className="bg-surface border border-border-dim rounded-xl px-2.5 py-1 text-xs text-text-main focus:outline-none focus:border-brand"
                >
                  <option value="" disabled>Gán tất cả vào album...</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {manualQueue.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-2xl border border-brand/20 bg-bg-card backdrop-blur-md shadow-sm">
                <img src={item.url} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shrink-0" alt={item.name} />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-text-heading text-xs truncate mb-1">{item.name}</h4>
                    <p className="text-[11px] text-text-dim">Ảnh chưa có tọa độ GPS. Hãy chọn album hoặc vị trí trên bản đồ.</p>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select 
                      className="flex-1 min-w-[140px] bg-surface border border-border-dim rounded-lg px-2.5 py-1.5 text-xs text-text-main focus:outline-none focus:border-brand"
                      onChange={(e) => {
                        if (e.target.value) handleAssign(item, e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Chọn album có sẵn...</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>

                    <button 
                      type="button"
                      onClick={() => setPickingItem(item)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand hover:text-white hover:bg-brand bg-brand/10 border border-brand/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Chọn trên bản đồ</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(async (pos) => {
                            setPickedPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setPickingItem(item);
                          });
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-main hover:bg-surface border border-border-dim transition-colors flex items-center gap-1 cursor-pointer"
                      title="Sử dụng GPS hiện tại"
                    >
                      <Navigation className="w-3.5 h-3.5 text-brand" />
                      <span>GPS hiện tại</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleSkip(item)} 
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-dim hover:text-text-main transition-colors cursor-pointer"
                    >
                      Bỏ qua
                    </button>
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
                className="h-full w-full z-0 dark-tiles"
              >
                 <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                  onClick={handleSaveLocation} 
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
