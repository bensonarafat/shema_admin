import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../config/firebase';
import type { AdminNotification } from '../types/notification';

/**
 * Dispatch notification: Creates a Firestore job in `admin_notifications`
 * and falls back to / invokes callable function for instant dispatch.
 */
export async function sendAdminNotificationJob(notification: AdminNotification): Promise<string> {
  const currentUser = auth.currentUser;
  
  // 1. Try Callable Cloud Function first if available
  try {
    const sendNotificationCallable = httpsCallable(functions, 'sendAdminNotification');
    const result = await sendNotificationCallable({
      title: notification.title,
      body: notification.body,
      target: notification.target,
      targetUserId: notification.targetUserId,
      deepLink: notification.deepLink || 'home',
    });
    
    const data = result.data as any;
    if (data?.notificationId) {
      return data.notificationId;
    }
  } catch (callableErr) {
    console.warn('Callable sendAdminNotification was bypassed or failed, falling back to Firestore trigger:', callableErr);
  }

  // 2. Write to Firestore `admin_notifications` collection (triggers onAdminNotificationCreated)
  const docRef = await addDoc(collection(db, 'admin_notifications'), {
    title: notification.title,
    body: notification.body,
    target: notification.target,
    targetUserId: notification.targetUserId || null,
    targetUserEmail: notification.targetUserEmail || null,
    deepLink: notification.deepLink || 'home',
    status: 'pending',
    senderEmail: currentUser?.email || 'admin@shema.app',
    senderId: currentUser?.uid || 'admin',
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Subscribe to the history of sent notifications in real time.
 */
export function subscribeToNotificationHistory(
  onData: (notifications: AdminNotification[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, 'admin_notifications'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AdminNotification[] = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...(doc.data() as any),
        });
      });
      onData(items);
    },
    (err) => {
      console.warn('Failed to subscribe to admin notifications history:', err);
      if (onError) onError(err);
    }
  );
}
