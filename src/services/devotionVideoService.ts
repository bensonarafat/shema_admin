import { Upload } from '@aws-sdk/lib-storage';
import { doc, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createR2Client, getStoredR2Config } from '../config/r2';
import type { DevotionVideo } from '../types/devotion';

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  aspectRatio: '9:16' | '16:9' | '1:1' | string;
  thumbnailBlob: Blob | null;
}

/**
 * Extracts duration, dimensions, and auto-generates a thumbnail snapshot from a video file.
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
      // Seek to 1 second (or 25% of video) to capture a thumbnail frame
      const seekTime = Math.min(1.0, duration > 0 ? duration * 0.25 : 0.5);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              const duration = Math.round(video.duration || 0);
              const width = video.videoWidth || 1080;
              const height = video.videoHeight || 1920;
              let aspectRatio: '9:16' | '16:9' | '1:1' | string = '16:9';
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
        console.warn('Could not generate canvas thumbnail:', err);
      }

      URL.revokeObjectURL(objectUrl);
      resolve({
        duration: Math.round(video.duration || 0),
        width: video.videoWidth || 1080,
        height: video.videoHeight || 1920,
        aspectRatio: (video.videoHeight || 0) > (video.videoWidth || 0) ? '9:16' : '16:9',
        thumbnailBlob: null,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        duration: 0,
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        thumbnailBlob: null,
      });
    };
  });
};

interface UploadDevotionVideoParams {
  date: string; // YYYY-MM-DD
  videoFile: File;
  thumbnailBlob?: Blob | null;
  title?: string;
  speaker?: string;
  aspectRatio?: string;
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void;
}

/**
 * Uploads video and optional thumbnail to Cloudflare R2 bucket, then updates Firestore.
 */
export const uploadDevotionVideoToCloudflare = async ({
  date,
  videoFile,
  thumbnailBlob,
  title,
  speaker,
  aspectRatio = '9:16',
  onProgress,
}: UploadDevotionVideoParams): Promise<DevotionVideo> => {
  const config = getStoredR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cloudflare R2 is not configured. Please enter your credentials in Settings.');
  }

  const client = createR2Client(config);
  const domain = config.publicDomain.replace(/\/+$/, '');
  const timestamp = Date.now();

  // 1. Upload Video File via Multipart chunked upload
  const fileExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
  const videoKey = `devotions/${date}/video_${timestamp}.${fileExt}`;

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

  // 2. Upload Thumbnail if available
  let thumbnailUrl: string | undefined = undefined;
  if (thumbnailBlob) {
    try {
      const thumbKey = `devotions/${date}/thumb_${timestamp}.jpg`;
      const thumbUpload = new Upload({
        client,
        params: {
          Bucket: config.bucketName.trim(),
          Key: thumbKey,
          Body: thumbnailBlob,
          ContentType: 'image/jpeg',
        },
      });
      await thumbUpload.done();
      thumbnailUrl = `${domain}/${thumbKey}`;
    } catch (thumbErr) {
      console.warn('Optional thumbnail upload failed, continuing with video only:', thumbErr);
    }
  }

  // 3. Extract final duration from file
  const metadata = await extractVideoMetadata(videoFile);
  const duration = metadata.duration;

  const devotionVideo: DevotionVideo = {
    url: videoUrl,
    thumbnailUrl,
    duration,
    title: title?.trim() || undefined,
    speaker: speaker?.trim() || undefined,
    aspectRatio: aspectRatio || metadata.aspectRatio,
    fileSize: videoFile.size,
    uploadedAt: new Date().toISOString(),
  };

  // 4. Save to Firestore (both root devotions/{date} and languages/en)
  await saveDevotionVideoToFirestore(date, devotionVideo);

  return devotionVideo;
};

/**
 * Persists the video payload to Firestore with merge: true to avoid overwriting existing devotion fields.
 * Sanitizes all fields to ensure no `undefined` values are passed to Firestore.
 */
export const saveDevotionVideoToFirestore = async (
  date: string,
  video: DevotionVideo
): Promise<void> => {
  const rootRef = doc(db, 'devotions', date);
  const localeEnRef = doc(db, 'devotions', date, 'languages', 'en');

  // Build clean video object with no undefined values (Firestore rejects undefined)
  const cleanVideo: Record<string, any> = {
    url: video.url,
    duration: video.duration || 0,
    aspectRatio: video.aspectRatio || '9:16',
    uploadedAt: video.uploadedAt || new Date().toISOString(),
  };

  if (video.thumbnailUrl) cleanVideo.thumbnailUrl = video.thumbnailUrl;
  if (video.title?.trim()) cleanVideo.title = video.title.trim();
  if (video.speaker?.trim()) cleanVideo.speaker = video.speaker.trim();
  if (video.fileSize) cleanVideo.fileSize = video.fileSize;

  // Root doc update payload (no undefined values)
  const rootPayload: Record<string, any> = {
    date,
    hasVideo: true,
    videoUrl: video.url,
    videoDuration: video.duration || 0,
    videoAspectRatio: video.aspectRatio || '9:16',
    video: cleanVideo,
    updatedAt: serverTimestamp(),
  };

  if (video.thumbnailUrl) rootPayload.videoThumbnailUrl = video.thumbnailUrl;
  if (video.title?.trim()) rootPayload.videoTitle = video.title.trim();
  if (video.speaker?.trim()) rootPayload.videoSpeaker = video.speaker.trim();

  // Root doc update
  await setDoc(rootRef, rootPayload, { merge: true });

  // Locale subcollection update
  await setDoc(
    localeEnRef,
    {
      video: cleanVideo,
    },
    { merge: true }
  );
};

/**
 * Removes the video from a devotion in Firestore.
 */
export const removeDevotionVideoFromFirestore = async (date: string): Promise<void> => {
  const rootRef = doc(db, 'devotions', date);
  const localeEnRef = doc(db, 'devotions', date, 'languages', 'en');

  await updateDoc(rootRef, {
    hasVideo: false,
    videoUrl: deleteField(),
    videoThumbnailUrl: deleteField(),
    videoDuration: deleteField(),
    videoTitle: deleteField(),
    videoSpeaker: deleteField(),
    videoAspectRatio: deleteField(),
    video: deleteField(),
    updatedAt: serverTimestamp(),
  });

  try {
    await updateDoc(localeEnRef, {
      video: deleteField(),
    });
  } catch (err) {
    console.warn('Could not remove video from languages/en (might not exist yet):', err);
  }
};
