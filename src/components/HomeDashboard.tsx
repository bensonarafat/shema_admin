import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpRight, Play, CheckCircle, Disc, BookOpen, Heart, Users, Pencil } from 'lucide-react';
import type { Hymn } from '../types/hymn';
import { Shimmer, HymnTableSkeleton } from './Shimmer';
import { DEFAULT_HYMN_COVER_URL } from './UploadStudio';

interface HomeDashboardProps {
  hymns: Hymn[];
  loading?: boolean;
  onPlayHymn: (hymn: Hymn) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  hymns,
  loading = false,
  onPlayHymn,
}) => {
  const navigate = useNavigate();
  const publishedCount = hymns.filter((h) => h.status !== 'draft').length;
  const totalStems = hymns.reduce(
    (acc, h) => acc + (h.vocalURL ? 1 : 0) + (h.instrumentalURL ? 1 : 0) + (h.congregationURL ? 1 : 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total Hymns in Firebase</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#ECFDF5',
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              color: '#059669',
            }}>
              <CheckCircle size={12} />
              <span>LIVE FIREBASE</span>
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, marginBottom: 4 }}>
              <Shimmer width={150} height={36} borderRadius={8} />
              <Shimmer width={210} height={14} borderRadius={6} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                {publishedCount || hymns.length} <span style={{ fontSize: 20, fontWeight: 500, color: '#64748B' }}>hymns</span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {totalStems} audio stems linked in Cloudflare R2
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div 
            onClick={() => navigate('/upload')} 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#F1F3F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A'
            }}>
              <Plus size={22} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Add hymn</span>
          </div>

          <div 
            onClick={() => navigate('/settings')} 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#F1F3F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A'
            }}>
              <ArrowUpRight size={22} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Settings</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="flat-card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>
          Quick Actions
        </h3>
        
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          <div className="quick-action-item" onClick={() => navigate('/upload')}>
            <div className="quick-action-circle">
              <span className="badge-hot">NEW</span>
              <Plus size={20} />
            </div>
            <span className="quick-action-label">Upload Hymn</span>
          </div>

          <div className="quick-action-item" onClick={() => navigate('/devotions')}>
            <div className="quick-action-circle">
              <BookOpen size={20} />
            </div>
            <span className="quick-action-label">Devotions</span>
          </div>

          <div className="quick-action-item" onClick={() => navigate('/prayers')}>
            <div className="quick-action-circle">
              <Heart size={20} />
            </div>
            <span className="quick-action-label">Prayers</span>
          </div>

          <div className="quick-action-item" onClick={() => navigate('/users')}>
            <div className="quick-action-circle">
              <Users size={20} />
            </div>
            <span className="quick-action-label">Users</span>
          </div>
        </div>
      </div>

      {/* Recent Hymns Table */}
      <div className="flat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            Recent Hymns
          </h3>
          {hymns.length > 0 && (
            <button 
              onClick={() => navigate('/library')} 
              style={{ background: 'transparent', color: '#5B4DFC', fontSize: 13, fontWeight: 700 }}
            >
              See all
            </button>
          )}
        </div>

        {loading ? (
          <HymnTableSkeleton rows={4} />
        ) : hymns.length === 0 ? (
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
              No hymns in Firebase Firestore yet
            </div>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 420 }}>
              Start by uploading your first hymn. The audio stems and background will be uploaded directly to Cloudflare R2 and synced to Firestore.
            </p>
            <button 
              onClick={() => navigate('/upload')} 
              className="btn-primary" 
              style={{ marginTop: 8 }}
            >
              + Upload First Hymn
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
                <th>STEMS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {hymns.slice(0, 6).map((hymn) => (
                <tr key={hymn.id}>
                  <td style={{ fontWeight: 700, color: '#64748B' }}>#{hymn.number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img 
                        src={hymn.coverImageUrl || DEFAULT_HYMN_COVER_URL} 
                        alt={hymn.title} 
                        style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_HYMN_COVER_URL;
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{hymn.title}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{hymn.author || 'Traditional'}</div>
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
                    <div style={{ display: 'flex', gap: 4 }}>
                      {hymn.vocalURL && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }}>Vocal</span>}
                      {hymn.instrumentalURL && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: '#F0FDF4', color: '#16A34A', fontWeight: 600 }}>Inst</span>}
                      {hymn.congregationURL && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: '#FAF5FF', color: '#9333EA', fontWeight: 600 }}>Choir</span>}
                      {!hymn.vocalURL && !hymn.instrumentalURL && !hymn.congregationURL && <span style={{ fontSize: 11, color: '#94A3B8' }}>-</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${hymn.status === 'draft' ? 'warning' : 'success'}`}>
                      <span className="dot"></span>
                      <span>{hymn.status === 'draft' ? 'Draft' : 'Published'}</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => onPlayHymn(hymn)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#F1F3F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0F172A',
                        }}
                        title="Play vocal stem"
                      >
                        <Play size={14} fill="#0F172A" />
                      </button>
                      <button 
                        onClick={() => navigate(`/edit/${hymn.id}`, { state: { hymn } })}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#EEEDFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#5B4DFC',
                        }}
                        title="Edit hymn"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
