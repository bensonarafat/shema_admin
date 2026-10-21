import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  UploadCloud, 
  Music, 
  BookOpen, 
  Heart, 
  Users, 
  Settings 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="brand-header" style={{ padding: '0 8px 28px 8px' }}>
        <img 
          src="/shema-logo.png" 
          alt="Shema" 
          style={{ height: 32, objectFit: 'contain' }} 
        />
      </div>

      <nav>
        <ul className="nav-list">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Home size={18} />
              <span>Home</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/upload"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <UploadCloud size={18} />
              <span>Upload Hymn</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/library"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Music size={18} />
              <span>Hymn Library</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/devotions"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <BookOpen size={18} />
              <span>Devotions</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/prayers"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Heart size={18} />
              <span>Prayers</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Users</span>
            </NavLink>
          </li>

          <li style={{ marginTop: 12 }}>
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};
