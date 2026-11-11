export interface DevotionVideo {
  url: string;
  thumbnailUrl?: string;
  duration: number; // Duration in seconds
  title: string; // Required
  speaker?: string;
  aspectRatio?: '9:16' | '16:9' | string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface DevotionItem {
  id: string; // YYYY-MM-DD
  date?: string;
  reference?: string;
  gems?: number;
  xp?: number;
  createdAt?: any;
  hasVideo?: boolean;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  videoDuration?: number;
  videoTitle?: string;
  videoSpeaker?: string;
  videoAspectRatio?: string;
  video?: DevotionVideo;
  bgImage?: string;
  bg?: string;
}

export interface DevotionDetail {
  theme?: string;
  reflection?: string;
  prayer?: string;
  actionStep?: string;
  verses?: any[];
  video?: DevotionVideo;
}

export interface DevotionVideoUploadPayload {
  date: string;
  file: File;
  title: string;
  speaker?: string;
  customThumbnail?: File | Blob;
}

