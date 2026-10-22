export interface AdminNotification {
  id?: string;
  title: string;
  body: string;
  target: 'all' | 'active_subscribers' | 'user';
  targetUserId?: string;
  targetUserEmail?: string;
  deepLink?: string; // 'devotions' | 'bible_study' | 'prayers' | 'home'
  status?: 'pending' | 'sent' | 'failed';
  createdAt?: any;
  sentAt?: any;
  deliveredCount?: number;
  failedCount?: number;
  deliveryMessage?: string;
  senderEmail?: string;
}
