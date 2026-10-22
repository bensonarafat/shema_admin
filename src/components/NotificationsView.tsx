import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  sendAdminNotificationJob,
  subscribeToNotificationHistory
} from '../services/notificationAdminService';
import type { AdminNotification } from '../types/notification';

interface UserOption {
  id: string;
  fullName?: string;
  email?: string;
  username?: string;
  fcmToken?: string;
}

export const NotificationsView: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'active_subscribers' | 'user'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [deepLink, setDeepLink] = useState('devotions');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Users for single-user picker
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  // History & Live State
  const [history, setHistory] = useState<AdminNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load history from Firestore
  useEffect(() => {
    setLoadingHistory(true);
    const unsubscribe = subscribeToNotificationHistory(
      (items) => {
        setHistory(items);
        setLoadingHistory(false);
      },
      (err) => {
        console.error('History subscription error:', err);
        setLoadingHistory(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load users list for targeted sending
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserOption[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data() as any;
        list.push({
          id: doc.id,
          fullName: d.fullName,
          email: d.email,
          username: d.username,
          fcmToken: d.fcmToken,
        });
      });
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

  // Handle Send
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both a title and message.' });
      return;
    }

    if (target === 'user' && !targetUserId) {
      setFeedback({ type: 'error', message: 'Please select a recipient user.' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      await sendAdminNotificationJob({
        title: title.trim(),
        body: body.trim(),
        target,
        targetUserId: target === 'user' ? targetUserId : undefined,
        targetUserEmail: target === 'user' ? selectedUser?.email : undefined,
        deepLink,
      });

      setFeedback({
        type: 'success',
        message: target === 'all'
          ? 'Broadcast notification queued successfully for all devices!'
          : 'Targeted push notification queued successfully!',
      });

      // Reset form fields
      setTitle('');
      setBody('');
      setSelectedUser(null);
      setTargetUserId('');
    } catch (err: any) {
      console.error('Send notification error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to dispatch notification. Please check permissions.',
      });
    } finally {
      setSending(false);
    }
  };

  const searchedUsers = users.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term))
    );
  }).slice(0, 5);

  const totalDelivered = history.reduce((acc, curr) => acc + (curr.deliveredCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Push Notification Hub</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#ECFDF5',
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              color: '#059669',
            }}>
              <ShieldCheck size={12} />
              <span>FCM & APNS PIPELINE READY</span>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Broadcast & Targeted Push
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Send daily morning scriptures, evening studies, and prayer alerts directly to Shema iOS users.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#F8F9FB', padding: '12px 20px', borderRadius: 14 }}>
            <Bell size={20} color="#5B4DFC" />
            <div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Campaigns Sent</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{history.length}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#F8F9FB', padding: '12px 20px', borderRadius: 14 }}>
            <Users size={20} color="#059669" />
            <div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total Deliveries</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{totalDelivered}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer Form Card */}
      <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Send size={18} color="#5B4DFC" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Compose Push Notification</h3>
          </div>
          <span style={{ fontSize: 12, color: '#64748B' }}>Instant Remote Dispatch</span>
        </div>

        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: feedback.type === 'success' ? '#065F46' : '#991B1B',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Target Audience Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Target Audience
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <button
                type="button"
                onClick={() => { setTarget('all'); setSelectedUser(null); setTargetUserId(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: target === 'all' ? '2px solid #5B4DFC' : '1px solid #E2E8F0',
                  backgroundColor: target === 'all' ? '#EEF2FF' : '#FFFFFF',
                  color: target === 'all' ? '#4338CA' : '#475569',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Users size={16} />
                <span>All Users (Broadcast)</span>
              </button>

              <button
                type="button"
                onClick={() => { setTarget('active_subscribers'); setSelectedUser(null); setTargetUserId(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: target === 'active_subscribers' ? '2px solid #5B4DFC' : '1px solid #E2E8F0',
                  backgroundColor: target === 'active_subscribers' ? '#EEF2FF' : '#FFFFFF',
                  color: target === 'active_subscribers' ? '#4338CA' : '#475569',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShieldCheck size={16} />
                <span>Active Subscribers Only</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget('user')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: target === 'user' ? '2px solid #5B4DFC' : '1px solid #E2E8F0',
                  backgroundColor: target === 'user' ? '#EEF2FF' : '#FFFFFF',
                  color: target === 'user' ? '#4338CA' : '#475569',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Smartphone size={16} />
                <span>Single User</span>
              </button>
            </div>
          </div>

          {/* User Search (If Single User selected) */}
          {target === 'user' && (
            <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Select Recipient User
              </label>
              {selectedUser ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{selectedUser.fullName || selectedUser.username || 'User'}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{selectedUser.email || selectedUser.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setTargetUserId(''); }}
                    style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                    <Search size={14} color="#94A3B8" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or username..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
                    />
                  </div>
                  {userSearch && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                      {searchedUsers.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#94A3B8', padding: '6px 8px' }}>No users found</div>
                      ) : (
                        searchedUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setTargetUserId(u.id); }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{u.fullName || u.email}</span>
                            <span style={{ color: '#94A3B8', fontSize: 11 }}>{u.fcmToken ? '✓ Device Token Available' : 'No token yet'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notification Title Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Notification Title</label>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{title.length}/60</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Time for Bible Readinh"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Notification Body Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Message Body</label>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{body.length}/160</span>
            </div>
            <textarea
              rows={4}
              placeholder="e.g. Start your day with Scripture! Complete today's reading to unlock your apps."
              value={body}
              maxLength={160}
              onChange={(e) => setBody(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Deep Link Action */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Tap Action / In-App Destination
            </label>
            <select
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                outline: 'none',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              <option value="devotions">Daily Devotion / Reading Screen</option>
              <option value="bible_study">Bible Study Topic Screen</option>
              <option value="prayers">Community Prayers Screen</option>
              <option value="home">Shema Home Dashboard</option>
            </select>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: sending || !title.trim() || !body.trim() ? '#A5B4FC' : '#5B4DFC',
              color: '#FFFFFF',
              padding: '13px 20px',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: sending || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease',
              marginTop: 4,
            }}
          >
            {sending ? (
              <>
                <RefreshCw size={16} className="spin-animation" />
                <span>Delivering via FCM...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send Notification Now</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Bottom Section: Delivery History Table */}
      <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} color="#5B4DFC" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Notification Dispatch History</h3>
          </div>
          <span style={{ fontSize: 12, color: '#64748B' }}>Live Real-Time Activity Log</span>
        </div>

        {loadingHistory ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            Loading notification records...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No push notifications sent yet. Compose your first campaign above!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: 12 }}>
                  <th style={{ padding: '10px 14px' }}>Date & Time</th>
                  <th style={{ padding: '10px 14px' }}>Title & Content</th>
                  <th style={{ padding: '10px 14px' }}>Audience</th>
                  <th style={{ padding: '10px 14px' }}>Destination</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Recipients</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  let dateStr = 'Just now';
                  if (item.createdAt?.toDate) {
                    dateStr = item.createdAt.toDate().toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: 300 }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{item.title}</div>
                        <div style={{ color: '#64748B', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.body}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: item.target === 'all' ? '#EEF2FF' : item.target === 'active_subscribers' ? '#FEF3C7' : '#F1F5F9',
                          color: item.target === 'all' ? '#4338CA' : item.target === 'active_subscribers' ? '#92400E' : '#475569',
                        }}>
                          {item.target === 'all' ? 'All Users' : item.target === 'active_subscribers' ? 'Subscribers' : item.targetUserEmail || 'Single User'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>
                        <span style={{ textTransform: 'capitalize' }}>
                          {item.deepLink === 'devotions' ? '📖 Devotions' : item.deepLink === 'bible_study' ? '📚 Bible Study' : item.deepLink === 'prayers' ? '🙏 Prayers' : '🏠 Home'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: item.status === 'sent' ? '#ECFDF5' : item.status === 'failed' ? '#FEF2F2' : '#EFF6FF',
                          color: item.status === 'sent' ? '#059669' : item.status === 'failed' ? '#DC2626' : '#2563EB',
                        }}>
                          {item.status === 'sent' && <CheckCircle2 size={12} />}
                          {item.status === 'failed' && <AlertCircle size={12} />}
                          {item.status === 'pending' && <Clock size={12} />}
                          <span style={{ textTransform: 'capitalize' }}>{item.status || 'Delivered'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                        {item.deliveredCount ?? (item.target === 'all' ? 'Broadcast' : 1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
