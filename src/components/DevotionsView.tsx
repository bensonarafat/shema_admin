import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BookOpen, Sparkles, Award, Eye, Calendar, X } from 'lucide-react';

interface DevotionItem {
  id: string; // YYYY-MM-DD
  date?: string;
  reference?: string;
  gems?: number;
  xp?: number;
  createdAt?: any;
}

interface DevotionDetail {
  theme?: string;
  reflection?: string;
  prayer?: string;
  actionStep?: string;
  verses?: any[];
}

export const DevotionsView: React.FC = () => {
  const [devotions, setDevotions] = useState<DevotionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevotion, setSelectedDevotion] = useState<DevotionItem | null>(null);
  const [detail, setDetail] = useState<DevotionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'devotions'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveDevotions: DevotionItem[] = [];
        snapshot.forEach((doc) => {
          liveDevotions.push({ id: doc.id, ...(doc.data() as any) });
        });
        // Sort descending by date
        liveDevotions.sort((a, b) => b.id.localeCompare(a.id));
        setDevotions(liveDevotions);
        setLoading(false);
      },
      (error) => {
        console.warn('Error fetching devotions from Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const openDevotionDetail = async (item: DevotionItem) => {
    setSelectedDevotion(item);
    setLoadingDetail(true);
    try {
      // Fetch English locale subcollection
      const langDoc = await getDoc(doc(db, 'devotions', item.id, 'languages', 'en'));
      if (langDoc.exists()) {
        setDetail(langDoc.data() as DevotionDetail);
      } else {
        setDetail(null);
      }
    } catch (err) {
      console.error('Error fetching devotion detail:', err);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Daily Devotions</span>
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
              <BookOpen size={12} />
              <span>AI DEVOTIONS</span>
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {loading ? '...' : devotions.length} <span style={{ fontSize: 20, fontWeight: 500, color: '#64748B' }}>devotions</span>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            Generated daily via Gemini AI scheduler
          </div>
        </div>
      </div>

      {/* Devotions Table Card */}
      <div className="flat-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>
          Devotion Archives ({devotions.length})
        </h3>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            Loading devotions live from Firebase Firestore...
          </div>
        ) : devotions.length === 0 ? (
          <div style={{ 
            padding: '48px 24px', 
            textAlign: 'center', 
            backgroundColor: '#F8F9FB', 
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#EEEDFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5B4DFC'
            }}>
              <Calendar size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
              No devotions found in Firebase
            </div>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400 }}>
              Devotions run on a daily cron schedule via Firebase Cloud Functions.
            </p>
          </div>
        ) : (
          <table className="flat-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>SCRIPTURE REFERENCE</th>
                <th>REWARDS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {devotions.map((dev) => (
                <tr key={dev.id}>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} color="#5B4DFC" />
                      <span>{dev.date || dev.id}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      backgroundColor: '#F1F3F6', 
                      padding: '4px 12px', 
                      borderRadius: 9999, 
                      fontSize: 13, 
                      fontWeight: 700,
                      color: '#0F172A' 
                    }}>
                      {dev.reference || 'Daily Scripture'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: 9999 }}>
                        <Sparkles size={12} />
                        <span>+{dev.gems || 10} Gems</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 9999 }}>
                        <Award size={12} />
                        <span>+{dev.xp || 25} XP</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill success">
                      <span className="dot"></span>
                      <span>Published</span>
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openDevotionDetail(dev)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Devotion Detail Modal */}
      {selectedDevotion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 32,
            width: '90%',
            maxWidth: 620,
            maxHeight: '85vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Devotion for {selectedDevotion.date || selectedDevotion.id}
                </h3>
                <span style={{ fontSize: 13, color: '#5B4DFC', fontWeight: 700 }}>
                  {selectedDevotion.reference}
                </span>
              </div>
              <button 
                onClick={() => setSelectedDevotion(null)} 
                className="btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                <X size={16} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748B' }}>
                Fetching reflection and prayer content...
              </div>
            ) : detail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {detail.theme && (
                  <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>THEME</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{detail.theme}</div>
                  </div>
                )}

                {detail.reflection && (
                  <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>REFLECTION</div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: '#334155' }}>{detail.reflection}</p>
                  </div>
                )}

                {detail.prayer && (
                  <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>PRAYER</div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', fontStyle: 'italic' }}>"{detail.prayer}"</p>
                  </div>
                )}

                {detail.actionStep && (
                  <div style={{ backgroundColor: '#EEEDFE', padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#5B4DFC', marginBottom: 4 }}>ACTION STEP</div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: '#1E1B4B', fontWeight: 600 }}>{detail.actionStep}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                No localized translation content found for this date.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
