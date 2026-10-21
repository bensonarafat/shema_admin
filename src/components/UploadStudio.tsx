import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Music, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Check, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  Link as LinkIcon,
  Pencil,
  X
} from 'lucide-react';
import { slugify, detectAudioDuration, uploadFileToR2, uploadHymnMetadataJson } from '../services/uploadService';
import { saveHymnToFirestore } from '../services/hymnService';
import { getStoredR2Config } from '../config/r2';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { Hymn, UploadProgress } from '../types/hymn';

export const DEFAULT_HYMN_COVER_URL = 'https://pub-6d749a684fb748e19b7695baf6f32de1.r2.dev/default-hymn-bg.jpeg';

interface UploadStudioProps {
  hymns?: Hymn[];
  nextHymnNumber: number;
  onSuccess?: (hymn: Hymn) => void;
  onOpenR2Settings?: () => void;
}

export const UploadStudio: React.FC<UploadStudioProps> = ({ 
  hymns = [],
  nextHymnNumber,
  onSuccess, 
  onOpenR2Settings 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id?: string }>();

  // Determine if editing an existing hymn
  const searchParams = new URLSearchParams(location.search);
  const targetId = routeId || searchParams.get('id') || searchParams.get('edit') || (location.state as any)?.hymn?.id;
  const hymnToEdit: Hymn | undefined = (location.state as any)?.hymn || hymns.find((h) => h.id === targetId);
  const isEditing = Boolean(hymnToEdit);

  // Form State
  const [title, setTitle] = useState(hymnToEdit?.title || '');
  const [number, setNumber] = useState<number>(hymnToEdit?.number ?? (nextHymnNumber || 1));
  const [author, setAuthor] = useState(hymnToEdit?.author || '');
  const [category, setCategory] = useState(hymnToEdit?.category || 'Grace & Mercy');
  const [isHymn, setIsHymn] = useState<boolean>(hymnToEdit ? hymnToEdit.isHymn !== false : true);
  const [isDailyFeatured, setIsDailyFeatured] = useState<boolean>(Boolean(hymnToEdit?.isDailyFeatured));
  const [lyricsFullText, setLyricsFullText] = useState(hymnToEdit?.lyricsFullText || '');
  const [duration, setDuration] = useState<number>(hymnToEdit?.duration || 0);

  // Direct URLs (empty string represents null)
  const [customCoverUrl, setCustomCoverUrl] = useState(hymnToEdit?.coverImageUrl || '');
  const [customVocalUrl, setCustomVocalUrl] = useState(hymnToEdit?.vocalURL || '');
  const [customInstrumentalUrl, setCustomInstrumentalUrl] = useState(hymnToEdit?.instrumentalURL || '');
  const [customCongregationUrl, setCustomCongregationUrl] = useState(hymnToEdit?.congregationURL || '');
  const [showDirectUrlEditor, setShowDirectUrlEditor] = useState(false);

  // Local File Selections (for new uploads or replacements)
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [vocalFile, setVocalFile] = useState<File | null>(null);
  const [instrumentalFile, setInstrumentalFile] = useState<File | null>(null);
  const [congregationFile, setCongregationFile] = useState<File | null>(null);

  // Audio previews
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    cover: 0,
    vocal: 0,
    instrumental: 0,
    congregation: 0,
    metadata: 0,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When editing, folderSlug stays as existing hymn ID; when creating, derive from title
  const folderSlug = isEditing && hymnToEdit?.id 
    ? hymnToEdit.id 
    : slugify(title || 'untitled-hymn');

  // Sync if route changes or hymn loads
  useEffect(() => {
    if (hymnToEdit) {
      setTitle(hymnToEdit.title || '');
      setNumber(hymnToEdit.number ?? nextHymnNumber);
      setAuthor(hymnToEdit.author || '');
      setCategory(hymnToEdit.category || 'Grace & Mercy');
      setIsHymn(hymnToEdit.isHymn !== false);
      setIsDailyFeatured(Boolean(hymnToEdit.isDailyFeatured));
      setLyricsFullText(hymnToEdit.lyricsFullText || '');
      setDuration(hymnToEdit.duration || 0);
      setCustomCoverUrl(hymnToEdit.coverImageUrl || '');
      setCustomVocalUrl(hymnToEdit.vocalURL || '');
      setCustomInstrumentalUrl(hymnToEdit.instrumentalURL || '');
      setCustomCongregationUrl(hymnToEdit.congregationURL || '');
    }
  }, [hymnToEdit?.id]);

  // Handle Audio File Selection with auto-duration detection from any uploaded stem
  const handleAudioFileSelection = async (
    file: File | null,
    setFile: (f: File | null) => void
  ) => {
    setFile(file);
    if (file) {
      const detected = await detectAudioDuration(file);
      if (detected > 0 && (!duration || duration === 0)) {
        setDuration(detected);
      }
    }
  };

  const playPreview = (file: File | null, existingUrl: string | undefined, stemName: string) => {
    if (playingStem === stemName && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingStem(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    let urlToPlay: string | null = null;
    let isBlob = false;

    if (file) {
      urlToPlay = URL.createObjectURL(file);
      isBlob = true;
    } else if (existingUrl) {
      urlToPlay = existingUrl;
    }

    if (!urlToPlay) return;

    const audio = new Audio(urlToPlay);
    audioPlayerRef.current = audio;
    audio.play().catch((err) => console.warn('Audio preview playback error:', err));
    setPlayingStem(stemName);

    audio.onended = () => {
      setPlayingStem(null);
      if (isBlob && urlToPlay) {
        URL.revokeObjectURL(urlToPlay);
      }
    };
  };

  // Upload to Cloudflare R2 and Save to Firestore
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter a hymn title.');
      return;
    }

    // Validation: At least one audio must be provided (either by file or existing/custom URL)
    const hasVocal = Boolean(vocalFile || customVocalUrl.trim());
    const hasInstrumental = Boolean(instrumentalFile || customInstrumentalUrl.trim());
    const hasCongregation = Boolean(congregationFile || customCongregationUrl.trim());

    if (!hasVocal && !hasInstrumental && !hasCongregation) {
      setErrorMessage('At least one audio stem (Lead Vocal, Instrumental, or Choir) must be uploaded.');
      return;
    }

    const r2Config = getStoredR2Config();
    const hasNewUploads = Boolean(coverFile || vocalFile || instrumentalFile || congregationFile);

    if (hasNewUploads && (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey)) {
      setErrorMessage('Cloudflare R2 credentials are required to upload new files. Please configure your Account ID and Access Keys in Settings.');
      if (onOpenR2Settings) onOpenR2Settings();
      else navigate('/settings');
      return;
    }

    setIsUploading(true);
    setStatusMessage(`Syncing assets to Cloudflare R2: ${folderSlug}/...`);

    try {
      // 1. Cover URL: if coverFile uploaded, upload to R2; else if customCoverUrl, use it; else fallback to default cover
      let coverImageUrl: string = customCoverUrl.trim() || DEFAULT_HYMN_COVER_URL;
      if (coverFile) {
        setStatusMessage('Uploading cover background to Cloudflare R2...');
        const ext = coverFile.name.split('.').pop() || 'jpg';
        coverImageUrl = await uploadFileToR2({
          config: r2Config,
          folderSlug,
          filename: `cover.${ext}`,
          file: coverFile,
          contentType: coverFile.type || 'image/jpeg',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, cover: p })),
        });
      }

      // 2. Vocal URL: if vocalFile uploaded, upload to R2; else if custom URL, use it; else null
      let vocalURL: string | null = customVocalUrl.trim() || null;
      if (vocalFile) {
        setStatusMessage('Uploading Lead Vocal stem to Cloudflare R2...');
        vocalURL = await uploadFileToR2({
          config: r2Config,
          folderSlug,
          filename: 'vocal.mp3',
          file: vocalFile,
          contentType: vocalFile.type || 'audio/mpeg',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, vocal: p })),
        });
      }

      // 3. Instrumental URL: if instrumentalFile uploaded, upload to R2; else if custom URL, use it; else null
      let instrumentalURL: string | null = customInstrumentalUrl.trim() || null;
      if (instrumentalFile) {
        setStatusMessage('Uploading Instrumental backing stem to Cloudflare R2...');
        instrumentalURL = await uploadFileToR2({
          config: r2Config,
          folderSlug,
          filename: 'instrumental.mp3',
          file: instrumentalFile,
          contentType: instrumentalFile.type || 'audio/mpeg',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, instrumental: p })),
        });
      }

      // 4. Congregation URL: if congregationFile uploaded, upload to R2; else if custom URL, use it; else null
      let congregationURL: string | null = customCongregationUrl.trim() || null;
      if (congregationFile) {
        setStatusMessage('Uploading Choir / Congregation stem to Cloudflare R2...');
        congregationURL = await uploadFileToR2({
          config: r2Config,
          folderSlug,
          filename: 'congregation.mp3',
          file: congregationFile,
          contentType: congregationFile.type || 'audio/mpeg',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, congregation: p })),
        });
      }

      // 5. Construct Final Hymn Object
      const hymnRecord: Hymn = {
        id: folderSlug,
        number: Number(number) || 1,
        title: title.trim(),
        author: author.trim() || 'Traditional',
        category,
        duration: Number(duration) || 0,
        isHymn: Boolean(isHymn),
        isDailyFeatured,
        coverImageUrl,
        vocalURL,
        instrumentalURL,
        congregationURL,
        lyricsFullText: lyricsFullText.trim(),
        status: 'published',
        createdAt: hymnToEdit?.createdAt || new Date().toISOString(),
      };

      // 6. Upload metadata.json to R2 if credentials present
      if (r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey) {
        try {
          setStatusMessage('Saving metadata.json to Cloudflare R2 folder...');
          await uploadHymnMetadataJson(r2Config, folderSlug, hymnRecord);
          setUploadProgress((prev) => ({ ...prev, metadata: 100 }));
        } catch (r2Err: any) {
          console.warn('Metadata upload warning:', r2Err);
        }
      }

      // 7. Write directly to Firestore hymns collection
      setStatusMessage('Syncing live with Firebase Firestore...');
      await saveHymnToFirestore(hymnRecord);

      setStatusMessage(isEditing ? 'Hymn updated successfully!' : 'Published successfully!');
      if (onSuccess) onSuccess(hymnRecord);
      navigate('/library');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Upload failed. Check your Cloudflare R2 credentials or CORS configuration.');
    } finally {
      setIsUploading(false);
    }
  };

  const activeCoverPreview = coverFile 
    ? URL.createObjectURL(coverFile) 
    : (customCoverUrl.trim() || DEFAULT_HYMN_COVER_URL);

  return (
    <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title Header Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {isEditing && (
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="btn-secondary"
              style={{ padding: '8px 12px' }}
              title="Back to Hymn Library"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                {isEditing ? `Edit Track: ${hymnToEdit?.title}` : 'Hymn Upload Studio'}
              </h2>
              {isEditing ? (
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: '#EEEDFE',
                  color: '#5B4DFC',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  letterSpacing: 0.5,
                }}>
                  EDIT MODE (#{hymnToEdit?.number || number})
                </span>
              ) : (
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  letterSpacing: 0.5,
                }}>
                  NEW TRACK
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Directly uploads files into Cloudflare R2 folder: <code style={{ backgroundColor: '#F1F3F6', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#5B4DFC' }}>{folderSlug}/</code>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="button" 
            onClick={() => onOpenR2Settings ? onOpenR2Settings() : navigate('/settings')}
            className="btn-secondary"
          >
            Settings
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '14px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '14px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
          <Check size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid: Metadata & Files */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Left Column: Metadata & Details */}
        <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>1. Item Type & Metadata</h3>

          {/* Type Selector (Hymn vs Psalm) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 8 }}>
              Track Type
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsHymn(true)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: isHymn ? '#5B4DFC' : '#F1F3F6',
                  color: isHymn ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span>Hymn</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHymn(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: !isHymn ? '#5B4DFC' : '#F1F3F6',
                  color: !isHymn ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span>Psalm</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>
                {isHymn ? 'Hymn #' : 'Psalm #'}
              </label>
              <input 
                type="number" 
                value={number} 
                onChange={(e) => setNumber(Number(e.target.value))} 
                required 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Track Title</label>
              <input 
                type="text" 
                placeholder="e.g. All Creatures of Our God and King" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Author / Composer</label>
              <input 
                type="text" 
                placeholder="e.g. St. Francis of Assisi" 
                value={author} 
                onChange={(e) => setAuthor(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Grace & Mercy">Grace & Mercy</option>
                <option value="Praise & Adoration">Praise & Adoration</option>
                <option value="Faith & Trust">Faith & Trust</option>
                <option value="Salvation & Cross">Salvation & Cross</option>
                <option value="Morning & Evening">Morning & Evening</option>
                <option value="Peace & Comfort">Peace & Comfort</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Duration (seconds)</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="Auto-detected from audio track"
                value={duration || ''} 
                onChange={(e) => setDuration(Number(e.target.value))} 
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
              <input 
                type="checkbox" 
                id="dailyFeatured" 
                checked={isDailyFeatured} 
                onChange={(e) => setIsDailyFeatured(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#5B4DFC' }}
              />
              <label htmlFor="dailyFeatured" style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                Featured Hymn of the Day
              </label>
            </div>
          </div>

          {/* Folder Path Preview */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 16, borderRadius: 12, marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 }}>
              CLOUDFLARE R2 DESTINATION DIRECTORY
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5B4DFC' }}>
              {folderSlug}/
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Active stems will be uploaded directly under this directory.
            </div>
          </div>
        </div>

        {/* Right Column: 4 Asset Dropzones */}
        <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>2. Audio Stems & Background</h3>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                At least one audio stem required. Unselected stems will be saved as <code style={{ color: '#5B4DFC', fontWeight: 700 }}>null</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDirectUrlEditor(!showDirectUrlEditor)}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <LinkIcon size={12} />
              <span>{showDirectUrlEditor ? 'Hide Direct URLs' : 'Direct URLs'}</span>
            </button>
          </div>

          {/* Slot 1: Cover Artwork / Background */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={16} color="#64748B" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Background / Cover</span>
              </div>
              <span style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: (coverFile || customCoverUrl.trim()) ? '#059669' : '#64748B' 
              }}>
                {coverFile 
                  ? 'New file selected' 
                  : customCoverUrl.trim() 
                    ? 'Custom Cover' 
                    : 'Default Shema Cover'}
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: 6, backgroundColor: '#FFFFFF', borderRadius: 8 }}>
              <img 
                src={activeCoverPreview} 
                alt="Cover Preview" 
                style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {coverFile ? coverFile.name : (customCoverUrl.trim() ? customCoverUrl.split('/').pop() : 'default-hymn-bg.jpeg')}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  {!coverFile && !customCoverUrl.trim() ? 'Using default background image' : 'Custom image'}
                </div>
              </div>
              {customCoverUrl && (
                <button
                  type="button"
                  onClick={() => setCustomCoverUrl('')}
                  style={{ background: 'transparent', color: '#94A3B8', padding: 4 }}
                  title="Reset to default cover"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <input 
              type="file" 
              accept="image/*,video/mp4" 
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div className="progress-shimmer" style={{ width: `${uploadProgress.cover}%`, height: '100%', backgroundColor: '#5B4DFC', transition: 'width 0.2s ease', borderRadius: 9999 }} />
              </div>
            )}
            {showDirectUrlEditor && (
              <input
                type="text"
                placeholder="Or paste direct Cloudflare R2 cover URL"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                style={{ width: '100%', fontSize: 11, marginTop: 6 }}
              />
            )}
          </div>

          {/* Slot 2: Vocal Stem */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#4F46E5" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Lead Vocal Stem</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(vocalFile || customVocalUrl) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => playPreview(vocalFile, customVocalUrl, 'vocal')}
                      style={{ background: '#EEF2FF', color: '#4F46E5', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {playingStem === 'vocal' ? <Pause size={12} /> : <Play size={12} />}
                      <span>{playingStem === 'vocal' ? 'Pause' : 'Preview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVocalFile(null); setCustomVocalUrl(''); }}
                      style={{ background: 'transparent', color: '#94A3B8', padding: 4 }}
                      title="Clear stem (set to null)"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>None (null)</span>
                )}
              </div>
            </div>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => handleAudioFileSelection(e.target.files?.[0] || null, setVocalFile)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div className="progress-shimmer" style={{ width: `${uploadProgress.vocal}%`, height: '100%', backgroundColor: '#4F46E5', transition: 'width 0.2s ease', borderRadius: 9999 }} />
              </div>
            )}
            {showDirectUrlEditor && (
              <input
                type="text"
                placeholder="Or paste direct vocal.mp3 URL"
                value={customVocalUrl}
                onChange={(e) => setCustomVocalUrl(e.target.value)}
                style={{ width: '100%', fontSize: 11, marginTop: 6 }}
              />
            )}
          </div>

          {/* Slot 3: Instrumental Stem */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#16A34A" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Instrumental Backing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(instrumentalFile || customInstrumentalUrl) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => playPreview(instrumentalFile, customInstrumentalUrl, 'instrumental')}
                      style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {playingStem === 'instrumental' ? <Pause size={12} /> : <Play size={12} />}
                      <span>{playingStem === 'instrumental' ? 'Pause' : 'Preview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setInstrumentalFile(null); setCustomInstrumentalUrl(''); }}
                      style={{ background: 'transparent', color: '#94A3B8', padding: 4 }}
                      title="Clear stem (set to null)"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>None (null)</span>
                )}
              </div>
            </div>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => handleAudioFileSelection(e.target.files?.[0] || null, setInstrumentalFile)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div className="progress-shimmer" style={{ width: `${uploadProgress.instrumental}%`, height: '100%', backgroundColor: '#16A34A', transition: 'width 0.2s ease', borderRadius: 9999 }} />
              </div>
            )}
            {showDirectUrlEditor && (
              <input
                type="text"
                placeholder="Or paste direct instrumental.mp3 URL"
                value={customInstrumentalUrl}
                onChange={(e) => setCustomInstrumentalUrl(e.target.value)}
                style={{ width: '100%', fontSize: 11, marginTop: 6 }}
              />
            )}
          </div>

          {/* Slot 4: Congregation Choir Stem */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#9333EA" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Congregation / Choir</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(congregationFile || customCongregationUrl) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => playPreview(congregationFile, customCongregationUrl, 'congregation')}
                      style={{ background: '#FAF5FF', color: '#9333EA', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {playingStem === 'congregation' ? <Pause size={12} /> : <Play size={12} />}
                      <span>{playingStem === 'congregation' ? 'Pause' : 'Preview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCongregationFile(null); setCustomCongregationUrl(''); }}
                      style={{ background: 'transparent', color: '#94A3B8', padding: 4 }}
                      title="Clear stem (set to null)"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>None (null)</span>
                )}
              </div>
            </div>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => handleAudioFileSelection(e.target.files?.[0] || null, setCongregationFile)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div className="progress-shimmer" style={{ width: `${uploadProgress.congregation}%`, height: '100%', backgroundColor: '#9333EA', transition: 'width 0.2s ease', borderRadius: 9999 }} />
              </div>
            )}
            {showDirectUrlEditor && (
              <input
                type="text"
                placeholder="Or paste direct congregation.mp3 URL"
                value={customCongregationUrl}
                onChange={(e) => setCustomCongregationUrl(e.target.value)}
                style={{ width: '100%', fontSize: 11, marginTop: 6 }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Lyrics Full Text Editor */}
      <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              3. lyricsFullText
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Format with Verse 1, Chorus, Verse 2 separated by newlines.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const count = (lyricsFullText.match(/Verse/g) || []).length + 1;
                setLyricsFullText((prev) => (prev ? prev + '\n\n' : '') + `Verse ${count}\n`);
              }}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              + Add Verse
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLyricsFullText((prev) => (prev ? prev + '\n\n' : '') + 'Chorus\n')}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              + Add Chorus
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          value={lyricsFullText}
          onChange={(e) => setLyricsFullText(e.target.value)}
          placeholder={`Verse 1\nAll creatures of our God and King\nLift up your voice and with us sing,\nAlleluia! Alleluia!\n...\n\nChorus\nO praise Him! O praise Him!\nAlleluia! Alleluia! Alleluia!`}
          style={{ width: '100%', lineHeight: 1.6, fontSize: 14, fontFamily: 'monospace' }}
        />
      </div>

      {/* Action Submit Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, paddingBottom: 24 }}>
        {isEditing && (
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="btn-secondary"
            style={{ padding: '14px 24px', fontSize: 15 }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="btn-primary"
          style={{ padding: '14px 32px', fontSize: 15 }}
        >
          {isEditing ? <Pencil size={18} /> : <UploadCloud size={20} />}
          <span>
            {isUploading 
              ? 'Saving to Cloudflare & Firestore...' 
              : isEditing 
                ? 'Save Changes to Firestore & R2' 
                : 'Publish to Cloudflare & Firestore'}
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
};
