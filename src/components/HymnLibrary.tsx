import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Pause, Music, Trash2, FileText, ExternalLink, Disc } from 'lucide-react';
import type { Hymn } from '../types/hymn';
import { deleteHymnFromFirestore } from '../services/hymnService';

interface HymnLibraryProps {
  hymns: Hymn[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const HymnLibrary: React.FC<HymnLibraryProps> = ({ 
  hymns, 
  loading = false, 
  onRefresh
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hymn' | 'psalm'>('all');
  const [activeStem, setActiveStem] = useState<{ id: string; stem: string; url: string } | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [viewingLyrics, setViewingLyrics] = useState<Hymn | null>(null);

  const categories = ['All', ...Array.from(new Set(hymns.map((h) => h.category).filter(Boolean)))];

  const filteredHymns = hymns.filter((h) => {
    const matchesSearch = h.title.toLowerCase().includes(search.toLowerCase()) || 
                          (h.author && h.author.toLowerCase().includes(search.toLowerCase())) ||
                          h.number.toString().includes(search);
    const matchesCategory = selectedCategory === 'All' || h.category === selectedCategory;
    const matchesType = typeFilter === 'all' || 
                        (typeFilter === 'hymn' && h.isHymn !== false) ||
                        (typeFilter === 'psalm' && h.isHymn === false);
    return matchesSearch && matchesCategory && matchesType;
  });

  const togglePlayStem = (hymn: Hymn, stem: 'vocal' | 'instrumental' | 'congregation') => {
    let url = hymn.vocalURL;
    if (stem === 'instrumental') url = hymn.instrumentalURL;
    if (stem === 'congregation') url = hymn.congregationURL;

    if (!url) return;

    if (activeStem?.id === hymn.id && activeStem.stem === stem) {
      audioElement?.pause();
      setActiveStem(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.play().catch((err) => {
      console.error('Audio playback error:', err);
    });
    setAudioElement(audio);
    setActiveStem({ id: hymn.id, stem, url });

    audio.onended = () => {
      setActiveStem(null);
    };
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from Firebase Firestore?`)) {
      await deleteHymnFromFirestore(id);
      onRefresh?.();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Search and Filter Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 14 }} />
            <input 
              type="text" 
              placeholder="Search by title, author, or #..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 40 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: selectedCategory === cat ? '#5B4DFC' : '#F1F3F6',
                  color: selectedCategory === cat ? '#FFFFFF' : '#64748B',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Type Filter: All vs Hymns vs Psalms */}
          <div style={{ display: 'flex', gap: 6, backgroundColor: '#F8F9FB', padding: 4, borderRadius: 9999 }}>
            <button
              onClick={() => setTypeFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: typeFilter === 'all' ? '#0F172A' : 'transparent',
                color: typeFilter === 'all' ? '#FFFFFF' : '#64748B',
              }}
            >
              All Tracks
            </button>
            <button
              onClick={() => setTypeFilter('hymn')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: typeFilter === 'hymn' ? '#5B4DFC' : 'transparent',
                color: typeFilter === 'hymn' ? '#FFFFFF' : '#64748B',
              }}
            >
              Hymns (isHymn: true)
            </button>
            <button
              onClick={() => setTypeFilter('psalm')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: typeFilter === 'psalm' ? '#5B4DFC' : 'transparent',
                color: typeFilter === 'psalm' ? '#FFFFFF' : '#64748B',
              }}
            >
              Psalms (isHymn: false)
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/upload')} className="btn-primary">
          + Add New Hymn
        </button>
      </div>

      {/* Hymns Table Card */}
      <div className="flat-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>
          Hymn Catalog ({filteredHymns.length})
        </h3>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            Loading hymns live from Firebase Firestore...
          </div>
        ) : filteredHymns.length === 0 ? (
          <div style={{ 
            padding: '48px 24px', 
            textAlign: 'center', 
            backgroundColor: '#F8F9FB', 
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#EEEDFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5B4DFC'
            }}>
              <Disc size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
              No hymns found in Firebase
            </div>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400 }}>
              {search ? 'Try clearing your search filters.' : 'Upload your first hymn to populate the live catalog.'}
            </p>
            <button 
              onClick={() => navigate('/upload')} 
              className="btn-primary" 
              style={{ marginTop: 8 }}
            >
              + Upload Hymn
            </button>
          </div>
        ) : (
          <table className="flat-table">
            <thead>
              <tr>
                <th>#</th>
                <th>HYMN TITLE</th>
                <th>CATEGORY</th>
                <th>DURATION</th>
                <th>MULTI-STEM AUDIO</th>
                <th>LYRICS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredHymns.map((hymn) => (
                <tr key={hymn.id}>
                  <td style={{ fontWeight: 700, color: '#64748B' }}>#{hymn.number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {hymn.coverImageUrl ? (
                        <img 
                          src={hymn.coverImageUrl} 
                          alt={hymn.title} 
                          style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F3F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Music size={18} color="#64748B" />
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{hymn.title}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            backgroundColor: hymn.isHymn !== false ? '#EEF2FF' : '#FAF5FF',
                            color: hymn.isHymn !== false ? '#4F46E5' : '#9333EA',
                          }}>
                            {hymn.isHymn !== false ? 'Hymn' : 'Psalm'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{hymn.author || 'Traditional'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      backgroundColor: '#F1F3F6', 
                      padding: '4px 10px', 
                      borderRadius: 9999, 
                      fontSize: 12, 
                      fontWeight: 600,
                      color: '#475569' 
                    }}>
                      {hymn.category}
                    </span>
                  </td>
                  <td style={{ color: '#64748B', fontWeight: 500 }}>
                    {Math.floor(hymn.duration / 60)}:{(Math.round(hymn.duration % 60)).toString().padStart(2, '0')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => togglePlayStem(hymn, 'vocal')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: activeStem?.id === hymn.id && activeStem.stem === 'vocal' ? '#4F46E5' : '#EEF2FF',
                          color: activeStem?.id === hymn.id && activeStem.stem === 'vocal' ? '#FFFFFF' : '#4F46E5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {activeStem?.id === hymn.id && activeStem.stem === 'vocal' ? <Pause size={10} /> : <Play size={10} />}
                        <span>Vocal</span>
                      </button>

                      <button
                        onClick={() => togglePlayStem(hymn, 'instrumental')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: activeStem?.id === hymn.id && activeStem.stem === 'instrumental' ? '#16A34A' : '#F0FDF4',
                          color: activeStem?.id === hymn.id && activeStem.stem === 'instrumental' ? '#FFFFFF' : '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {activeStem?.id === hymn.id && activeStem.stem === 'instrumental' ? <Pause size={10} /> : <Play size={10} />}
                        <span>Inst</span>
                      </button>

                      <button
                        onClick={() => togglePlayStem(hymn, 'congregation')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: activeStem?.id === hymn.id && activeStem.stem === 'congregation' ? '#9333EA' : '#FAF5FF',
                          color: activeStem?.id === hymn.id && activeStem.stem === 'congregation' ? '#FFFFFF' : '#9333EA',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {activeStem?.id === hymn.id && activeStem.stem === 'congregation' ? <Pause size={10} /> : <Play size={10} />}
                        <span>Choir</span>
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => setViewingLyrics(hymn)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 11 }}
                    >
                      <FileText size={12} />
                      <span>View Text</span>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a 
                        href={hymn.coverImageUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#F1F3F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748B'
                        }}
                        title="Open R2 public link"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => handleDelete(hymn.id, hymn.title)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#FEE2E2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#DC2626'
                        }}
                        title="Delete hymn"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lyrics Viewer Modal */}
      {viewingLyrics && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 32,
            width: '90%',
            maxWidth: 580,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  {viewingLyrics.title} — lyricsFullText
                </h3>
                <span style={{ fontSize: 12, color: '#64748B' }}>#{viewingLyrics.number} • {viewingLyrics.author}</span>
              </div>
              <button 
                onClick={() => setViewingLyrics(null)} 
                className="btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                Close
              </button>
            </div>

            <div style={{ 
              backgroundColor: '#F8F9FB', 
              borderRadius: 14, 
              padding: 20, 
              overflowY: 'auto', 
              whiteSpace: 'pre-line',
              fontSize: 14,
              lineHeight: 1.8,
              color: '#1E293B'
            }}>
              {viewingLyrics.lyricsFullText || 'No lyrics text provided.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
