import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { LocationFolder, Photo } from '../types';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function FolderDetail() {
  const { id } = useParams<{ id: string }>();
  const [folder, setFolder] = useState<LocationFolder | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAppStore();

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      try {
        const folderDoc = await getDoc(doc(db, 'folders', id));
        if (folderDoc.exists()) {
          setFolder({ id: folderDoc.id, ...folderDoc.data() } as LocationFolder);
        }

        // Fetch all user's photos and filter by folderId to avoid needing a composite index
        const q = query(collection(db, 'photos'), where('uid', '==', user.uid));
        const photoSnaps = await getDocs(q);
        const fetchedPhotos = photoSnaps.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Photo))
          .filter(photo => photo.folderId === id);
        
        // Sort by takenAt if defined
        fetchedPhotos.sort((a, b) => {
          if (!a.takenAt || !b.takenAt) return 0;
          return new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime();
        });

        setPhotos(fetchedPhotos);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'folders/photos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  if (loading) return <div className="p-8">Loading folder...</div>;
  if (!folder) return <div className="p-8">Folder not found.</div>;

  return (
    <div className="mx-auto max-w-7xl p-10">
      <div className="mb-10 flex flex-col gap-4">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center text-[13px] font-medium text-text-dim hover:text-brand transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to timeline
          </Link>
          <h1 className="text-[40px] font-bold tracking-tight text-white leading-none">{folder.name}</h1>
          <div className="mt-4 flex gap-4 text-text-dim uppercase tracking-widest text-[12px]">
            <div className="flex items-center">
              <span className="text-text-main font-semibold mr-1">{folder.photoCount}</span> photos
            </div>
            {folder.firstVisitedAt && (
              <div className="flex items-center">
                <span className="text-text-main font-semibold mr-1">{new Date(folder.firstVisitedAt).getFullYear()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {photos.map(photo => (
          <div key={photo.id} className="aspect-square bg-bg-card rounded-2xl border border-border-dim overflow-hidden relative group">
            <img 
              src={photo.url} 
              alt="Memory" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              {photo.hasGps && <MapPin className="text-white w-6 h-6 opacity-70" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
