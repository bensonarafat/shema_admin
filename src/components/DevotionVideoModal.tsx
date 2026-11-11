import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Video, 
  Trash2, 
  Play, 
  Check, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  extractVideoMetadata, 
  uploadDevotionVideoToCloudflare, 
  removeDevotionVideoFromFirestore,
  type VideoMetadata 
} from '../services/devotionVideoService';
import type { DevotionItem, DevotionVideo } from '../types/devotion';

interface DevotionVideoModalProps {
  devotion: DevotionItem | null;
  initialDate?: string;
  onClose: () => void;
  onSuccess: (updatedDate: string) => void;
}

export const DevotionVideoModal: React.FC<DevotionVideoModalProps> = ({
  devotion,
  initialDate,
  onClose,
  onSuccess,
}) => {
  const [date, setDate] = useState<string>(
    devotion?.date || devotion?.id || initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [title, setTitle] = useState<string>(devotion?.videoTitle || devotion?.video?.title || '');
  const [speaker, setSpeaker] = useState<string>(devotion?.videoSpeaker || devotion?.video?.speaker || 'Benson Arafat');
  const [isReplacing, setIsReplacing] = useState<boolean>(!devotion?.hasVideo && !devotion?.videoUrl);
  
  // Upload State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingVideo: DevotionVideo | null = devotion?.video || (devotion?.videoUrl ? {
    url: devotion.videoUrl,
    thumbnailUrl: devotion.videoThumbnailUrl,
    duration: devotion.videoDuration || 0,
    title: devotion.videoTitle,
    speaker: devotion.videoSpeaker,
    aspectRatio: devotion.videoAspectRatio || '9:16',
  } : null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err) {
      console.warn('Could not extract video metadata:', err);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please drop a valid video file (.mp4, .mov, .webm)');
      return;
    }

    setError(null);
    setSelectedFile(file);

    try {
      const meta = await extractVideoMetadata(file);
      setMetadata(meta);
    } catch (err) {
      console.warn('Could not extract video metadata:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file to upload.');
      return;
    }
    if (!date) {
      setError('Please choose a date for this devotion.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      await uploadDevotionVideoToCloudflare({
        date,
        videoFile: selectedFile,
        thumbnailBlob: metadata?.thumbnailBlob,
        title: title || undefined,
        speaker: speaker || undefined,
        aspectRatio: metadata?.aspectRatio || '9:16',
        onProgress: (percent, loaded, total) => {
          setUploadProgress(percent);
          setBytesUploaded({ loaded, total });
        },
      });

      setSuccessMessage(`Video successfully uploaded to Cloudflare R2 for ${date}!`);
      setTimeout(() => {
        onSuccess(date);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Failed to upload video to Cloudflare. Check your R2 settings.');
      setIsUploading(false);
    }
  };

  const handleRemoveExistingVideo = async () => {
    if (!window.confirm(`Are you sure you want to remove the video from the devotion for ${date}?`)) {
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await removeDevotionVideoFromFirestore(date);
      setSuccessMessage('Video successfully removed.');
      setTimeout(() => {
        onSuccess(date);
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Error removing video:', err);
      setError(err?.message || 'Could not remove video from Firestore.');
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
        maxWidth: 640,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                backgroundColor: '#EEEDFE',
                color: '#5B4DFC',
                padding: '4px 8px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Video size={13} />
                <span>CLOUDFLARE R2 VIDEO</span>
              </div>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                Daily Devotion
              </span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
              {existingVideo && !isReplacing ? 'Devotion Video Attached' : 'Attach Video to Devotion'}
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

        {/* Date Selector Row */}
        <div style={{
          backgroundColor: '#F8F9FB',
          padding: 16,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 2 }}>
              DEVOTION DATE
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              {devotion?.reference ? `${date} • ${devotion.reference}` : date}
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isUploading || Boolean(devotion?.id)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
            }}
          />
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

        {/* SECTION 1: Existing Video View */}
        {existingVideo && !isReplacing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Native Video Player Preview */}
            <div style={{
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: '#0B1118',
              maxHeight: 340,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <video
                src={existingVideo.url}
                poster={existingVideo.thumbnailUrl}
                controls
                style={{
                  maxHeight: 340,
                  maxWidth: '100%',
                  borderRadius: 16,
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Video Metadata Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
            }}>
              <div style={{ backgroundColor: '#F8F9FB', padding: 12, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>DURATION</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {formatDuration(existingVideo.duration)}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8F9FB', padding: 12, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>FORMAT</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {existingVideo.aspectRatio === '9:16' ? 'Vertical 9:16 (Reel)' : 'Horizontal 16:9'}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8F9FB', padding: 12, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>SPEAKER</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {existingVideo.speaker || 'Benson Arafat'}
                </div>
              </div>
            </div>

            {/* Video URL Link */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F1F5F9',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 12,
            }}>
              <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                {existingVideo.url}
              </span>
              <a
                href={existingVideo.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#5B4DFC', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
              >
                <span>Open</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={handleRemoveExistingVideo}
                className="btn-secondary"
                style={{
                  color: '#DC2626',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                }}
                disabled={isUploading}
              >
                <Trash2 size={15} />
                <span>Remove Video</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReplacing(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}
                disabled={isUploading}
              >
                <RefreshCw size={15} />
                <span>Replace Video</span>
              </button>
            </div>
          </div>
        ) : (
          /* SECTION 2: Video Upload / Dropzone Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* File Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: 16,
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: selectedFile ? '#F8F9FF' : '#F8FAFC',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isUploading}
              />

              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: selectedFile ? '#EEEDFE' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selectedFile ? '#5B4DFC' : '#64748B',
              }}>
                <UploadCloud size={26} />
              </div>

              {selectedFile ? (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                    {formatFileSize(selectedFile.size)} • Click or drop to change video
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    Drag and drop your devotion video here
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                    Supports MP4, MOV, WebM (Recommended: 9:16 vertical reel, 90–150 seconds)
                  </div>
                </div>
              )}
            </div>

            {/* Local Video & Extracted Thumbnail Preview */}
            {selectedFile && metadata && (
              <div style={{
                backgroundColor: '#F8F9FB',
                padding: 16,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {metadata.thumbnailBlob ? (
                    <img
                      src={URL.createObjectURL(metadata.thumbnailBlob)}
                      alt="Thumbnail preview"
                      style={{
                        width: 56,
                        height: 76,
                        objectFit: 'cover',
                        borderRadius: 8,
                        backgroundColor: '#000',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 56,
                      height: 76,
                      borderRadius: 8,
                      backgroundColor: '#EEEDFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#5B4DFC'
                    }}>
                      <Play size={20} />
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      Auto-detected Specs
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Duration: <strong>{formatDuration(metadata.duration)}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Format: <strong>{metadata.aspectRatio === '9:16' ? '9:16 Vertical Reel' : '16:9 Widescreen'}</strong> ({metadata.width}×{metadata.height})
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  padding: '6px 12px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Check size={13} />
                  <span>Thumbnail Ready</span>
                </div>
              </div>
            )}

            {/* Video Metadata Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  VIDEO TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finding Peace in the Storm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  SPEAKER / PRESENTER
                </label>
                <input
                  type="text"
                  placeholder="e.g. Benson Arafat"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  disabled={isUploading}
                  style={{ width: '100%' }}
                />
              </div>
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
                    <span>Uploading to Cloudflare R2...</span>
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

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
              {existingVideo && (
                <button
                  type="button"
                  onClick={() => setIsReplacing(false)}
                  className="btn-secondary"
                  disabled={isUploading}
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleUpload}
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
                disabled={isUploading || !selectedFile}
              >
                <UploadCloud size={18} />
                <span>{isUploading ? 'Uploading to Cloudflare...' : 'Upload to Cloudflare R2'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Creator Cadence Helper Card */}
        <div style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          border: '1px solid #EDF2F7',
          marginTop: 4,
        }}>
          <Info size={16} color="#64748B" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
            <strong>Flexible Schedule:</strong> You don't need to post videos everyday. Aim for <strong>2 or 3 videos per week</strong> (e.g. Tuesday & Thursday). On days without video, the Shema mobile app automatically displays the standard devotion reader cleanly without any broken or empty placeholders.
          </div>
        </div>
      </div>
    </div>
  );
};
