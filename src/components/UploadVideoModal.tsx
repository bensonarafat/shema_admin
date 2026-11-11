import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Video, 
  Play, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Star,
  Bell,
  Image as ImageIcon
} from 'lucide-react';
import { 
  extractVideoMetadata, 
  uploadWorshipVideoToCloudflare, 
  saveWorshipVideoToFirestore,
  updateWorshipVideoInFirestore,
  slugifyVideo,
  type VideoMetadata 
} from '../services/videoService';
import { sendAdminNotificationJob } from '../services/notificationAdminService';
import { DEFAULT_WORSHIP_CATEGORIES, type WorshipVideo } from '../types/video';

interface UploadVideoModalProps {
  videoToEdit?: WorshipVideo | null;
  onClose: () => void;
  onSuccess: (video: WorshipVideo) => void;
}

export const UploadVideoModal: React.FC<UploadVideoModalProps> = ({
  videoToEdit,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(videoToEdit);

  // Form State
  const [title, setTitle] = useState(videoToEdit?.title || '');
  const [artist, setArtist] = useState(videoToEdit?.artist || '');
  const [category, setCategory] = useState(videoToEdit?.category || 'Worship & Praise');
  const [description, setDescription] = useState(videoToEdit?.description || '');
  const [tagsInput, setTagsInput] = useState((videoToEdit?.tags || []).join(', '));
  const [isFeatured, setIsFeatured] = useState(Boolean(videoToEdit?.isFeatured));
  const [notifyUsers, setNotifyUsers] = useState<boolean>(!isEditing);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [customThumbnailPreview, setCustomThumbnailPreview] = useState<string | null>(
    videoToEdit?.thumbnailUrl || null
  );

  // Progress State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (.mp4, .mov, .webm, etc.)');
      return;
    }

    setError(null);
    setSelectedFile(file);

    try {
      const meta = await extractVideoMetadata(file);
      setMetadata(meta);
      // Auto-fill title from filename if title is empty
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err) {
      console.warn('Could not extract video metadata:', err);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file for the thumbnail');
      return;
    }

    setCustomThumbnailFile(file);
    setCustomThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a title for the video');
      return;
    }

    if (!isEditing && !selectedFile) {
      setError('Please select a video file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (isEditing && videoToEdit) {
        // If editing metadata and optional new file
        let videoUrl = videoToEdit.videoUrl;
        let thumbnailUrl = videoToEdit.thumbnailUrl;
        let duration = videoToEdit.duration;
        let aspectRatio = videoToEdit.aspectRatio;

        if (selectedFile) {
          const uploadRes = await uploadWorshipVideoToCloudflare({
            id: videoToEdit.id,
            title,
            videoFile: selectedFile,
            customThumbnailFile,
            autoThumbnailBlob: metadata?.thumbnailBlob,
            onProgress: (percent, loaded, total) => {
              setUploadProgress(percent);
              setBytesUploaded({ loaded, total });
            },
          });
          videoUrl = uploadRes.videoUrl;
          if (uploadRes.thumbnailUrl) thumbnailUrl = uploadRes.thumbnailUrl;
          duration = uploadRes.duration;
          aspectRatio = uploadRes.aspectRatio;
        }

        const updated: WorshipVideo = {
          ...videoToEdit,
          title: title.trim(),
          artist: artist.trim() || undefined,
          category,
          description: description.trim() || undefined,
          videoUrl,
          thumbnailUrl,
          duration,
          aspectRatio,
          isFeatured,
          tags: parsedTags,
        };

        await updateWorshipVideoInFirestore(videoToEdit.id, updated);
        if (notifyUsers) {
          try {
            await sendAdminNotificationJob({
              title: 'New Worship Video 🎬',
              body: `Watch "${updated.title}"${updated.artist ? ` by ${updated.artist}` : ''} now on Shema.`,
              target: 'all',
              deepLink: 'shorts',
              customData: {
                videoId: videoToEdit.id,
              },
            });
          } catch (notifErr) {
            console.warn('Could not dispatch video notification:', notifErr);
          }
        }
        setSuccessMessage('Video updated successfully!');
        setTimeout(() => {
          onSuccess(updated);
          onClose();
        }, 800);
      } else {
        // Creating new video
        const slug = `${slugifyVideo(title)}-${Date.now().toString(36)}`;
        const uploadRes = await uploadWorshipVideoToCloudflare({
          id: slug,
          title,
          videoFile: selectedFile!,
          customThumbnailFile,
          autoThumbnailBlob: metadata?.thumbnailBlob,
          onProgress: (percent, loaded, total) => {
            setUploadProgress(percent);
            setBytesUploaded({ loaded, total });
          },
        });

        const newVideo: WorshipVideo = {
          id: slug,
          title: title.trim(),
          artist: artist.trim() || undefined,
          category,
          description: description.trim() || undefined,
          videoUrl: uploadRes.videoUrl,
          thumbnailUrl: uploadRes.thumbnailUrl,
          duration: uploadRes.duration,
          aspectRatio: uploadRes.aspectRatio,
          isFeatured,
          tags: parsedTags,
          fileSize: selectedFile!.size,
          status: 'published',
          notifyUsers,
          notificationDispatched: notifyUsers,
          views: 0,
          likes: 0,
        };

        await saveWorshipVideoToFirestore(newVideo);
        if (notifyUsers) {
          try {
            await sendAdminNotificationJob({
              title: 'New Worship Video 🎬',
              body: `Watch "${newVideo.title}"${newVideo.artist ? ` by ${newVideo.artist}` : ''} now on Shema.`,
              target: 'all',
              deepLink: 'shorts',
              customData: {
                videoId: newVideo.id,
              },
            });
          } catch (notifErr) {
            console.warn('Could not dispatch video notification:', notifErr);
          }
        }
        setSuccessMessage('Video uploaded and published to Cloudflare R2!');
        setTimeout(() => {
          onSuccess(newVideo);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Video upload error:', err);
      setError(err?.message || 'Failed to save video. Check your Cloudflare R2 settings.');
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 680,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              backgroundColor: '#EEEDFE',
              color: '#5B4DFC',
              padding: '4px 8px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 4,
            }}>
              <Video size={13} />
              <span>WORSHIP & MINISTRY VIDEO</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
              {isEditing ? 'Edit Worship Video' : 'Upload Worship Video'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 12px' }}
            disabled={isUploading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div style={{
            backgroundColor: '#ECFDF5',
            color: '#059669',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Check size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* File Picker Zone */}
          <div
            onClick={() => videoInputRef.current?.click()}
            style={{
              border: '2px dashed #CBD5E1',
              borderRadius: 16,
              padding: selectedFile ? '20px' : '32px 20px',
              textAlign: 'center',
              backgroundColor: selectedFile ? '#F8F9FF' : '#F8FAFC',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              style={{ display: 'none' }}
              disabled={isUploading}
            />

            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: selectedFile ? '#EEEDFE' : '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: selectedFile ? '#5B4DFC' : '#64748B',
            }}>
              <UploadCloud size={24} />
            </div>

            {selectedFile ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {formatFileSize(selectedFile.size)} • Click to replace file
                </div>
              </div>
            ) : isEditing ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  Video is already attached
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Click to replace current video file (optional)
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  Click or drag video file here
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Supports MP4, MOV, WebM (Worship sessions, music videos, sermons)
                </div>
              </div>
            )}
          </div>

          {/* Video Metadata Preview */}
          {selectedFile && metadata && (
            <div style={{
              backgroundColor: '#F8F9FB',
              padding: 14,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: '#EEEDFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5B4DFC',
                }}>
                  <Play size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Auto-detected Specs
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    Duration: <strong>{formatDuration(metadata.duration)}</strong> • {metadata.width}×{metadata.height} ({metadata.aspectRatio})
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 700,
              }}>
                Ready to stream
              </div>
            </div>
          )}

          {/* Title & Artist/Speaker Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                TITLE *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Goodness of God (Live Acoustic)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                ARTIST / WORSHIP LEADER / MINISTER
              </label>
              <input
                type="text"
                placeholder="e.g. Shema Worship / Pastor Benson"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                disabled={isUploading}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Category & Thumbnail Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isUploading}
                style={{ width: '100%' }}
              >
                {DEFAULT_WORSHIP_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                CUSTOM THUMBNAIL (OPTIONAL)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ padding: '10px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexGrow: 1 }}
                  disabled={isUploading}
                >
                  <ImageIcon size={14} />
                  <span>{customThumbnailFile ? customThumbnailFile.name.slice(0, 16) + '...' : 'Upload Cover'}</span>
                </button>
                {(customThumbnailPreview || metadata?.thumbnailBlob) && (
                  <img
                    src={customThumbnailPreview || (metadata?.thumbnailBlob ? URL.createObjectURL(metadata.thumbnailBlob) : '')}
                    alt="Thumb preview"
                    style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover', backgroundColor: '#000' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              rows={3}
              placeholder="Add lyrics, prayer points, scripture context, or reflection notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              TAGS (COMMA SEPARATED)
            </label>
            <input
              type="text"
              placeholder="e.g. worship, live, acoustic, peace, prayer"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={isUploading}
              style={{ width: '100%' }}
            />
          </div>

          {/* Featured in Mobile Worship Tab Toggle */}
          <div style={{
            backgroundColor: isFeatured ? '#F5F3FF' : '#F8FAFC',
            border: isFeatured ? '1px solid #DDD6FE' : '1px solid #E2E8F0',
            padding: 14,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setIsFeatured(!isFeatured)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: isFeatured ? '#EEEDFE' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFeatured ? '#5B4DFC' : '#64748B',
              }}>
                <Star size={18} fill={isFeatured ? '#5B4DFC' : 'none'} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  Feature as Hero Video in Mobile Worship Tab
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  Displays this video prominently at the top of the mobile app Worship screen
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#5B4DFC', cursor: 'pointer' }}
              disabled={isUploading}
            />
          </div>

          {/* Push Notification Toggle */}
          <div
            style={{
              backgroundColor: notifyUsers ? '#EEF2FF' : '#F8FAFC',
              border: notifyUsers ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
              padding: 14,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setNotifyUsers(!notifyUsers)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: notifyUsers ? '#EEEDFE' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: notifyUsers ? '#5B4DFC' : '#64748B',
              }}>
                <Bell size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  Send Push Notification to All Users
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  Broadcasts a notification to every Shema user when this video goes live
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={notifyUsers}
              onChange={(e) => setNotifyUsers(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 18, height: 18, accentColor: '#5B4DFC', cursor: 'pointer' }}
              disabled={isUploading}
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: 16,
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} className="spin-animation" />
                  <span>Streaming to Cloudflare R2...</span>
                </span>
                <span style={{ color: '#5B4DFC' }}>{uploadProgress}%</span>
              </div>

              <div style={{
                height: 8,
                borderRadius: 9999,
                backgroundColor: '#E2E8F0',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  backgroundColor: '#5B4DFC',
                  borderRadius: 9999,
                  transition: 'width 0.2s ease',
                }} />
              </div>

              {bytesUploaded.total > 0 && (
                <div style={{ fontSize: 11, color: '#64748B', textAlign: 'right' }}>
                  {formatFileSize(bytesUploaded.loaded)} / {formatFileSize(bytesUploaded.total)}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isUploading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '12px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                opacity: isUploading ? 0.7 : 1,
              }}
              disabled={isUploading}
            >
              <UploadCloud size={18} />
              <span>{isUploading ? 'Uploading...' : isEditing ? 'Save Changes' : 'Upload to Cloudflare R2'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

