import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAppStore } from './store/useAppStore';

import Login from './pages/Login';
import Timeline from './pages/Timeline';
import Upload from './pages/Upload';
import MapViewPage from './pages/Map';
import FolderDetail from './pages/FolderDetail';

export default function App() {
  const { user, authLoaded, setUser, setAuthLoaded } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Auto-create user document if it doesn't exist
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              avatarUrl: currentUser.photoURL || '',
              role: 'user',
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, 'users');
        }
      }
      
      setAuthLoaded(true);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoaded]);

  if (!authLoaded) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      {user && <div className="atmosphere"></div>}
      <div className={user ? "flex h-screen overflow-hidden" : "h-screen"}>
        {user && (
          <aside className="w-[260px] bg-black/80 border-r border-border-dim backdrop-blur-xl p-10 px-6 flex flex-col gap-10 shrink-0 relative z-10">
            <div className="flex items-center gap-3 text-[22px] font-extrabold tracking-tight text-brand">
              <div className="w-8 h-8 bg-brand rounded-lg"></div>
              GeoSnap
            </div>

            <nav>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link to="/" className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-text-dim hover:text-text-main hover:bg-glass transition-all aria-[current=page]:bg-glass aria-[current=page]:text-text-main aria-[current=page]:shadow-[inset_0_0_0_1px_var(--color-border-dim)]">
                    Timeline View
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-text-dim hover:text-text-main hover:bg-glass transition-all aria-[current=page]:bg-glass aria-[current=page]:text-text-main aria-[current=page]:shadow-[inset_0_0_0_1px_var(--color-border-dim)]">
                    Map Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/upload" className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-text-dim hover:text-text-main hover:bg-glass transition-all aria-[current=page]:bg-glass aria-[current=page]:text-text-main aria-[current=page]:shadow-[inset_0_0_0_1px_var(--color-border-dim)]">
                    Upload Photos
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="mt-auto">
              <input type="text" className="w-full bg-glass border border-border-dim px-4 py-2.5 rounded-lg text-[13px] text-text-main placeholder:text-text-dim outline-none focus:border-brand" placeholder="Search locations..." />
              <div className="mt-5 text-[11px] text-text-dim">
                Logged in as <strong className="text-text-main truncate block">{user.email}</strong>
              </div>
              <button onClick={() => auth.signOut()} className="mt-4 text-xs font-medium text-red-400 hover:text-red-300 transition-colors">Sign Out</button>
            </div>
          </aside>
        )}
        
        <main className="flex-1 relative overflow-auto">
          <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Timeline /> : <Navigate to="/login" />} />
          <Route path="/map" element={user ? <MapViewPage /> : <Navigate to="/login" />} />
          <Route path="/upload" element={user ? <Upload /> : <Navigate to="/login" />} />
          <Route path="/folder/:id" element={user ? <FolderDetail /> : <Navigate to="/login" />} />
        </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
