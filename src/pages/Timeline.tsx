import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, MapPin, Plus } from 'lucide-react';

export default function Timeline() {
  const { user } = useAppStore();
  const [folders, setFolders] = useState<LocationFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'folders'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocationFolder));
      setFolders(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'folders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, folder: LocationFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this folder and all its photos?')) return;

    try {
      // First, get all photos in this folder
      const q = query(collection(db, 'photos'), where('uid', '==', user!.uid));
      const snapshot = await getDocs(q);
      const docsToDelete = snapshot.docs.filter(d => d.data().folderId === folder.id);
      
      // Delete photos
      await Promise.all(docsToDelete.map(d => deleteDoc(doc(db, 'photos', d.id))));
      // Delete folder itself
      await deleteDoc(doc(db, 'folders', folder.id));
      setActionMenuId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'folders/photos');
    }
  };

  const handleEdit = (e: React.MouseEvent, folder: LocationFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(folder.id);
    setEditName(folder.name);
    setActionMenuId(null);
  };

  const saveEdit = async (e: React.MouseEvent | React.FormEvent, folder: LocationFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim()) return;

    try {
      await updateDoc(doc(db, 'folders', folder.id), {
        name: editName.trim()
      });
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'folders');
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;

    try {
      await addDoc(collection(db, 'folders'), {
        uid: user.uid,
        name: newName.trim(),
        centerLat: 10.8231, // Default lat
        centerLng: 106.6297, // Default lng
        photoCount: 0,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'folders');
    }
  };

  if (loading) return <div className="p-8">Loading timeline...</div>;

  const groupedFolders = folders.reduce((acc, folder) => {
    const d = folder.createdAt ? new Date(folder.createdAt) : new Date();
    const month = format(d, 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(folder);
    return acc;
  }, {} as Record<string, LocationFolder[]>);

  // If no folders exist, create a dummy group for "Today" just to show the grid
  if (Object.keys(groupedFolders).length === 0) {
    const month = format(new Date(), 'MMMM yyyy');
    groupedFolders[month] = [];
  }

  return (
    <div className="p-10 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-white">Explore Journey</h1>
          <div className="flex gap-6 mt-2">
            <div className="text-[12px] text-text-dim uppercase tracking-widest">Total Folders: <span className="text-text-main font-semibold ml-1">{folders.length}</span></div>
            <div className="text-[12px] text-text-dim uppercase tracking-widest">Photos: <span className="text-text-main font-semibold ml-1">{folders.reduce((acc, f) => acc + f.photoCount, 0)}</span></div>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-brand/90 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" /> New Folder
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-6 bg-bg-card rounded-[20px] border border-border-dim">
          <h3 className="text-lg font-medium text-white mb-4">Create New Folder</h3>
          <form onSubmit={handleAddFolder} className="flex gap-4">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Vacation in Kyoto"
              autoFocus
              className="flex-1 bg-surface border border-border-dim rounded-xl px-4 py-3 outline-none focus:border-brand text-white"
            />
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl border border-border-dim text-text-dim hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={!newName.trim()} className="px-6 py-3 rounded-xl bg-brand text-white disabled:opacity-50 hover:bg-brand/90 transition-colors">Create</button>
          </form>
        </div>
      )}
      
      {folders.length === 0 && !isAdding ? (
        <div className="text-center py-20 bg-bg-card rounded-[20px] border border-border-dim">
          <p className="text-text-dim mb-4">No locations yet.</p>
          <Link to="/upload" className="text-brand hover:text-white transition-colors">Upload some photos</Link>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedFolders).map(([month, monthFoldersArray]: [string, any]) => (
            <div key={month}>
              <h2 className="mb-6 text-sm font-semibold tracking-wider text-text-dim uppercase border-b border-border-dim pb-3">{month}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(monthFoldersArray as LocationFolder[]).map(folder => (
                  <Link key={folder.id} to={`/folder/${folder.id}`} className="group relative h-[240px] bg-bg-card rounded-[20px] border border-border-dim overflow-hidden hover:border-brand/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                    {folder.coverPhotoUrl ? (
                      <img src={folder.coverPhotoUrl} alt={folder.name} className="w-full h-full object-cover opacity-60 grayscale-[0.2] transition-transform group-hover:scale-105 duration-700" />
                    ) : (
                      <div className="w-full h-full bg-surface"></div>
                    )}
                    <div className="absolute top-4 right-4 z-20">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActionMenuId(actionMenuId === folder.id ? null : folder.id);
                        }}
                        className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {actionMenuId === folder.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-bg-main border border-border-dim rounded-xl shadow-xl overflow-hidden py-1">
                          <button 
                            onClick={(e) => handleEdit(e, folder)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface text-text-main flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Rename Folder
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, folder)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface text-red-500 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Folder
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-10 font-sans">
                      {editingId === folder.id ? (
                        <form onSubmit={(e) => saveEdit(e, folder)} className="mb-2" onClick={e => e.stopPropagation()}>
                          <input 
                            autoFocus
                            type="text" 
                            className="w-full bg-black/60 border border-brand/50 text-white px-3 py-1 text-lg font-semibold rounded outline-none backdrop-blur-sm"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={(e) => saveEdit(e, folder)}
                          />
                        </form>
                      ) : (
                        <div className="text-lg font-semibold mb-1 text-white truncate">{folder.name}</div>
                      )}
                      
                      <div className="text-[12px] text-text-dim flex gap-3">
                        <span>{folder.photoCount} {folder.photoCount === 1 ? 'photo' : 'photos'}</span>
                        <span>•</span>
                        <span>{folder.createdAt ? format(new Date(folder.createdAt), 'MMM dd, yyyy') : 'Unknown'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
