import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Search, Users, UserCheck, ShieldCheck, Mail } from 'lucide-react';

interface UserRecord {
  id: string;
  fullName?: string;
  username?: string;
  email?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  createdAt?: any;
  lastLogin?: any;
}

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveUsers: UserRecord[] = [];
        snapshot.forEach((doc) => {
          liveUsers.push({ id: doc.id, ...(doc.data() as any) });
        });
        setUsers(liveUsers);
        setLoading(false);
      },
      (error) => {
        console.warn('Error fetching users from Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term))
    );
  });

  const activeSubscribers = users.filter((u) => u.subscriptionStatus === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Card */}
      <div className="flat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total App Users</span>
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
              <span>LIVE USERS</span>
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {loading ? '...' : users.length} <span style={{ fontSize: 20, fontWeight: 500, color: '#64748B' }}>registered</span>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            {activeSubscribers} active subscribers
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#F8F9FB', padding: '12px 20px', borderRadius: 14 }}>
            <UserCheck size={20} color="#5B4DFC" />
            <div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Active Subscriptions</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{activeSubscribers}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="flat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
            User Directory ({filteredUsers.length})
          </h3>

          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 14 }} />
            <input 
              type="text" 
              placeholder="Search by name, email, or username..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 40 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            Loading users live from Firebase Firestore...
          </div>
        ) : filteredUsers.length === 0 ? (
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
              <Users size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
              No users found in Firebase
            </div>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400 }}>
              {search ? 'Try clearing your search query.' : 'Users will appear here automatically when they sign up on the iOS app.'}
            </p>
          </div>
        ) : (
          <table className="flat-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>USERNAME</th>
                <th>EMAIL</th>
                <th>SUBSCRIPTION</th>
                <th>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const initials = (user.fullName || user.email || 'U')
                  .substring(0, 2)
                  .toUpperCase();

                let joinedDate = 'Recent';
                if (user.createdAt) {
                  if (typeof user.createdAt === 'string') {
                    joinedDate = new Date(user.createdAt).toLocaleDateString();
                  } else if (user.createdAt.toDate) {
                    joinedDate = user.createdAt.toDate().toLocaleDateString();
                  }
                }

                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          backgroundColor: '#EEEDFE',
                          color: '#5B4DFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{user.fullName || 'Anonymous'}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#475569' }}>
                      @{user.username || 'user'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B' }}>
                        <Mail size={13} color="#94A3B8" />
                        <span>{user.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${user.subscriptionStatus === 'active' ? 'success' : 'warning'}`}>
                        <span className="dot"></span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {user.subscriptionStatus || 'Free'} {user.subscriptionPlan ? `(${user.subscriptionPlan})` : ''}
                        </span>
                      </span>
                    </td>
                    <td style={{ color: '#64748B', fontSize: 13 }}>
                      {joinedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
