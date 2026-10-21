import { Upload } from '@aws-sdk/lib-storage';
import { createR2Client } from '../config/r2';
import type { R2Config, Hymn } from '../types/hymn';

export const slugify = (text: string): string => {
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

export const detectAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.round(audio.duration * 10) / 10;
      URL.revokeObjectURL(objectUrl);
      resolve(duration || 0);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    });
  });
};

interface UploadFileOptions {
  config: R2Config;
  folderSlug: string;
  filename: string;
  file: File | Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
}

export const uploadFileToR2 = async ({
  config,
  folderSlug,
  filename,
  file,
  contentType,
  onProgress,
}: UploadFileOptions): Promise<string> => {
  const client = createR2Client(config);
  const key = `hymns/${folderSlug}/${filename}`;

  const parallelUpload = new Upload({
    client,
    params: {
      Bucket: config.bucketName.trim(),
      Key: key,
      Body: file,
      ContentType: contentType,
    },
  });

  parallelUpload.on('httpUploadProgress', (progress) => {
    if (progress.total && progress.loaded) {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      onProgress?.(percentage);
    }
  });

  await parallelUpload.done();

  // Return public URL
  const domain = config.publicDomain.replace(/\/+$/, '');
  return `${domain}/${key}`;
};

export const uploadHymnMetadataJson = async (
  config: R2Config,
  folderSlug: string,
  hymnData: Hymn
): Promise<string> => {
  const jsonBlob = new Blob([JSON.stringify(hymnData, null, 2)], {
    type: 'application/json',
  });

  return uploadFileToR2({
    config,
    folderSlug,
    filename: 'metadata.json',
    file: jsonBlob,
    contentType: 'application/json',
  });
};
