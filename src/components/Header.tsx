import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, LogOut } from 'lucide-react';
import type { User } from '../config/firebase';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const displayName = user?.displayName || 'Benson';
  const email = user?.email || 'benson@tryshema.com';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'BA';

  return (
    <header className="top-header">
      <div>
        <h1 className="greeting-title">Hello {displayName.split(' ')[0]}, 👋</h1>
        <p className="greeting-subtitle">
          Manage hymns, Cloudflare multi-stem audio, and lyrics synchronization
        </p>
      </div>

      <div className="header-actions">
        <div className="lang-pill">
          <span>English (US)</span>
          <ChevronDown size={14} color="#64748B" />
        </div>

        <button 
          className="icon-btn-circle" 
          onClick={() => navigate('/settings')}
          title="App & Cloudflare Settings"
        >
          <Settings size={18} />
        </button>

        <div className="avatar-badge" title={email}>
          {initials}
        </div>

        <button 
          className="icon-btn-circle" 
          onClick={onLogout}
          title="Sign out"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
