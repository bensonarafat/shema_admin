import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { UploadStudio } from './components/UploadStudio';
import { HymnLibrary } from './components/HymnLibrary';
import { R2Settings } from './components/R2Settings';
import { UsersView } from './components/UsersView';
import { DevotionsView } from './components/DevotionsView';
import { PrayersView } from './components/PrayersView';
import { LoginView } from './components/LoginView';
import { auth, onAuthStateChanged, signOut, type User } from './config/firebase';
import { subscribeToHymns, fetchHymnsFromFirestore } from './services/hymnService';
import { AppLoadingSkeleton } from './components/Shimmer';
import type { Hymn } from './types/hymn';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loadingHymns, setLoadingHymns] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);

  // Live Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Live Real-Time Firestore Subscription (Only when user is authenticated)
  useEffect(() => {
    if (!user) {
      setHymns([]);
      setLoadingHymns(false);
      return;
    }

    setLoadingHymns(true);
    const unsubscribe = subscribeToHymns(
      (liveHymns) => {
        setHymns(liveHymns);
        setLoadingHymns(false);
      },
      (err) => {
        console.warn('Firestore live subscription:', err.message);
        setLoadingHymns(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const loadHymns = async () => {
    const fresh = await fetchHymnsFromFirestore();
    setHymns(fresh);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handlePlayHymn = (hymn: Hymn) => {
    if (playingAudio) {
      playingAudio.pause();
    }
    if (hymn.vocalURL) {
      const audio = new Audio(hymn.vocalURL);
      audio.play().catch((err) => {
        console.error('Audio playback error:', err);
      });
      setPlayingAudio(audio);
    }
  };

  if (authLoading) {
    return <AppLoadingSkeleton />;
  }

  // Pure Google OAuth Login (No Dev Mode button)
  if (!user) {
    return <LoginView />;
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Left Sidebar with real URL navigation */}
        <Sidebar />

        {/* Main Workspace */}
        <div className="main-wrapper">
          <Header 
            user={user} 
            onLogout={handleLogout} 
          />

          <Routes>
            <Route 
              path="/" 
              element={
                <HomeDashboard 
                  hymns={hymns}
                  loading={loadingHymns}
                  onPlayHymn={handlePlayHymn}
                />
              } 
            />

            <Route 
              path="/upload" 
              element={
                <UploadStudio 
                  hymns={hymns}
                  nextHymnNumber={hymns.length + 1}
                />
              } 
            />

            <Route 
              path="/edit/:id" 
              element={
                <UploadStudio 
                  hymns={hymns}
                  nextHymnNumber={hymns.length + 1}
                />
              } 
            />

            <Route 
              path="/library" 
              element={
                <HymnLibrary 
                  hymns={hymns}
                  loading={loadingHymns}
                  onRefresh={loadHymns}
                />
              } 
            />

            <Route 
              path="/devotions" 
              element={<DevotionsView />} 
            />

            <Route 
              path="/prayers" 
              element={<PrayersView />} 
            />

            <Route 
              path="/users" 
              element={<UsersView />} 
            />

            <Route 
              path="/settings" 
              element={<R2Settings />} 
            />

            <Route 
              path="/cloudflare" 
              element={<Navigate to="/settings" replace />} 
            />

            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
