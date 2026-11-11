import React, { useState, useEffect } from 'react';
import { 
  Video, 
  UploadCloud, 
  Play, 
  Trash2, 
  Pencil, 
  Star, 
  Search, 
  ExternalLink,
  X,
  Clock,
  Film
} from 'lucide-react';
import { 
  subscribeToWorshipVideos, 
  deleteWorshipVideoFromFirestore, 
  updateWorshipVideoInFirestore 
} from '../services/videoService';
import { UploadVideoModal } from './UploadVideoModal';
import { DEFAULT_WORSHIP_CATEGORIES, type WorshipVideo } from '../types/video';

export const VideosView: React.FC = () => {
  const [videos, setVideos] = useState<WorshipVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [editingVideo, setEditingVideo] = useState<WorshipVideo | null>(null);
  const [previewingVideo, setPreviewingVideo] = useState<WorshipVideo | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToWorshipVideos(
      (liveVideos) => {
        setVideos(liveVideos);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading videos:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async (video: WorshipVideo) => {
    if (!window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
      return;
    }

    try {
      await deleteWorshipVideoFromFirestore(video.id);
    } catch (err) {
      console.error('Delete video error:', err);
      alert('Could not delete video. Please check your connection.');
    }
  };

  const handleToggleFeatured = async (video: WorshipVideo) => {
    try {
      await updateWorshipVideoInFirestore(video.id, {
        isFeatured: !video.isFeatured,
      });
    } catch (err) {
      console.error('Toggle featured error:', err);
    }
  };

  // Filtered List
  const filteredVideos = videos.filter((v) => {
    const matchesSearch = 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.artist && v.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.tags && v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = 
      selectedCategory === 'All' || v.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredCount = videos.filter((v) => v.isFeatured).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Media Studio</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#EEEDFE',
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              color: '#5B4DFC',
            }}>
              <Video size={12} />
              <span>WORSHIP VIDEOS</span>
            </div>
            {featuredCount > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#FEF3C7',
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 700,
                color: '#D97706',
              }}>
                <Star size={11} fill="#D97706" />
                <span>{featuredCount} FEATURED HERO</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {videos.length} <span style={{ fontSize: 20, fontWeight: 500, color: '#64748B' }}>videos</span>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            Worship sessions, sermons, and acoustic videos streamed in the mobile app Worship tab
          </div>
        </div>

        {/* Upload Button */}
        <div>
          <button
            onClick={() => {
              setEditingVideo(null);
              setIsUploadModalOpen(true);
            }}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 12,
            }}
          >
            <UploadCloud size={18} />
            <span>+ Upload Worship Video</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flat-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: 240 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search worship videos by title, worship leader, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 40, height: 42 }}
            />
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: 12 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['All', ...DEFAULT_WORSHIP_CATEGORIES.map((c) => c.value)].map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 600,
                  backgroundColor: isActive ? '#5B4DFC' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#475569',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
          Loading worship video archives from Cloudflare R2...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="flat-card" style={{
          padding: '64px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#EEEDFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5B4DFC',
          }}>
            <Film size={28} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
            No worship videos found
          </div>
          <p style={{ fontSize: 13, color: '#64748B', maxWidth: 420 }}>
            {searchQuery || selectedCategory !== 'All'
              ? 'No videos match your active filter. Try clearing your search.'
              : 'Upload your first worship or ministry video to stream directly into the Shema mobile app.'}
          </p>
          <button
            onClick={() => {
              setEditingVideo(null);
              setIsUploadModalOpen(true);
            }}
            className="btn-primary"
            style={{ marginTop: 8 }}
          >
            + Upload Video to Cloudflare R2
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 20,
        }}>
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="flat-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Thumbnail Container */}
              <div style={{
                position: 'relative',
                height: 180,
                backgroundColor: '#0F172A',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => setPreviewingVideo(video)}
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'opacity 0.2s ease',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1E293B',
                    color: '#64748B',
                  }}>
                    <Video size={40} />
                  </div>
                )}

                {/* Duration Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backdropFilter: 'blur(4px)',
                }}>
                  <Clock size={11} />
                  <span>{formatDuration(video.duration)}</span>
                </div>

                {/* Aspect Ratio Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  color: '#E2E8F0',
                  padding: '3px 7px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  {video.aspectRatio || '16:9'}
                </div>

                {/* Featured Badge */}
                {video.isFeatured && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    padding: '3px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}>
                    <Star size={11} fill="#B45309" />
                    <span>FEATURED</span>
                  </div>
                )}

                {/* Play Button Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  opacity: 0.9,
                  transition: 'opacity 0.2s ease',
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#5B4DFC',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}>
                    <Play size={20} fill="#5B4DFC" style={{ marginLeft: 2 }} />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 10 }}>
                {/* Category Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {video.category}
                  </span>

                  {/* Toggle Featured Star */}
                  <button
                    onClick={() => handleToggleFeatured(video)}
                    title={video.isFeatured ? 'Remove from Featured Hero' : 'Feature as Hero Video in Mobile Tab'}
                    style={{
                      background: 'none',
                      padding: 4,
                      color: video.isFeatured ? '#D97706' : '#94A3B8',
                      cursor: 'pointer',
                    }}
                  >
                    <Star size={16} fill={video.isFeatured ? '#D97706' : 'none'} />
                  </button>
                </div>

                {/* Title */}
                <div>
                  <h4 style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0F172A',
                    lineHeight: 1.4,
                    margin: 0,
                  }}>
                    {video.title}
                  </h4>
                  {video.artist && (
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: 600 }}>
                      {video.artist}
                    </div>
                  )}
                </div>

                {/* Description Snippet */}
                {video.description && (
                  <p style={{
                    fontSize: 12,
                    color: '#64748B',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    margin: 0,
                  }}>
                    {video.description}
                  </p>
                )}

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {video.tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{ fontSize: 10, color: '#64748B', backgroundColor: '#F8FAFC', padding: '1px 6px', borderRadius: 4 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 12,
                  marginTop: 6,
                  borderTop: '1px solid #F1F5F9',
                }}>
                  <button
                    onClick={() => setPreviewingVideo(video)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Play size={12} />
                    <span>Watch</span>
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingVideo(video);
                        setIsUploadModalOpen(true);
                      }}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12 }}
                      title="Edit Video"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      onClick={() => handleDelete(video)}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626' }}
                      title="Delete Video"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload & Edit Video Modal */}
      {isUploadModalOpen && (
        <UploadVideoModal
          videoToEdit={editingVideo}
          onClose={() => {
            setIsUploadModalOpen(false);
            setEditingVideo(null);
          }}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            setEditingVideo(null);
          }}
        />
      )}

      {/* Video Player Modal */}
      {previewingVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 20,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            backgroundColor: '#0F172A',
            borderRadius: 20,
            overflow: 'hidden',
            width: '100%',
            maxWidth: 780,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#1E293B',
            }}>
              <div>
                <h4 style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {previewingVideo.title}
                </h4>
                {previewingVideo.artist && (
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                    {previewingVideo.artist}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href={previewingVideo.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <span>Open URL</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setPreviewingVideo(null)}
                  style={{
                    background: 'none',
                    color: '#94A3B8',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Native Video Player */}
            <div style={{
              maxHeight: 480,
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <video
                src={previewingVideo.videoUrl}
                poster={previewingVideo.thumbnailUrl}
                controls
                autoPlay
                style={{
                  width: '100%',
                  maxHeight: 480,
                  backgroundColor: '#000',
                }}
              />
            </div>

            {/* Video Details Bar */}
            <div style={{
              padding: '14px 20px',
              backgroundColor: '#1E293B',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: '#94A3B8',
            }}>
              <div>
                Category: <strong style={{ color: '#F1F5F9' }}>{previewingVideo.category}</strong> • Duration: <strong style={{ color: '#F1F5F9' }}>{formatDuration(previewingVideo.duration)}</strong>
              </div>
              <button
                onClick={() => {
                  const target = previewingVideo;
                  setPreviewingVideo(null);
                  setEditingVideo(target);
                  setIsUploadModalOpen(true);
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Edit Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
