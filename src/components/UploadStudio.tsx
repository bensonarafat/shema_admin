import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Music, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Check, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';
import { slugify, detectAudioDuration, uploadFileToR2, uploadHymnMetadataJson } from '../services/uploadService';
import { saveHymnToFirestore } from '../services/hymnService';
import { getStoredR2Config } from '../config/r2';
import { useNavigate } from 'react-router-dom';
import type { Hymn, UploadProgress } from '../types/hymn';

interface UploadStudioProps {
  nextHymnNumber: number;
  onSuccess?: (hymn: Hymn) => void;
  onOpenR2Settings?: () => void;
}

export const UploadStudio: React.FC<UploadStudioProps> = ({ 
  nextHymnNumber,
  onSuccess, 
  onOpenR2Settings 
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState<number>(nextHymnNumber || 1);
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Grace & Mercy');
  const [isHymn, setIsHymn] = useState<boolean>(true);
  const [isDailyFeatured, setIsDailyFeatured] = useState(false);
  const [lyricsFullText, setLyricsFullText] = useState('');
  const [duration, setDuration] = useState<number>(0);

  // Files
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

  const folderSlug = slugify(title || 'untitled-hymn');

  // Handle Audio File Selection with auto-duration detection
  const handleVocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVocalFile(file);
      const detected = await detectAudioDuration(file);
      if (detected > 0) {
        setDuration(detected);
      }
    }
  };

  const playPreview = (file: File | null, stemName: string) => {
    if (!file) return;

    if (playingStem === stemName && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingStem(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    audio.play();
    setPlayingStem(stemName);

    audio.onended = () => {
      setPlayingStem(null);
      URL.revokeObjectURL(url);
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

    const r2Config = getStoredR2Config();
    if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
      setErrorMessage('Cloudflare R2 credentials are required. Please configure your Account ID and Access Keys.');
      if (onOpenR2Settings) onOpenR2Settings();
      else navigate('/settings');
      return;
    }

    setIsUploading(true);
    setStatusMessage(`Uploading assets to Cloudflare R2: hymns/${folderSlug}/...`);

    try {
      let coverImageUrl = `${r2Config.publicDomain.replace(/\/+$/, '')}/hymns/${folderSlug}/cover.jpg`;
      let vocalURL = `${r2Config.publicDomain.replace(/\/+$/, '')}/hymns/${folderSlug}/vocal.mp3`;
      let instrumentalURL = `${r2Config.publicDomain.replace(/\/+$/, '')}/hymns/${folderSlug}/instrumental.mp3`;
      let congregationURL = `${r2Config.publicDomain.replace(/\/+$/, '')}/hymns/${folderSlug}/congregation.mp3`;

      // 1. Upload Cover / Background
      if (coverFile) {
        setStatusMessage('Uploading cover background...');
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

      // 2. Upload Vocal
      if (vocalFile) {
        setStatusMessage('Uploading Lead Vocal stem...');
        vocalURL = await uploadFileToR2({
          config: r2Config,
          folderSlug,
          filename: 'vocal.mp3',
          file: vocalFile,
          contentType: vocalFile.type || 'audio/mpeg',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, vocal: p })),
        });
      }

      // 3. Upload Instrumental
      if (instrumentalFile) {
        setStatusMessage('Uploading Instrumental backing stem...');
        instrumentalURL = await uploadFileToR2({
          config: r2Config,
          folderSlug,
          filename: 'instrumental.mp3',
          file: instrumentalFile,
          contentType: instrumentalFile.type || 'audio/mpeg',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, instrumental: p })),
        });
      }

      // 4. Upload Congregation
      if (congregationFile) {
        setStatusMessage('Uploading Choir / Congregation stem...');
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
      };

      // 6. Upload metadata.json to R2
      setStatusMessage('Saving metadata.json to Cloudflare R2 folder...');
      await uploadHymnMetadataJson(r2Config, folderSlug, hymnRecord);
      setUploadProgress((prev) => ({ ...prev, metadata: 100 }));

      // 7. Write directly to Firestore hymns collection
      setStatusMessage('Syncing live with Firebase Firestore...');
      await saveHymnToFirestore(hymnRecord);

      setStatusMessage('Published successfully!');
      if (onSuccess) onSuccess(hymnRecord);
      navigate('/library');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Upload failed. Check your Cloudflare R2 credentials or CORS configuration.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title Header Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            Hymn Upload Studio
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Directly uploads files into Cloudflare R2 folder: <code style={{ backgroundColor: '#F1F3F6', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#5B4DFC' }}>hymns/{folderSlug}/</code>
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => onOpenR2Settings ? onOpenR2Settings() : navigate('/settings')}
          className="btn-secondary"
        >
          Settings
        </button>
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

          {/* Type Selector (sets isHymn boolean flag) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 8 }}>
              Track Type (sets isHymn boolean for iOS App)
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
                  gap: 8
                }}
              >
                <span>Hymn (isHymn: true)</span>
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
                  gap: 8
                }}
              >
                <span>Psalm (isHymn: false)</span>
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
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Hymn Title</label>
              <input 
                type="text" 
                placeholder="e.g. Amazing Grace" 
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
                placeholder="e.g. John Newton" 
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
                placeholder="Auto-detected from vocal track"
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
              hymns/{folderSlug}/
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Files: cover.jpg, vocal.mp3, instrumental.mp3, congregation.mp3, metadata.json
            </div>
          </div>
        </div>

        {/* Right Column: 4 Asset Dropzones */}
        <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>2. Audio Stems & Background</h3>

          {/* Slot 1: Cover Artwork / Background */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={16} color="#64748B" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Background / Cover</span>
              </div>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>cover.jpg / cover.mp4</span>
            </div>
            <input 
              type="file" 
              accept="image/*,video/mp4" 
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress.cover}%`, height: '100%', backgroundColor: '#5B4DFC', transition: 'width 0.2s ease' }} />
              </div>
            )}
          </div>

          {/* Slot 2: Vocal Stem */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#4F46E5" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Lead Vocal Stem</span>
              </div>
              {vocalFile && (
                <button
                  type="button"
                  onClick={() => playPreview(vocalFile, 'vocal')}
                  style={{ background: '#EEF2FF', color: '#4F46E5', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {playingStem === 'vocal' ? <Pause size={12} /> : <Play size={12} />}
                  <span>{playingStem === 'vocal' ? 'Pause' : 'Preview'}</span>
                </button>
              )}
            </div>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleVocalFileChange}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress.vocal}%`, height: '100%', backgroundColor: '#4F46E5', transition: 'width 0.2s ease' }} />
              </div>
            )}
          </div>

          {/* Slot 3: Instrumental Stem */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#16A34A" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Instrumental Backing</span>
              </div>
              {instrumentalFile && (
                <button
                  type="button"
                  onClick={() => playPreview(instrumentalFile, 'instrumental')}
                  style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {playingStem === 'instrumental' ? <Pause size={12} /> : <Play size={12} />}
                  <span>{playingStem === 'instrumental' ? 'Pause' : 'Preview'}</span>
                </button>
              )}
            </div>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => setInstrumentalFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress.instrumental}%`, height: '100%', backgroundColor: '#16A34A', transition: 'width 0.2s ease' }} />
              </div>
            )}
          </div>

          {/* Slot 4: Congregation Choir Stem */}
          <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={16} color="#9333EA" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Congregation / Choir</span>
              </div>
              {congregationFile && (
                <button
                  type="button"
                  onClick={() => playPreview(congregationFile, 'congregation')}
                  style={{ background: '#FAF5FF', color: '#9333EA', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {playingStem === 'congregation' ? <Pause size={12} /> : <Play size={12} />}
                  <span>{playingStem === 'congregation' ? 'Pause' : 'Preview'}</span>
                </button>
              )}
            </div>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => setCongregationFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {isUploading && (
              <div style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress.congregation}%`, height: '100%', backgroundColor: '#9333EA', transition: 'width 0.2s ease' }} />
              </div>
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
          placeholder={`Verse 1\nO Lord my God\nWhen I in awesome wonder\n...\n\nChorus\nThen sings my soul,\nMy Savior God, to Thee;\n...`}
          style={{ width: '100%', lineHeight: 1.6, fontSize: 14, fontFamily: 'monospace' }}
        />
      </div>

      {/* Action Submit Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, paddingBottom: 24 }}>
        <button
          type="submit"
          disabled={isUploading}
          className="btn-primary"
          style={{ padding: '14px 32px', fontSize: 15 }}
        >
          <UploadCloud size={20} />
          <span>{isUploading ? 'Uploading to Cloudflare R2...' : 'Publish to Cloudflare & Firestore'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
};
