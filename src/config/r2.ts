import { S3Client } from '@aws-sdk/client-s3';
import type { R2Config } from '../types/hymn';

const R2_CONFIG_KEY = 'shema_r2_config';

export const getStoredR2Config = (): R2Config => {
  const saved = localStorage.getItem(R2_CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }

  return {
    accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
    bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'shema-hymns',
    publicDomain: import.meta.env.VITE_R2_PUBLIC_DOMAIN || 'https://pub-your-id.r2.dev',
  };
};

export const saveR2Config = (config: R2Config): void => {
  localStorage.setItem(R2_CONFIG_KEY, JSON.stringify(config));
};

export const createR2Client = (config: R2Config): S3Client => {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim(),
    },
  });
};
