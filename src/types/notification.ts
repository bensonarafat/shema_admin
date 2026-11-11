export interface AdminNotification {
  id?: string;
  title: string;
  body: string;
  target: 'all' | 'active_subscribers' | 'user';
  targetUserId?: string;
  targetUserEmail?: string;
  deepLink?: string; // 'shorts' | 'hymns' | 'psalms' | 'devotion_video' | 'devotions' | 'bible_study' | 'prayers' | 'home'
  customData?: Record<string, string>;
  status?: 'pending' | 'sent' | 'failed';
  createdAt?: any;
  sentAt?: any;
  deliveredCount?: number;
  failedCount?: number;
  deliveryMessage?: string;
  senderEmail?: string;
}
