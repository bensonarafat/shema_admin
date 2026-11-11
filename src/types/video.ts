export interface WorshipVideo {
  id: string; // Document ID / slug
  title: string;
  description?: string;
  artist?: string; // Worship leader / Artist / Speaker
  category: string; // e.g. "Worship & Praise", "Sermons", "Soaking & Instrumental"
  videoUrl: string; // Cloudflare R2 streaming URL
  thumbnailUrl?: string; // Cloudflare R2 thumbnail URL
  duration: number; // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | string;
  isFeatured: boolean; // Highlighted as hero worship video in mobile app
  tags?: string[];
  views?: number;
  likes?: number;
  status?: 'published' | 'draft';
  fileSize?: number;
  notifyUsers?: boolean;
  notificationDispatched?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface VideoCategoryOption {
  label: string;
  value: string;
}

export const DEFAULT_WORSHIP_CATEGORIES: VideoCategoryOption[] = [
  { label: 'Worship & Praise', value: 'Worship & Praise' },
  { label: 'Sermons & Exhortations', value: 'Sermons & Exhortations' },
  { label: 'Instrumental / Soaking', value: 'Instrumental / Soaking' },
  { label: 'Acoustic Sessions', value: 'Acoustic Sessions' },
  { label: 'Scripture Meditation', value: 'Scripture Meditation' },
  { label: 'Testimonies', value: 'Testimonies' },
  { label: 'General', value: 'General' },
];

