export interface Hymn {
  id: string; // slug, e.g. "amazing-grace"
  number: number;
  title: string;
  author: string;
  category: string;
  duration: number; // in seconds
  isHymn: boolean; // true for Hymns, false for Psalms (CRITICAL for iOS app queries)
  isDailyFeatured: boolean;
  coverImageUrl: string;
  vocalURL: string;
  instrumentalURL: string;
  congregationURL: string;
  lyricsFullText: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'published' | 'draft';
}

export interface UploadProgress {
  cover: number;
  vocal: number;
  instrumental: number;
  congregation: number;
  metadata: number;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}
