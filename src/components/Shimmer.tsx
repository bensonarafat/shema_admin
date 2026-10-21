import React from 'react';

export interface ShimmerProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`shimmer-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

// Shimmer for stat count in page banners (e.g. "34 hymns", "12 users")
export const StatCardShimmer: React.FC<{ width?: number }> = ({ width = 120 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <Shimmer width={width} height={36} borderRadius={10} />
      <Shimmer width={width * 1.5} height={14} borderRadius={6} />
    </div>
  );
};

// Hymn Table Skeleton
export const HymnTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <table className="flat-table">
      <thead>
        <tr>
          <th style={{ width: 50 }}>#</th>
          <th>TITLE & ARTIST</th>
          <th>CATEGORY</th>
          <th>DURATION</th>
          <th>STEMS</th>
          <th>STATUS</th>
          <th style={{ textAlign: 'right' }}>ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={index}>
            {/* Number */}
            <td>
              <Shimmer width={28} height={16} borderRadius={6} />
            </td>

            {/* Title & Artist */}
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shimmer width={42} height={42} borderRadius={10} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <Shimmer width={index % 2 === 0 ? '60%' : '75%'} height={15} borderRadius={6} />
                  <Shimmer width="35%" height={11} borderRadius={4} />
                </div>
              </div>
            </td>

            {/* Category */}
            <td>
              <Shimmer width={84} height={24} borderRadius={9999} />
            </td>

            {/* Duration */}
            <td>
              <Shimmer width={48} height={14} borderRadius={4} />
            </td>

            {/* Stems (3 pills) */}
            <td>
              <div style={{ display: 'flex', gap: 4 }}>
                <Shimmer width={32} height={20} borderRadius={9999} />
                <Shimmer width={32} height={20} borderRadius={9999} />
                <Shimmer width={32} height={20} borderRadius={9999} />
              </div>
            </td>

            {/* Status */}
            <td>
              <Shimmer width={88} height={24} borderRadius={9999} />
            </td>

            {/* Actions */}
            <td style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Shimmer width={32} height={32} borderRadius={8} />
                <Shimmer width={32} height={32} borderRadius={8} />
                <Shimmer width={32} height={32} borderRadius={8} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// User Directory Table Skeleton
export const UserTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
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
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={index}>
            {/* User Avatar + Name + ID */}
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shimmer width={38} height={38} borderRadius="50%" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Shimmer width={index % 2 === 0 ? 110 : 140} height={14} borderRadius={4} />
                  <Shimmer width={75} height={11} borderRadius={4} />
                </div>
              </div>
            </td>

            {/* Username */}
            <td>
              <Shimmer width={90} height={14} borderRadius={4} />
            </td>

            {/* Email */}
            <td>
              <Shimmer width={150} height={14} borderRadius={4} />
            </td>

            {/* Subscription */}
            <td>
              <Shimmer width={100} height={24} borderRadius={9999} />
            </td>

            {/* Joined Date */}
            <td>
              <Shimmer width={70} height={14} borderRadius={4} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Devotions Table Skeleton
export const DevotionTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
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
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={index}>
            {/* Date */}
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shimmer width={16} height={16} borderRadius={4} />
                <Shimmer width={95} height={14} borderRadius={4} />
              </div>
            </td>

            {/* Scripture Reference */}
            <td>
              <Shimmer width={index % 2 === 0 ? 130 : 160} height={24} borderRadius={9999} />
            </td>

            {/* Rewards */}
            <td>
              <div style={{ display: 'flex', gap: 8 }}>
                <Shimmer width={72} height={20} borderRadius={9999} />
                <Shimmer width={64} height={20} borderRadius={9999} />
              </div>
            </td>

            {/* Status */}
            <td>
              <Shimmer width={84} height={24} borderRadius={9999} />
            </td>

            {/* Action */}
            <td>
              <Shimmer width={68} height={28} borderRadius={9999} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Prayer Wall Cards Skeleton
export const PrayerCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            backgroundColor: '#F8F9FB',
            padding: '20px 24px',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Header Row: User Avatar + Name + Date, plus count pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shimmer width={32} height={32} borderRadius="50%" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shimmer width={110} height={14} borderRadius={4} />
                <Shimmer width={60} height={11} borderRadius={4} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Shimmer width={80} height={24} borderRadius={9999} />
              <Shimmer width={75} height={24} borderRadius={9999} />
            </div>
          </div>

          {/* Title */}
          <Shimmer width={index % 2 === 0 ? '50%' : '65%'} height={18} borderRadius={6} />

          {/* Body Lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Shimmer width="100%" height={13} borderRadius={4} />
            <Shimmer width={index % 2 === 0 ? '90%' : '80%'} height={13} borderRadius={4} />
          </div>

          {/* Footer Tag */}
          <Shimmer width={70} height={20} borderRadius={9999} />
        </div>
      ))}
    </div>
  );
};

// Devotion Detail Modal Skeleton
export const DevotionDetailSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Theme Skeleton */}
      <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
        <Shimmer width={50} height={11} borderRadius={4} style={{ marginBottom: 8 }} />
        <Shimmer width="60%" height={18} borderRadius={6} />
      </div>

      {/* Reflection Skeleton */}
      <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
        <Shimmer width={70} height={11} borderRadius={4} style={{ marginBottom: 10 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Shimmer width="100%" height={13} borderRadius={4} />
          <Shimmer width="96%" height={13} borderRadius={4} />
          <Shimmer width="90%" height={13} borderRadius={4} />
          <Shimmer width="75%" height={13} borderRadius={4} />
        </div>
      </div>

      {/* Prayer Skeleton */}
      <div style={{ backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12 }}>
        <Shimmer width={55} height={11} borderRadius={4} style={{ marginBottom: 10 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Shimmer width="98%" height={13} borderRadius={4} />
          <Shimmer width="85%" height={13} borderRadius={4} />
        </div>
      </div>
    </div>
  );
};

// App Initial Fullscreen Loading Skeleton
export const AppLoadingSkeleton: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6F8FA',
        gap: 16,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src="/shema-icon.png"
          alt="Shema"
          style={{
            width: 48,
            height: 48,
            objectFit: 'contain',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            shema studio
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#5B4DFC',
              backgroundColor: '#EEEDFE',
              padding: '2px 6px',
              borderRadius: 9999,
            }}
          >
            ADMIN
          </span>
        </div>

        {/* Shimmer loading bar */}
        <div
          style={{
            width: 180,
            height: 4,
            backgroundColor: '#E2E8F0',
            borderRadius: 9999,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            className="shimmer-progress-bar"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#5B4DFC',
            }}
          />
        </div>

        <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: 12 }}>
          Initializing live Firebase connection...
        </span>
      </div>
    </div>
  );
};
