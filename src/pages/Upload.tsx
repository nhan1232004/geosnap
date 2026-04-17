import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import exifr from 'exifr';
import { UploadCloud, CheckCircle2, Image as ImageIcon, AlertCircle, MapPin } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAppStore } from '../store/useAppStore';
import { findMatchingFolder } from '../lib/clustering';
import { reverseGeocode } from '../lib/geocoding';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function Upload() {
  const { user } = useAppStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [statusText, setStatusText] = useState('Select photos or drag and drop');
  const [manualQueue, setManualQueue] = useState<ManualItem[]>([]);
  const [folders, setFolders] = useState<{id: string, name: string, centerLat: number, centerLng: number, photoCount: number, coverPhotoUrl?: string}[]>([]);
  const [pickingItem, setPickingItem] = useState<ManualItem | null>(null);
  const [pickedPos, setPickedPos] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchFolders = async () => {
      try {
        const q = query(collection(db, 'folders'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'folders');
      }
    };
    fetchFolders();
  }, [user]);

  const handleAssign = async (item: ManualItem, folderId: string) => {
    if (!user) return;
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      
      await addDoc(collection(db, 'photos'), {
        uid: user.uid,
        url: item.url,
        latitude: folder.centerLat,
        longitude: folder.centerLng,
        takenAt: item.takenAt,
        uploadedAt: new Date().toISOString(),
        hasGps: true,
        folderId: folder.id
      });

      await updateDoc(doc(db, 'folders', folder.id), {
        photoCount: folder.photoCount + 1,
        coverPhotoUrl: folder.coverPhotoUrl || item.url
      });

      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, photoCount: f.photoCount + 1, coverPhotoUrl: f.coverPhotoUrl || item.url } as any : f));
      
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'photos/folders');
    } finally {
      setManualQueue(prev => prev.filter(i => i.name !== item.name));
      setProgress(prev => ({ ...prev, [item.name]: 100 }));
    }
  };

  const handleSkip = (item: ManualItem) => {
    setManualQueue(prev => prev.filter(i => i.name !== item.name));
    setProgress(prev => ({ ...prev, [item.name]: -2 })); // -2 means skipped
  };

  const handleDateChange = (itemName: string, val: string) => {
    if (!val) return;
    try {
      const iso = new Date(val).toISOString();
      setManualQueue(prev => prev.map(i => i.name === itemName ? { ...i, takenAt: iso } : i));
    } catch (e) {
      // ignore invalid dates
    }
  };

  const handleMapConfirm = async () => {
    if (!pickingItem || !pickedPos || !user) return;
    const { lat, lng } = pickedPos;
    
    try {
      let matchingFolder = findMatchingFolder(lat, lng, folders);
      let folderId;

      if (matchingFolder) {
        const newCount = matchingFolder.photoCount + 1;
        const newLat = ((matchingFolder.centerLat * matchingFolder.photoCount) + lat) / newCount;
        const newLng = ((matchingFolder.centerLng * matchingFolder.photoCount) + lng) / newCount;

        await updateDoc(doc(db, 'folders', matchingFolder.id), {
          photoCount: newCount,
          centerLat: newLat,
          centerLng: newLng,
          coverPhotoUrl: matchingFolder.coverPhotoUrl || pickingItem.url
        });
        setFolders(prev => prev.map(f => f.id === matchingFolder.id ? {...f, photoCount: newCount, coverPhotoUrl: matchingFolder.coverPhotoUrl || pickingItem.url} as any : f));
        folderId = matchingFolder.id;
      } else {
        const name = await reverseGeocode(lat, lng);
        const newFolderRef = await addDoc(collection(db, 'folders'), {
          uid: user.uid,
          name,
          centerLat: lat,
          centerLng: lng,
          photoCount: 1,
          coverPhotoUrl: pickingItem.url,
          createdAt: new Date().toISOString()
        });
        folderId = newFolderRef.id;
        setFolders(prev => [...prev, { id: folderId, name, centerLat: lat, centerLng: lng, photoCount: 1, coverPhotoUrl: pickingItem.url }]);
      }

      await addDoc(collection(db, 'photos'), {
        uid: user.uid,
        url: pickingItem.url,
        latitude: lat,
        longitude: lng,
        takenAt: pickingItem.takenAt,
        uploadedAt: new Date().toISOString(),
        hasGps: true,
        folderId
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'photos/folders');
    } finally {
      setManualQueue(prev => prev.filter(i => i.name !== pickingItem.name));
      setProgress(prev => ({ ...prev, [pickingItem.name]: 100 }));
      setPickingItem(null);
      setPickedPos(null);
    }
  };

  const processFile = async (file: File) => {
    if (!user) return;
    
    setProgress(prev => ({ ...prev, [file.name]: 10 }));
    // Parse EXIF
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
    
    // Resize image and convert to base64 to store safely inside Firestore Document directly
    const url = await resizeImage(file, 800, 800);
    
    setProgress(prev => ({ ...prev, [file.name]: 70 }));

    if (!hasGps) {
      setManualQueue(prev => [...prev, { file, url, name: file.name, takenAt }]);
      setProgress(prev => ({ ...prev, [file.name]: -1 })); // -1 means wait for manual queue
      return;
    }

    // Load user's folders to find a match
    let foldersSnapshot;
    try {
      const q = query(collection(db, 'folders'), where('uid', '==', user.uid));
      foldersSnapshot = await getDocs(q);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'folders');
      return;
    }
    const serverFolders = foldersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let matchingFolder = findMatchingFolder(lat, lng, serverFolders);

    try {
      if (matchingFolder) {
        // Update existing folder
        const newCount = matchingFolder.photoCount + 1;
        const newLat = ((matchingFolder.centerLat * matchingFolder.photoCount) + lat) / newCount;
        const newLng = ((matchingFolder.centerLng * matchingFolder.photoCount) + lng) / newCount;

        await updateDoc(doc(db, 'folders', matchingFolder.id), {
          photoCount: newCount,
          centerLat: newLat,
          centerLng: newLng,
          coverPhotoUrl: matchingFolder.coverPhotoUrl || url
        });
        setFolders(prev => prev.some(f => f.id === matchingFolder.id) ? prev.map(f => f.id === matchingFolder.id ? {...f, photoCount: newCount, coverPhotoUrl: matchingFolder.coverPhotoUrl || url} as any : f) : prev);
      } else {
        // Create new folder
        const name = await reverseGeocode(lat, lng);
        const newFolderRef = await addDoc(collection(db, 'folders'), {
          uid: user.uid,
          name,
          centerLat: lat,
          centerLng: lng,
          photoCount: 1,
          coverPhotoUrl: url,
          createdAt: new Date().toISOString()
        });
        matchingFolder = { id: newFolderRef.id };
        setFolders(prev => [...prev, { id: newFolderRef.id, name, centerLat: lat, centerLng: lng, photoCount: 1, coverPhotoUrl: url }]);
      }

      // Add photo
      await addDoc(collection(db, 'photos'), {
        uid: user.uid,
        url,
        latitude: lat,
        longitude: lng,
        takenAt,
        uploadedAt: new Date().toISOString(),
        hasGps: true,
        folderId: matchingFolder.id
      });
      
      setProgress(prev => ({ ...prev, [file.name]: 100 }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'photos/folders');
      setProgress(prev => ({ ...prev, [file.name]: -2 })); // mark as skipped on error
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    setStatusText(`Processing ${acceptedFiles.length} photos...`);

    const initialProgress = acceptedFiles.reduce((acc, file) => {
      acc[file.name] = 0;
      return acc;
    }, {} as { [key: string]: number });
    setProgress(initialProgress);

    try {
      await Promise.all(acceptedFiles.map(processFile));
      setStatusText('All photos uploaded successfully!');
    } catch (e) {
      console.error(e);
      setStatusText('Error uploading photos. Check console.');
    } finally {
      setUploading(false);
    }
  }, [user]);

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
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-white">Upload Photos</h1>
      
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
                  <h4 className="font-medium text-white mb-1 line-clamp-1">{item.name}</h4>
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
              <h3 className="text-white font-semibold text-lg">Pick Map Location</h3>
              <p className="text-[13px] text-text-dim mt-1">Click anywhere on the map to drop a pin for <span className="text-brand">{pickingItem.name}</span>.</p>
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
            <div className="p-5 flex justify-end gap-3 border-t border-border-dim bg-bg-card">
              <button 
                onClick={() => { setPickingItem(null); setPickedPos(null); }} 
                className="px-6 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-white hover:bg-glass border border-border-dim transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleMapConfirm} 
                disabled={!pickedPos} 
                className="px-6 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
