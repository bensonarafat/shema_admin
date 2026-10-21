import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Heart, MessageSquare, Search, User } from 'lucide-react';

interface PrayerRecord {
  id: string;
  userId?: string;
  displayName?: string;
  title?: string;
  body?: string;
  type?: string;
  prayCount?: number;
  replyCount?: number;
  submittedAt?: any;
}

export const PrayersView: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'prayers'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const livePrayers: PrayerRecord[] = [];
        snapshot.forEach((doc) => {
          livePrayers.push({ id: doc.id, ...(doc.data() as any) });
        });
        setPrayers(livePrayers);
        setLoading(false);
      },
      (error) => {
        console.warn('Error fetching prayers from Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredPrayers = prayers.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(term)) ||
      (p.body && p.body.toLowerCase().includes(term)) ||
      (p.displayName && p.displayName.toLowerCase().includes(term))
    );
  });

  const totalPrayersCount = prayers.reduce((acc, p) => acc + (p.prayCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Community Prayers</span>
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
              <Heart size={12} />
              <span>LIVE PRAYERS</span>
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {loading ? '...' : prayers.length} <span style={{ fontSize: 20, fontWeight: 500, color: '#64748B' }}>requests</span>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            {totalPrayersCount} community prayers lifted
          </div>
        </div>
      </div>

      {/* Prayers Table Card */}
      <div className="flat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
            Prayer Wall ({filteredPrayers.length})
          </h3>

          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 14 }} />
            <input 
              type="text" 
              placeholder="Search by title, body, or author..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 40 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            Loading prayers live from Firebase Firestore...
          </div>
        ) : filteredPrayers.length === 0 ? (
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
              <Heart size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
              No prayer requests found
            </div>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400 }}>
              {search ? 'Try adjusting your search keywords.' : 'Prayers posted in the Shema app will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredPrayers.map((prayer) => {
              let submittedDate = 'Recent';
              if (prayer.submittedAt) {
                if (typeof prayer.submittedAt === 'string') {
                  submittedDate = new Date(prayer.submittedAt).toLocaleDateString();
                } else if (prayer.submittedAt.toDate) {
                  submittedDate = prayer.submittedAt.toDate().toLocaleDateString();
                }
              }

              return (
                <div 
                  key={prayer.id}
                  style={{
                    backgroundColor: '#F8F9FB',
                    padding: '20px 24px',
                    borderRadius: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#EEEDFE',
                        color: '#5B4DFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={16} />
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                          {prayer.displayName || 'Anonymous'}
                        </span>
                        <span style={{ color: '#94A3B8', fontSize: 12, marginLeft: 8 }}>
                          {submittedDate}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#E11D48', backgroundColor: '#FFE4E6', padding: '4px 10px', borderRadius: 9999 }}>
                        <Heart size={13} fill="#E11D48" />
                        <span>{prayer.prayCount || 0} prayers</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#64748B', backgroundColor: '#F1F3F6', padding: '4px 10px', borderRadius: 9999 }}>
                        <MessageSquare size={13} />
                        <span>{prayer.replyCount || 0} replies</span>
                      </span>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                    {prayer.title || 'Prayer Request'}
                  </h4>
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                    {prayer.body || 'No description provided.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
