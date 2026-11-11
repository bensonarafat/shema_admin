import { Upload } from '@aws-sdk/lib-storage';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createR2Client, getStoredR2Config } from '../config/r2';
import type { WorshipVideo } from '../types/video';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | string;
  thumbnailBlob: Blob | null;
}

export const slugifyVideo = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Extracts duration, resolution, aspect ratio and captures a frame snapshot from a video file.
 */
export const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration || 0);
      const seekTime = Math.min(1.0, duration > 0 ? duration * 0.25 : 0.5);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              const duration = Math.round(video.duration || 0);
              const width = video.videoWidth || 1280;
              const height = video.videoHeight || 720;
              let aspectRatio: '16:9' | '9:16' | '1:1' | string = '16:9';
              if (height > width * 1.2) {
                aspectRatio = '9:16';
              } else if (Math.abs(width - height) < 50) {
                aspectRatio = '1:1';
              }

              resolve({
                duration,
                width,
                height,
                aspectRatio,
                thumbnailBlob: blob,
              });
            },
            'image/jpeg',
            0.85
          );
          return;
        }
      } catch (err) {
        console.warn('Canvas thumbnail capture failed:', err);
      }

      URL.revokeObjectURL(objectUrl);
      resolve({
        duration: Math.round(video.duration || 0),
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        aspectRatio: (video.videoHeight || 0) > (video.videoWidth || 0) ? '9:16' : '16:9',
        thumbnailBlob: null,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        duration: 0,
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        thumbnailBlob: null,
      });
    };
  });
};

interface UploadWorshipVideoParams {
  id?: string;
  title: string;
  videoFile: File;
  customThumbnailFile?: File | null;
  autoThumbnailBlob?: Blob | null;
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void;
}

/**
 * Uploads a worship video and thumbnail to Cloudflare R2 bucket.
 */
export const uploadWorshipVideoToCloudflare = async ({
  id,
  title,
  videoFile,
  customThumbnailFile,
  autoThumbnailBlob,
  onProgress,
}: UploadWorshipVideoParams): Promise<{ videoUrl: string; thumbnailUrl?: string; duration: number; aspectRatio: string }> => {
  const config = getStoredR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cloudflare R2 is not configured. Please enter your credentials in Settings.');
  }

  const client = createR2Client(config);
  const domain = config.publicDomain.replace(/\/+$/, '');
  const slug = id || `${slugifyVideo(title)}-${Date.now().toString(36)}`;
  const timestamp = Date.now();

  // 1. Upload Video File
  const fileExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
  const videoKey = `worship-videos/${slug}/video_${timestamp}.${fileExt}`;

  const videoUpload = new Upload({
    client,
    params: {
      Bucket: config.bucketName.trim(),
      Key: videoKey,
      Body: videoFile,
      ContentType: videoFile.type || 'video/mp4',
    },
  });

  videoUpload.on('httpUploadProgress', (progress) => {
    if (progress.total && progress.loaded) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      onProgress?.(percent, progress.loaded, progress.total);
    }
  });

  await videoUpload.done();
  const videoUrl = `${domain}/${videoKey}`;

  // 2. Upload Thumbnail (Custom or Auto-generated)
  let thumbnailUrl: string | undefined = undefined;
  const thumbPayload = customThumbnailFile || autoThumbnailBlob;

  if (thumbPayload) {
    try {
      const isCustom = Boolean(customThumbnailFile);
      const thumbExt = isCustom ? (customThumbnailFile!.name.split('.').pop()?.toLowerCase() || 'jpg') : 'jpg';
      const thumbKey = `worship-videos/${slug}/thumb_${timestamp}.${thumbExt}`;

      const thumbUpload = new Upload({
        client,
        params: {
          Bucket: config.bucketName.trim(),
          Key: thumbKey,
          Body: thumbPayload,
          ContentType: isCustom ? customThumbnailFile!.type : 'image/jpeg',
        },
      });

      await thumbUpload.done();
      thumbnailUrl = `${domain}/${thumbKey}`;
    } catch (err) {
      console.warn('Thumbnail upload to R2 failed, continuing with video only:', err);
    }
  }

  // 3. Extract metadata
  const metadata = await extractVideoMetadata(videoFile);

  return {
    videoUrl,
    thumbnailUrl,
    duration: metadata.duration,
    aspectRatio: metadata.aspectRatio,
  };
};

/**
 * Saves a worship video record to Firestore (with no undefined values).
 */
export const saveWorshipVideoToFirestore = async (video: WorshipVideo): Promise<void> => {
  const docRef = doc(db, 'videos', video.id);

  const payload: Record<string, any> = {
    id: video.id,
    title: video.title.trim(),
    category: video.category || 'Worship & Praise',
    videoUrl: video.videoUrl,
    duration: video.duration || 0,
    aspectRatio: video.aspectRatio || '16:9',
    isFeatured: Boolean(video.isFeatured),
    status: video.status || 'published',
    views: video.views || 0,
    likes: video.likes || 0,
    updatedAt: serverTimestamp(),
  };

  if (video.description?.trim()) payload.description = video.description.trim();
  if (video.artist?.trim()) payload.artist = video.artist.trim();
  if (video.thumbnailUrl) payload.thumbnailUrl = video.thumbnailUrl;
  if (video.fileSize) payload.fileSize = video.fileSize;
  if (video.tags && video.tags.length > 0) payload.tags = video.tags;
  if (video.notifyUsers !== undefined) payload.notifyUsers = video.notifyUsers;
  if (video.notificationDispatched !== undefined) payload.notificationDispatched = video.notificationDispatched;
  if (!video.createdAt) payload.createdAt = serverTimestamp();

  await setDoc(docRef, payload, { merge: true });
};

/**
 * Updates specific fields on an existing worship video in Firestore.
 */
export const updateWorshipVideoInFirestore = async (
  id: string,
  updates: Partial<WorshipVideo>
): Promise<void> => {
  const docRef = doc(db, 'videos', id);
  const cleanPayload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      cleanPayload[key] = val;
    }
  }

  await updateDoc(docRef, cleanPayload);
};

/**
 * Deletes a worship video record from Firestore.
 */
export const deleteWorshipVideoFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'videos', id));
};

/**
 * Subscribes to real-time updates for all worship videos from Firestore.
 */
export const subscribeToWorshipVideos = (
  onSuccess: (videos: WorshipVideo[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const videos: WorshipVideo[] = [];
      snapshot.forEach((docSnap) => {
        videos.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onSuccess(videos);
    },
    (err) => {
      console.warn('Real-time videos subscription error:', err);
      // Fallback: try querying without orderBy in case index is creating
      const fallbackQuery = query(collection(db, 'videos'));
      onSnapshot(fallbackQuery, (snapshot) => {
        const videos: WorshipVideo[] = [];
        snapshot.forEach((docSnap) => {
          videos.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        onSuccess(videos);
      }, onError);
    }
  );
};

