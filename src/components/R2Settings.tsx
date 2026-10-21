import React, { useState } from 'react';
import { Cloud, Check, Copy, Info } from 'lucide-react';
import { getStoredR2Config, saveR2Config } from '../config/r2';
import { useNavigate } from 'react-router-dom';
import type { R2Config } from '../types/hymn';

interface R2SettingsProps {
  onSaved?: () => void;
}

export const R2Settings: React.FC<R2SettingsProps> = ({ onSaved }) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<R2Config>(getStoredR2Config());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCors, setCopiedCors] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveR2Config(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSaved) onSaved();
      else navigate('/upload');
    }, 1200);
  };

  const corsRuleJson = JSON.stringify([
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "HEAD", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ], null, 2);

  const copyCorsRule = () => {
    navigator.clipboard.writeText(corsRuleJson);
    setCopiedCors(true);
    setTimeout(() => setCopiedCors(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
      <div className="flat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#EEEDFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5B4DFC'
          }}>
            <Cloud size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              Cloudflare R2 Bucket Credentials
            </h2>
            <p style={{ fontSize: 13, color: '#64748B' }}>
              Files are uploaded directly from your browser to your Cloudflare R2 bucket.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '12px 18px', borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
            <Check size={16} />
            <span>Cloudflare R2 configuration saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
              Cloudflare Account ID
            </label>
            <input 
              type="text" 
              placeholder="e.g. 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
              value={config.accountId} 
              onChange={(e) => setConfig({ ...config, accountId: e.target.value })}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                R2 Access Key ID
              </label>
              <input 
                type="text" 
                placeholder="R2 S3-compatible Access Key ID"
                value={config.accessKeyId} 
                onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                R2 Secret Access Key
              </label>
              <input 
                type="password" 
                placeholder="R2 S3-compatible Secret Key"
                value={config.secretAccessKey} 
                onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                Bucket Name
              </label>
              <input 
                type="text" 
                placeholder="e.g. shema-assets"
                value={config.bucketName} 
                onChange={(e) => setConfig({ ...config, bucketName: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                Public CDN Domain / R2.dev URL
              </label>
              <input 
                type="text" 
                placeholder="https://pub-xxxxxx.r2.dev or https://cdn.shema.app"
                value={config.publicDomain} 
                onChange={(e) => setConfig({ ...config, publicDomain: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" className="btn-primary">
              Save R2 Credentials
            </button>
          </div>
        </form>
      </div>

      {/* Cloudflare R2 CORS Setup Instructions */}
      <div className="flat-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={18} color="#5B4DFC" />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            R2 Bucket CORS Configuration
          </h3>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
          To allow direct browser uploads from this admin portal, add the following CORS policy in your <b>Cloudflare Dashboard &gt; R2 &gt; Your Bucket &gt; Settings &gt; CORS Policy</b>:
        </p>

        <div style={{ position: 'relative' }}>
          <pre style={{
            backgroundColor: '#F8F9FB',
            padding: 16,
            borderRadius: 12,
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#1E293B',
            overflowX: 'auto',
          }}>
            {corsRuleJson}
          </pre>
          <button
            type="button"
            onClick={copyCorsRule}
            className="btn-secondary"
            style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', fontSize: 11 }}
          >
            {copiedCors ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedCors ? 'Copied' : 'Copy CORS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
